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
import { accepted, collection, jsonSafe, ok, payloadRecord } from "../lib/responses.js";

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

const listQuerySchema = z
  .object({
    status: z
      .enum(["OPEN", "CLOSED", "RECOVERED", "STOPPED", "FAILED"])
      .optional(),
    failureCode: z.string().optional(),
    retryable: z.coerce.boolean().optional(),
    limit: z.coerce.number().int().min(1).max(200).optional(),
    offset: z.coerce.number().int().nonnegative().optional(),
  })
  .transform((q) => ({
    status: q.status,
    failureCode: q.failureCode,
    retryable: q.retryable,
    limit: q.limit ?? 50,
    offset: q.offset ?? 0,
  }));

const retrySchema = z.object({
  paymentId: z.string().min(1),
  actor: z.string().min(1).max(120).optional(),
});

const paymentLinkSchema = z.object({
  amountMinor: z.number().int().positive().optional(),
  currency: z.string().min(3).max(3).optional(),
  channel: z.enum(["email", "sms", "whatsapp"]).optional(),
  actor: z.string().min(1).max(120).optional(),
});

async function getDirection01Case(caseId: string) {
  const [caseRow] = await db
    .select()
    .from(recoveryCases)
    .where(
      and(
        eq(recoveryCases.id, caseId),
        eq(recoveryCases.direction, "01_payment_degradation"),
      ),
    )
    .limit(1);

  if (!caseRow) throw new CaseNotFoundError(caseId);
  return caseRow;
}

export const paymentRecoveryRouter = Router();

paymentRecoveryRouter.get(
  "/payment-recovery/cases",
  asyncHandler(async (req, res) => {
    const q = parse(listQuerySchema, req.query);
    const conditions: SQL[] = [
      eq(recoveryCases.direction, "01_payment_degradation"),
    ];

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
      if (q.failureCode && payload.failureReason !== q.failureCode)
        return false;
      if (
        q.retryable !== undefined &&
        Boolean(payload.retryEligible ?? true) !== q.retryable
      ) {
        return false;
      }
      return true;
    });

    collection(
      res,
      jsonSafe(
        filtered.map((row) => ({
          ...row.case,
          payment: {
            paymentId: payloadRecord(row.event.payload).paymentId ?? null,
            failureReason:
              payloadRecord(row.event.payload).failureReason ?? null,
            provider: payloadRecord(row.event.payload).provider ?? null,
            paymentMethod:
              payloadRecord(row.event.payload).paymentMethod ?? null,
            bank: payloadRecord(row.event.payload).bank ?? null,
            region: payloadRecord(row.event.payload).region ?? null,
          },
        })),
      ) as any,
      {
        page: Math.floor(q.offset / q.limit) + 1,
        limit: q.limit,
        total: filtered.length,
        totalPages: 1,
      },
    );
  }),
);

paymentRecoveryRouter.get(
  "/payment-recovery/cases/:caseId",
  asyncHandler(async (req, res) => {
    const caseId = String(req.params.caseId);
    try {
      const caseRow = await getDirection01Case(caseId);
      const [customer] = await db
        .select()
        .from(customers)
        .where(eq(customers.id, caseRow.customerId))
        .limit(1);
      const [event] = await db
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

      ok(
        res,
        jsonSafe({
          case: caseRow,
          payment: event
            ? {
                eventId: event.id,
                occurredAt: event.occurredAt,
                amountAtRiskMinor: event.amountAtRiskMinor,
                currency: event.currency,
                payload: event.payload,
              }
            : null,
          customerHistory: customer?.history ?? {},
          retryHistory: actions.filter(
            (a) => a.type === "retry_payment" || a.type === "schedule_retry",
          ),
          agentDiagnosis: decisions[0]
            ? {
                rootCause: decisions[0].rootCause,
                observations: decisions[0].observations,
              }
            : null,
          recommendedAction: decisions[0]?.recommendation ?? null,
          executedActions: actions,
          recoveredAmountMinor: caseRow.outcomeRecoveredMinor,
          stoppingReason: caseRow.outcomeReason,
        }),
      );
    } catch (err) {
      mapDomainError(err);
    }
  }),
);

paymentRecoveryRouter.post(
  "/payment-recovery/cases/:caseId/retry",
  asyncHandler(async (req, res) => {
    const caseId = String(req.params.caseId);
    const input = parse(retrySchema, req.body ?? {});
    const actor = input.actor ?? "api:payment-recovery";

    try {
      const caseRow = await getDirection01Case(caseId);
      const policy = await policyService.evaluate({
        caseId,
        proposedActionType: "retry_payment",
        proposedAmountMinor: Number(caseRow.amountAtRiskMinor),
      });

      if (policy.decision === "deny") {
        throw ApiError.conflict("POLICY_VIOLATION", "Retry denied by policy.", {
          reasons: policy.reasons,
          policyId: policy.policyId,
        });
      }

      const [action] = await db
        .insert(recoveryActions)
        .values({
          caseId,
          customerId: caseRow.customerId,
          type: "retry_payment",
          status:
            policy.decision === "require_approval" ? "pending" : "in_progress",
          requiredApproval: policy.decision === "require_approval",
          payload: {
            paymentId: input.paymentId,
            policyDecision: policy.decision,
          },
          amountMinor: caseRow.amountAtRiskMinor,
          currency: caseRow.currency,
          resultStatus: "pending",
        })
        .returning();

      await auditService.record({
        caseId,
        action: "policy_checked",
        summary: `Direction 01 retry policy ${policy.decision}.`,
        detail: {
          policyId: policy.policyId,
          decision: policy.decision,
          reasonCount: policy.reasons.length,
        },
        actor,
      });

      await auditService.record({
        caseId,
        action: "action_executed",
        summary: `Direction 01 retry ${policy.decision === "require_approval" ? "prepared" : "queued"}.`,
        detail: {
          actionId: action.id,
          paymentId: input.paymentId,
          amountMinor: Number(caseRow.amountAtRiskMinor),
        },
        actor,
      });

      if (policy.decision === "require_approval") {
        accepted(res, {
          caseId,
          actionId: action.id,
          status: "APPROVAL_REQUIRED",
          policy,
        });
        return;
      }

      await caseLifecycle
        .transition({
          caseId,
          toState: "investigating",
          reason: "payment retry requested",
          actor,
        })
        .catch(() => undefined);
      await caseLifecycle
        .transition({
          caseId,
          toState: "action_selected",
          reason: "payment retry selected",
          actor,
        })
        .catch(() => undefined);
      await caseLifecycle
        .transition({
          caseId,
          toState: "recovering",
          reason: "payment retry queued",
          actor,
        })
        .catch(() => undefined);

      accepted(res, {
        caseId,
        actionId: action.id,
        status: "QUEUED",
      });
    } catch (err) {
      mapDomainError(err);
    }
  }),
);

paymentRecoveryRouter.post(
  "/payment-recovery/cases/:caseId/payment-link",
  asyncHandler(async (req, res) => {
    const caseId = String(req.params.caseId);
    const input = parse(paymentLinkSchema, req.body ?? {});
    const actor = input.actor ?? "api:payment-recovery";

    try {
      const caseRow = await getDirection01Case(caseId);
      const amountMinor =
        input.amountMinor ?? Number(caseRow.amountAtRiskMinor);
      const currency = input.currency ?? caseRow.currency;
      const policy = await policyService.evaluate({
        caseId,
        proposedActionType: "send_payment_link",
        proposedAmountMinor: amountMinor,
      });

      if (policy.decision === "deny") {
        throw ApiError.conflict(
          "POLICY_VIOLATION",
          "Payment link denied by policy.",
          {
            reasons: policy.reasons,
            policyId: policy.policyId,
          },
        );
      }

      const [action] = await db
        .insert(recoveryActions)
        .values({
          caseId,
          customerId: caseRow.customerId,
          type: "send_payment_link",
          status:
            policy.decision === "require_approval" ? "pending" : "succeeded",
          requiredApproval: policy.decision === "require_approval",
          payload: {
            channel: input.channel ?? "email",
            policyDecision: policy.decision,
          },
          amountMinor,
          currency,
          resultStatus:
            policy.decision === "require_approval" ? "pending" : "succeeded",
          resultExternalReference:
            policy.decision === "require_approval"
              ? null
              : `mock-plink-${Date.now()}`,
          resultMessage:
            policy.decision === "require_approval"
              ? "payment link prepared for approval"
              : "payment link generated",
          resultObservedAt:
            policy.decision === "require_approval" ? null : new Date(),
          executedAt:
            policy.decision === "require_approval" ? null : new Date(),
        })
        .returning();

      await auditService.record({
        caseId,
        action: "policy_checked",
        summary: `Direction 01 payment-link policy ${policy.decision}.`,
        detail: {
          policyId: policy.policyId,
          decision: policy.decision,
          reasonCount: policy.reasons.length,
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
            ? "Direction 01 payment link prepared for approval."
            : "Direction 01 payment link generated.",
        detail: {
          actionId: action.id,
          amountMinor,
          currency,
        },
        actor,
      });

      if (policy.decision !== "require_approval") {
        await caseLifecycle
          .transition({
            caseId,
            toState: "investigating",
            reason: "payment link requested",
            actor,
          })
          .catch(() => undefined);
        await caseLifecycle
          .transition({
            caseId,
            toState: "action_selected",
            reason: "payment link selected",
            actor,
          })
          .catch(() => undefined);
        await caseLifecycle
          .transition({
            caseId,
            toState: "recovering",
            reason: "payment link generated",
            actor,
          })
          .catch(() => undefined);
      }

      accepted(res, {
        caseId,
        actionId: action.id,
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
