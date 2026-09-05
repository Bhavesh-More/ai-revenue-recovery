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
    subscriptionStatus: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(200).optional(),
    offset: z.coerce.number().int().nonnegative().optional(),
  })
  .transform((q) => ({
    status: q.status,
    failureCode: q.failureCode,
    subscriptionStatus: q.subscriptionStatus,
    limit: q.limit ?? 50,
    offset: q.offset ?? 0,
  }));

const retrySchema = z.object({
  strategy: z.enum(["AGENT_SELECTED", "IMMEDIATE"]).optional(),
  actor: z.string().min(1).max(120).optional(),
});

const paymentLinkSchema = z.object({
  amountMinor: z.number().int().positive().optional(),
  currency: z.string().min(3).max(3).optional(),
  channel: z.enum(["email", "sms", "whatsapp"]).optional(),
  actor: z.string().min(1).max(120).optional(),
});

const stopSchema = z.object({
  reason: z.string().min(1).max(500),
  actor: z.string().min(1).max(120).optional(),
});

const webhookSchema = z.object({
  event: z.string().min(1),
  subscriptionId: z.string().optional(),
  caseId: z.string().optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
});

async function getDirection03Case(caseId: string) {
  const [caseRow] = await db
    .select()
    .from(recoveryCases)
    .where(
      and(
        eq(recoveryCases.id, caseId),
        eq(recoveryCases.direction, "03_failed_subscription"),
      ),
    )
    .limit(1);

  if (!caseRow) throw new CaseNotFoundError(caseId);
  return caseRow;
}

export const subscriptionRecoveryRouter = Router();

subscriptionRecoveryRouter.get(
  "/subscription-recovery/cases",
  asyncHandler(async (req, res) => {
    const q = parse(listQuerySchema, req.query);
    const conditions: SQL[] = [
      eq(recoveryCases.direction, "03_failed_subscription"),
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
      if (q.failureCode && payload.failureReason !== q.failureCode) {
        return false;
      }
      if (
        q.subscriptionStatus &&
        payload.subscriptionStatus !== q.subscriptionStatus
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
            subscription: {
              subscriptionId: payload.subscriptionId ?? null,
              planId: payload.planId ?? null,
              billingCycle: payload.billingCycle ?? null,
              failureReason: payload.failureReason ?? null,
              tenureMonths: payload.tenureMonths ?? null,
              gracePeriodDaysRemaining:
                payload.gracePeriodDaysRemaining ?? null,
              mrrMinor: payload.mrrMinor ?? null,
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

subscriptionRecoveryRouter.get(
  "/subscription-recovery/cases/:caseId",
  asyncHandler(async (req, res) => {
    const caseId = String(req.params.caseId);

    try {
      const caseRow = await getDirection03Case(caseId);

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
          subscription: {
            subscriptionId: payload.subscriptionId ?? null,
            planId: payload.planId ?? null,
            billingCycle: payload.billingCycle ?? null,
            failureReason: payload.failureReason ?? null,
            tenureMonths: payload.tenureMonths ?? null,
            previousSuccessfulRenewals:
              payload.previousSuccessfulRenewals ?? null,
            failedRenewalCount: payload.failedRenewalCount ?? null,
            gracePeriodDaysRemaining: payload.gracePeriodDaysRemaining ?? null,
            mrrMinor: payload.mrrMinor ?? null,
            estimatedLtvMinor: payload.estimatedLtvMinor ?? null,
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

subscriptionRecoveryRouter.post(
  "/subscription-recovery/cases/:caseId/retry",
  asyncHandler(async (req, res) => {
    const caseId = String(req.params.caseId);
    const input = parse(retrySchema, req.body ?? {});
    const actor = input.actor ?? "api:subscription-recovery";

    try {
      const caseRow = await getDirection03Case(caseId);
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
          "Subscription retry denied by policy.",
          {
            reasons: policy.reasons,
            policyId: policy.policyId,
          },
        );
      }

      const scheduledFor = isImmediate
        ? null
        : new Date(Date.now() + 24 * 3600 * 1000).toISOString();

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
              ? "subscription retry prepared for approval"
              : isImmediate
                ? "immediate subscription payment retry executed"
                : "subscription retry scheduled",
          resultObservedAt:
            policy.decision === "require_approval" ? null : new Date(),
          executedAt:
            policy.decision === "require_approval" ? null : new Date(),
        })
        .returning();

      await auditService.record({
        caseId,
        action: "policy_checked",
        summary: `Direction 03 retry policy ${policy.decision}.`,
        detail: {
          policyId: policy.policyId,
          decision: policy.decision,
          reasonCount: policy.reasons.length,
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
            ? "Direction 03 retry action queued for approval."
            : `Direction 03 ${proposedActionType} initiated.`,
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
            reason: "subscription retry requested",
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
              ? "immediate renewal retry in progress"
              : "waiting for scheduled renewal retry window",
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

subscriptionRecoveryRouter.post(
  "/subscription-recovery/cases/:caseId/payment-link",
  asyncHandler(async (req, res) => {
    const caseId = String(req.params.caseId);
    const input = parse(paymentLinkSchema, req.body ?? {});
    const actor = input.actor ?? "api:subscription-recovery";

    try {
      const caseRow = await getDirection03Case(caseId);
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
            amountMinor,
            currency,
            channel: input.channel ?? "email",
            policyDecision: policy.decision,
          },
          amountMinor: Number(amountMinor),
          currency,
          resultStatus:
            policy.decision === "require_approval" ? "pending" : "succeeded",
          resultMessage:
            policy.decision === "require_approval"
              ? "subscription payment link prepared for approval"
              : "subscription payment link generated",
          resultObservedAt:
            policy.decision === "require_approval" ? null : new Date(),
          executedAt:
            policy.decision === "require_approval" ? null : new Date(),
        })
        .returning();

      await auditService.record({
        caseId,
        action: "policy_checked",
        summary: `Direction 03 payment-link policy ${policy.decision}.`,
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
            ? "Direction 03 payment link prepared for approval."
            : "Direction 03 payment link dispatched to customer.",
        detail: {
          actionId: action.id,
          amountMinor,
          channel: input.channel ?? "email",
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
            toState: "customer_action_required",
            reason: "awaiting customer payment link completion",
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

subscriptionRecoveryRouter.post(
  "/subscription-recovery/cases/:caseId/stop",
  asyncHandler(async (req, res) => {
    const caseId = String(req.params.caseId);
    const input = parse(stopSchema, req.body ?? {});
    const actor = input.actor ?? "api:subscription-recovery";

    try {
      await getDirection03Case(caseId);

      await caseLifecycle.transition({
        caseId,
        toState: "stopped",
        reason: input.reason,
        actor,
      });

      await auditService.record({
        caseId,
        action: "stop",
        summary: `Direction 03 case stopped: ${input.reason}`,
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

subscriptionRecoveryRouter.post(
  "/webhooks/razorpay/subscription",
  asyncHandler(async (req, res) => {
    const input = parse(webhookSchema, req.body ?? {});
    const actor = "webhook:razorpay:subscription";

    let targetCaseId = input.caseId;

    // If caseId is not directly passed, look up by subscriptionId in revenueEvents
    if (!targetCaseId && input.subscriptionId) {
      const matchingEvents = await db
        .select({ id: revenueEvents.id })
        .from(revenueEvents)
        .where(eq(revenueEvents.type, "subscription.renewal_failed"))
        .limit(10);

      for (const ev of matchingEvents) {
        const [caseRow] = await db
          .select({ id: recoveryCases.id })
          .from(recoveryCases)
          .where(
            and(
              eq(recoveryCases.originatingEventId, ev.id),
              eq(recoveryCases.direction, "03_failed_subscription"),
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
        summary: `Subscription webhook received: ${input.event}`,
        detail: {
          event: input.event,
          subscriptionId: input.subscriptionId ?? null,
        },
        actor,
      });

      if (
        input.event === "payment.succeeded" ||
        input.event === "subscription.charged"
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
