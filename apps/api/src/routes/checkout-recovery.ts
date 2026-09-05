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
    limit: z.coerce.number().int().min(1).max(200).optional(),
    offset: z.coerce.number().int().nonnegative().optional(),
  })
  .transform((q) => ({
    status: q.status,
    limit: q.limit ?? 50,
    offset: q.offset ?? 0,
  }));

const resumeSchema = z.object({
  channel: z.enum(["email", "sms", "whatsapp"]).optional(),
  lastSeenPage: z.string().optional(),
  actor: z.string().min(1).max(120).optional(),
});

const stopSchema = z.object({
  reason: z.string().min(1).max(500),
  actor: z.string().min(1).max(120).optional(),
});

async function getDirection02Case(caseId: string) {
  const [caseRow] = await db
    .select()
    .from(recoveryCases)
    .where(
      and(
        eq(recoveryCases.id, caseId),
        eq(recoveryCases.direction, "02_checkout_dropoff"),
      ),
    )
    .limit(1);

  if (!caseRow) throw new CaseNotFoundError(caseId);
  return caseRow;
}

export const checkoutRecoveryRouter = Router();

checkoutRecoveryRouter.get(
  "/checkout-recovery/cases",
  asyncHandler(async (req, res) => {
    const q = parse(listQuerySchema, req.query);
    const conditions: SQL[] = [
      eq(recoveryCases.direction, "02_checkout_dropoff"),
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

    collection(
      res,
      jsonSafe(
        rows.map((row) => ({
          ...row.case,
          checkout: {
            eventId: row.event.id,
            occurredAt: row.event.occurredAt,
            amountAtRiskMinor: row.event.amountAtRiskMinor,
            currency: row.event.currency,
            payload: row.event.payload,
          },
        })),
      ) as any,
      {
        page: Math.floor(q.offset / q.limit) + 1,
        limit: q.limit,
        total: rows.length,
        totalPages: 1,
      },
    );
  }),
);

checkoutRecoveryRouter.get(
  "/checkout-recovery/cases/:caseId",
  asyncHandler(async (req, res) => {
    const caseId = String(req.params.caseId);
    try {
      const caseRow = await getDirection02Case(caseId);
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
          checkout: event
            ? {
                eventId: event.id,
                occurredAt: event.occurredAt,
                amountAtRiskMinor: event.amountAtRiskMinor,
                currency: event.currency,
                payload: event.payload,
              }
            : null,
          customerHistory: customer?.history ?? {},
          actionHistory: actions,
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

checkoutRecoveryRouter.post(
  "/checkout-recovery/cases/:caseId/resume",
  asyncHandler(async (req, res) => {
    const caseId = String(req.params.caseId);
    const input = parse(resumeSchema, req.body ?? {});
    const actor = input.actor ?? "api:checkout-recovery";

    try {
      const caseRow = await getDirection02Case(caseId);
      const policy = await policyService.evaluate({
        caseId,
        proposedActionType: "send_resume_checkout_link",
        proposedAmountMinor: Number(caseRow.amountAtRiskMinor),
      });

      if (policy.decision === "deny") {
        throw ApiError.conflict(
          "POLICY_VIOLATION",
          "Resume link denied by policy.",
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
          type: "send_resume_checkout_link",
          status:
            policy.decision === "require_approval" ? "pending" : "succeeded",
          requiredApproval: policy.decision === "require_approval",
          payload: {
            channel: input.channel ?? "email",
            lastSeenPage: input.lastSeenPage ?? "checkout_start",
            policyDecision: policy.decision,
          },
          amountMinor: caseRow.amountAtRiskMinor,
          currency: caseRow.currency,
          resultStatus:
            policy.decision === "require_approval" ? "pending" : "succeeded",
          resultMessage:
            policy.decision === "require_approval"
              ? "resume link prepared for approval"
              : "resume link generated",
          resultObservedAt:
            policy.decision === "require_approval" ? null : new Date(),
          executedAt:
            policy.decision === "require_approval" ? null : new Date(),
        })
        .returning();

      await auditService.record({
        caseId,
        action: "policy_checked",
        summary: `Direction 02 resume policy ${policy.decision}.`,
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
            ? "Direction 02 resume link prepared for approval."
            : "Direction 02 resume link generated.",
        detail: {
          actionId: action.id,
          channel: input.channel ?? "email",
        },
        actor,
      });

      if (policy.decision !== "require_approval") {
        await caseLifecycle
          .transition({
            caseId,
            toState: "investigating",
            reason: "resume link requested",
            actor,
          })
          .catch(() => undefined);
        await caseLifecycle
          .transition({
            caseId,
            toState: "action_selected",
            reason: "resume link selected",
            actor,
          })
          .catch(() => undefined);
        await caseLifecycle
          .transition({
            caseId,
            toState: "recovering",
            reason: "resume link generated",
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

checkoutRecoveryRouter.post(
  "/checkout-recovery/cases/:caseId/stop",
  asyncHandler(async (req, res) => {
    const caseId = String(req.params.caseId);
    const input = parse(stopSchema, req.body ?? {});
    const actor = input.actor ?? "api:checkout-recovery";

    try {
      const caseRow = await getDirection02Case(caseId);

      await caseLifecycle.transition({
        caseId,
        toState: "stopped",
        reason: input.reason,
        actor,
      });

      await auditService.record({
        caseId,
        action: "stop",
        summary: `Direction 02 case stopped: ${input.reason}`,
        detail: {
          reason: input.reason,
        },
        actor,
      });

      ok(res, {
        caseId,
        status: "STOPPED",
      });
    } catch (err) {
      mapDomainError(err);
    }
  }),
);
