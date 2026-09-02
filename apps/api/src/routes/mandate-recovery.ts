import { Router } from "express";
import { and, desc, eq, inArray, type SQL } from "drizzle-orm";
import { z } from "zod";
import { auditService } from "@recovery/audit";
import { caseLifecycle, CaseNotFoundError } from "@recovery/case-lifecycle";
import { db } from "@recovery/db";
import {
  agentDecisions,
  customers,
  recoveryActions,
  recoveryCases,
  revenueEvents,
} from "@recovery/db/schema";
import { policyService } from "@recovery/policy";
import { ApiError } from "../lib/errors.js";
import { asyncHandler } from "../lib/async-handler.js";
import { accepted, collection, ok } from "../lib/responses.js";

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [k: string]: JsonValue };

const openStates = [
  "detected",
  "investigating",
  "action_selected",
  "waiting",
  "customer_action_required",
  "recovering",
  "escalated",
] as const;

const terminalStates = ["recovered", "stopped", "failed"] as const;

function jsonSafe<T>(value: T): JsonValue {
  return JSON.parse(
    JSON.stringify(value, (_k, v) =>
      typeof v === "bigint" ? v.toString() : v,
    ),
  ) as JsonValue;
}

function parse<T>(
  schema: {
    safeParse(
      v: unknown,
    ): { success: true; data: T } | { success: false; error: any };
  },
  value: unknown,
): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw ApiError.badRequest("VALIDATION_ERROR", "Invalid request.", {
      fieldErrors: parsed.error.issues.map((i: any) => ({
        path: i.path.join(".") || "(root)",
        message: i.message,
      })),
    });
  }
  return parsed.data;
}

function mapDomainError(err: unknown): never {
  if (err instanceof CaseNotFoundError) {
    throw ApiError.notFound("CASE_NOT_FOUND", err.message);
  }
  throw err as Error;
}

function payloadRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

const listQuerySchema = z
  .object({
    status: z
      .enum(["OPEN", "CLOSED", "RECOVERED", "STOPPED", "FAILED"])
      .optional(),
    mandateStatus: z.string().optional(),
    failureCode: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(200).optional(),
    offset: z.coerce.number().int().nonnegative().optional(),
  })
  .transform((q) => ({
    status: q.status,
    mandateStatus: q.mandateStatus,
    failureCode: q.failureCode,
    limit: q.limit ?? 50,
    offset: q.offset ?? 0,
  }));

const retrySchema = z.object({
  strategy: z.enum(["AGENT_SELECTED", "IMMEDIATE"]).optional(),
  actor: z.string().min(1).max(120).optional(),
});

const rescheduleSchema = z.object({
  scheduledFor: z.string().min(1),
  reason: z.string().optional(),
  actor: z.string().min(1).max(120).optional(),
});

const webhookSchema = z.object({
  event: z.string().min(1),
  mandateId: z.string().optional(),
  caseId: z.string().optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
});

async function getDirection05Case(caseId: string) {
  const [caseRow] = await db
    .select()
    .from(recoveryCases)
    .where(
      and(
        eq(recoveryCases.id, caseId),
        eq(recoveryCases.direction, "05_mandate_retry"),
      ),
    )
    .limit(1);

  if (!caseRow) throw new CaseNotFoundError(caseId);
  return caseRow;
}

export const mandateRecoveryRouter = Router();

mandateRecoveryRouter.get(
  "/mandate-recovery/cases",
  asyncHandler(async (req, res) => {
    const q = parse(listQuerySchema, req.query);
    const conditions: SQL[] = [eq(recoveryCases.direction, "05_mandate_retry")];

    if (q.status === "OPEN") {
      conditions.push(inArray(recoveryCases.currentState, openStates as any));
    } else if (q.status === "CLOSED") {
      conditions.push(
        inArray(recoveryCases.currentState, terminalStates as any),
      );
    } else if (q.status) {
      conditions.push(
        eq(recoveryCases.currentState, q.status.toLowerCase() as any),
      );
    }

    const rows = await db
      .select({
        case: recoveryCases,
        event: revenueEvents,
      })
      .from(recoveryCases)
      .innerJoin(
        revenueEvents,
        eq(revenueEvents.id, recoveryCases.originatingEventId),
      )
      .where(and(...conditions))
      .orderBy(desc(recoveryCases.openedAt))
      .limit(q.limit)
      .offset(q.offset);

    const filtered = rows.filter((row) => {
      const payload = payloadRecord(row.event.payload);
      if (q.failureCode && payload.failureReason !== q.failureCode) {
        return false;
      }
      if (
        q.mandateStatus &&
        payload.mandateState !== q.mandateStatus.toLowerCase()
      ) {
        return false;
      }
      return true;
    });

    collection(
      res,
      jsonSafe(
        filtered.map((row) => {
          const payload = payloadRecord(row.event.payload);
          return {
            ...row.case,
            mandate: {
              mandateId: payload.mandateId ?? null,
              mandateState: payload.mandateState ?? null,
              failureReason: payload.failureReason ?? null,
              bank: payload.bank ?? null,
              provider: payload.provider ?? null,
              consecutiveFailures: payload.consecutiveFailures ?? 0,
              successfulDebitsCount: payload.successfulDebitsCount ?? 0,
            },
          };
        }),
      ) as any,
      {
        page: Math.floor(q.offset / q.limit) + 1,
        limit: q.limit,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / q.limit) || 1,
      },
    );
  }),
);

mandateRecoveryRouter.get(
  "/mandate-recovery/cases/:caseId",
  asyncHandler(async (req, res) => {
    const caseId = String(req.params.caseId);

    try {
      const caseRow = await getDirection05Case(caseId);

      const [customerRow] = await db
        .select()
        .from(customers)
        .where(eq(customers.id, caseRow.customerId))
        .limit(1);

      const [originatingEvent] = await db
        .select()
        .from(revenueEvents)
        .where(eq(revenueEvents.id, caseRow.originatingEventId))
        .limit(1);

      const actions = await db
        .select()
        .from(recoveryActions)
        .where(eq(recoveryActions.caseId, caseId))
        .orderBy(desc(recoveryActions.createdAt));

      const decisions = await db
        .select()
        .from(agentDecisions)
        .where(eq(agentDecisions.caseId, caseId))
        .orderBy(desc(agentDecisions.createdAt));

      const auditLog = await auditService.list({ caseId, limit: 50 });

      const payload = payloadRecord(originatingEvent?.payload);

      ok(
        res,
        jsonSafe({
          case: caseRow,
          customer: customerRow ?? null,
          mandate: {
            mandateId: payload.mandateId ?? null,
            mandateState: payload.mandateState ?? null,
            failureReason: payload.failureReason ?? null,
            bank: payload.bank ?? null,
            provider: payload.provider ?? null,
            subscriptionId: payload.subscriptionId ?? null,
            consecutiveFailures: payload.consecutiveFailures ?? 0,
            successfulDebitsCount: payload.successfulDebitsCount ?? 0,
            bankDegradationHint: payload.bankDegradationHint ?? null,
          },
          actions,
          decisions,
          auditEvents: auditLog,
        }),
      );
    } catch (err) {
      mapDomainError(err);
    }
  }),
);

mandateRecoveryRouter.post(
  "/mandate-recovery/cases/:caseId/retry",
  asyncHandler(async (req, res) => {
    const caseId = String(req.params.caseId);
    const input = parse(retrySchema, req.body ?? {});
    const actor = input.actor ?? "api:mandate-recovery";

    try {
      const caseRow = await getDirection05Case(caseId);
      const isImmediate = input.strategy === "IMMEDIATE";
      const proposedActionType = isImmediate
        ? "retry_payment"
        : "schedule_retry";

      const policy = await policyService.evaluate({
        caseId,
        proposedActionType,
        proposedAmountMinor: Number(caseRow.amountAtRiskMinor),
      });

      if (policy.decision === "deny") {
        throw ApiError.conflict(
          "POLICY_VIOLATION",
          "Mandate retry denied by policy.",
          {
            reasons: policy.reasons,
            policyId: policy.policyId,
          },
        );
      }

      const scheduledFor = isImmediate
        ? null
        : new Date(Date.now() + 12 * 3600 * 1000).toISOString();

      const [action] = await db
        .insert(recoveryActions)
        .values({
          caseId,
          customerId: caseRow.customerId,
          type: proposedActionType,
          status:
            policy.decision === "require_approval" ? "pending" : "succeeded",
          requiredApproval: policy.decision === "require_approval",
          payload: {
            strategy: input.strategy ?? "AGENT_SELECTED",
            scheduledFor,
            policyDecision: policy.decision,
          },
          amountMinor: Number(caseRow.amountAtRiskMinor),
          currency: caseRow.currency,
          resultStatus:
            policy.decision === "require_approval" ? "pending" : "succeeded",
          resultMessage:
            policy.decision === "require_approval"
              ? "mandate debit retry prepared for approval"
              : isImmediate
                ? "immediate mandate debit retry executed"
                : "mandate debit retry scheduled",
          resultObservedAt:
            policy.decision === "require_approval" ? null : new Date(),
          executedAt:
            policy.decision === "require_approval" ? null : new Date(),
        })
        .returning();

      await auditService.record({
        caseId,
        action: "policy_checked",
        summary: `Direction 05 mandate retry policy ${policy.decision}.`,
        detail: {
          policyId: policy.policyId,
          decision: policy.decision,
          proposedActionType,
        },
        actor,
      });

      await auditService.record({
        caseId,
        action:
          policy.decision === "require_approval"
            ? "decision_created"
            : "action_executed",
        summary:
          policy.decision === "require_approval"
            ? "Mandate retry action queued for approval."
            : `Mandate retry ${proposedActionType} initiated.`,
        detail: {
          actionId: action.id,
          strategy: input.strategy ?? "AGENT_SELECTED",
        },
        actor,
      });

      if (policy.decision !== "require_approval") {
        await caseLifecycle
          .transition({
            caseId,
            toState: "investigating",
            reason: "mandate retry requested",
            actor,
          })
          .catch(() => undefined);
        await caseLifecycle
          .transition({
            caseId,
            toState: "action_selected",
            reason: `${proposedActionType} selected`,
            actor,
          })
          .catch(() => undefined);
        await caseLifecycle
          .transition({
            caseId,
            toState: isImmediate ? "recovering" : "waiting",
            reason: isImmediate
              ? "immediate mandate debit retry in progress"
              : "waiting for scheduled mandate debit retry window",
            actor,
          })
          .catch(() => undefined);
      }

      accepted(res, {
        caseId,
        actionId: action.id,
        actionType: proposedActionType,
        status:
          policy.decision === "require_approval"
            ? "APPROVAL_REQUIRED"
            : "QUEUED",
        policy,
      });
    } catch (err) {
      mapDomainError(err);
    }
  }),
);

mandateRecoveryRouter.post(
  "/mandate-recovery/cases/:caseId/reschedule",
  asyncHandler(async (req, res) => {
    const caseId = String(req.params.caseId);
    const input = parse(rescheduleSchema, req.body ?? {});
    const actor = input.actor ?? "api:mandate-recovery";

    try {
      const caseRow = await getDirection05Case(caseId);
      const scheduledDate = new Date(input.scheduledFor);

      const [action] = await db
        .insert(recoveryActions)
        .values({
          caseId,
          customerId: caseRow.customerId,
          type: "schedule_retry",
          status: "succeeded",
          requiredApproval: false,
          payload: {
            scheduledFor: scheduledDate.toISOString(),
            reason:
              input.reason ?? "rescheduled by operator or retry sequencer",
          },
          amountMinor: Number(caseRow.amountAtRiskMinor),
          currency: caseRow.currency,
          resultStatus: "succeeded",
          resultMessage: `mandate debit retry rescheduled for ${scheduledDate.toISOString()}`,
          resultObservedAt: new Date(),
          executedAt: new Date(),
        })
        .returning();

      await auditService.record({
        caseId,
        action: "action_executed",
        summary: `Direction 05 mandate debit rescheduled to ${scheduledDate.toISOString()}.`,
        detail: {
          actionId: action.id,
          scheduledFor: scheduledDate.toISOString(),
          reason: input.reason ?? null,
        },
        actor,
      });

      await caseLifecycle
        .transition({
          caseId,
          toState: "waiting",
          reason: `rescheduled retry to ${scheduledDate.toISOString()}`,
          actor,
        })
        .catch(() => undefined);

      ok(res, {
        caseId,
        actionId: action.id,
        scheduledFor: scheduledDate.toISOString(),
        status: "WAITING",
      });
    } catch (err) {
      mapDomainError(err);
    }
  }),
);

mandateRecoveryRouter.post(
  "/webhooks/razorpay/mandate",
  asyncHandler(async (req, res) => {
    const input = parse(webhookSchema, req.body ?? {});
    const actor = "webhook:razorpay:mandate";

    let targetCaseId = input.caseId;

    if (!targetCaseId && input.mandateId) {
      const matchingEvents = await db
        .select({ id: revenueEvents.id })
        .from(revenueEvents)
        .where(eq(revenueEvents.type, "mandate.failed"))
        .limit(10);

      for (const ev of matchingEvents) {
        const [caseRow] = await db
          .select({ id: recoveryCases.id })
          .from(recoveryCases)
          .where(
            and(
              eq(recoveryCases.originatingEventId, ev.id),
              eq(recoveryCases.direction, "05_mandate_retry"),
            ),
          )
          .limit(1);
        if (caseRow) {
          targetCaseId = caseRow.id;
          break;
        }
      }
    }

    if (targetCaseId) {
      await auditService.record({
        caseId: targetCaseId,
        action: "outcome_received",
        summary: `Mandate webhook received: ${input.event}`,
        detail: {
          event: input.event,
          mandateId: input.mandateId ?? null,
        },
        actor,
      });

      if (
        input.event === "mandate.charged" ||
        input.event === "payment.succeeded"
      ) {
        const caseRow = await caseLifecycle.findById(targetCaseId);
        const recoveredMinor = Number(caseRow.amountAtRiskMinor);
        await caseLifecycle.recordOutcome({
          caseId: targetCaseId,
          recoveredMinor,
          promisedMinor: 0,
          reason: `webhook confirmation: ${input.event}`,
          actor,
        });
      }
    }

    ok(res, {
      received: true,
      event: input.event,
      caseId: targetCaseId ?? null,
    });
  }),
);
