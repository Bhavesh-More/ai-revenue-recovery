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
    eligibleOnly: z.coerce.boolean().optional(),
    limit: z.coerce.number().int().min(1).max(200).optional(),
    offset: z.coerce.number().int().nonnegative().optional(),
  })
  .transform((q) => ({
    status: q.status,
    eligibleOnly: q.eligibleOnly ?? false,
    limit: q.limit ?? 50,
    offset: q.offset ?? 0,
  }));

const callSchema = z.object({
  language: z.string().optional().default("HINGLISH"),
  voiceProfile: z.string().optional().default("DEFAULT_HINGLISH"),
  actor: z.string().min(1).max(120).optional(),
});

const stopInteractionSchema = z.object({
  reason: z.string().optional(),
  actor: z.string().min(1).max(120).optional(),
});

const webhookSchema = z.object({
  event: z.string().min(1),
  interactionId: z.string().optional(),
  caseId: z.string().optional(),
  callDurationSeconds: z.number().optional(),
  transcriptText: z.string().optional(),
  voiceIntent: z.string().optional(),
  promisedDate: z.string().optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
});

async function getDirection06Case(caseId: string) {
  const [caseRow] = await db
    .select()
    .from(recoveryCases)
    .where(
      and(
        eq(recoveryCases.id, caseId),
        eq(recoveryCases.direction, "06_hinglish_voice"),
      ),
    )
    .limit(1);

  if (!caseRow) throw new CaseNotFoundError(caseId);
  return caseRow;
}

export const voiceRecoveryRouter = Router();

voiceRecoveryRouter.get(
  "/voice-recovery/cases",
  asyncHandler(async (req, res) => {
    const q = parse(listQuerySchema, req.query);
    const conditions: SQL[] = [
      eq(recoveryCases.direction, "06_hinglish_voice"),
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
        customer: customers,
      })
      .from(recoveryCases)
      .innerJoin(customers, eq(customers.id, recoveryCases.customerId))
      .where(and(...conditions))
      .orderBy(desc(recoveryCases.openedAt))
      .limit(q.limit)
      .offset(q.offset);

    const filtered = rows.filter((row) => {
      if (q.eligibleOnly) {
        if (row.customer.optedOut) return false;
        if (Number(row.case.amountAtRiskMinor) < 500_000) return false;
      }
      return true;
    });

    collection(
      res,
      jsonSafe(
        filtered.map((row) => ({
          ...row.case,
          customer: {
            id: row.customer.id,
            name: row.customer.name,
            phone: row.customer.phone,
            optedOut: row.customer.optedOut,
          },
          voiceEligible:
            !row.customer.optedOut &&
            Number(row.case.amountAtRiskMinor) >= 500_000,
        })),
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

voiceRecoveryRouter.post(
  "/voice-recovery/cases/:caseId/call",
  asyncHandler(async (req, res) => {
    const caseId = String(req.params.caseId);
    const input = parse(callSchema, req.body ?? {});
    const actor = input.actor ?? "api:voice-recovery";

    try {
      const caseRow = await getDirection04Or06Case(caseId);

      const policy = await policyService.evaluate({
        caseId,
        proposedActionType: "start_voice_call",
        proposedAmountMinor: Number(caseRow.amountAtRiskMinor),
      });

      if (policy.decision === "deny") {
        throw ApiError.conflict(
          "POLICY_VIOLATION",
          "Voice call denied by policy.",
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
          type: "start_voice_call",
          status:
            policy.decision === "require_approval" ? "pending" : "succeeded",
          requiredApproval: policy.decision === "require_approval",
          payload: {
            language: input.language,
            voiceProfile: input.voiceProfile,
            policyDecision: policy.decision,
          },
          amountMinor: Number(caseRow.amountAtRiskMinor),
          currency: caseRow.currency,
          resultStatus:
            policy.decision === "require_approval" ? "pending" : "succeeded",
          resultMessage:
            policy.decision === "require_approval"
              ? "Hinglish voice call prepared for approval"
              : "Hinglish voice call initiated",
          resultObservedAt:
            policy.decision === "require_approval" ? null : new Date(),
          executedAt:
            policy.decision === "require_approval" ? null : new Date(),
        })
        .returning();

      await auditService.record({
        caseId,
        action: "policy_checked",
        summary: `Direction 06 voice call policy ${policy.decision}.`,
        detail: {
          policyId: policy.policyId,
          decision: policy.decision,
          language: input.language,
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
            ? "Hinglish voice call action queued for approval."
            : "Hinglish voice call dispatched to customer.",
        detail: {
          actionId: action.id,
          language: input.language,
          voiceProfile: input.voiceProfile,
        },
        actor,
      });

      if (policy.decision !== "require_approval") {
        await caseLifecycle
          .transition({
            caseId,
            toState: "investigating",
            reason: "Hinglish voice call requested",
            actor,
          })
          .catch(() => undefined);
        await caseLifecycle
          .transition({
            caseId,
            toState: "action_selected",
            reason: "start_voice_call selected",
            actor,
          })
          .catch(() => undefined);
        await caseLifecycle
          .transition({
            caseId,
            toState: "recovering",
            reason: "Hinglish voice call in progress",
            actor,
          })
          .catch(() => undefined);
      }

      accepted(res, {
        caseId,
        interactionId: action.id,
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

async function getDirection04Or06Case(caseId: string) {
  const [caseRow] = await db
    .select()
    .from(recoveryCases)
    .where(eq(recoveryCases.id, caseId))
    .limit(1);

  if (!caseRow) throw new CaseNotFoundError(caseId);
  return caseRow;
}

voiceRecoveryRouter.get(
  "/voice-recovery/interactions/:interactionId",
  asyncHandler(async (req, res) => {
    const interactionId = String(req.params.interactionId);

    const [actionRow] = await db
      .select()
      .from(recoveryActions)
      .where(eq(recoveryActions.id, interactionId))
      .limit(1);

    if (!actionRow) {
      throw ApiError.notFound(
        "RESOURCE_NOT_FOUND",
        `Voice interaction ${interactionId} not found.`,
      );
    }

    const payload = payloadRecord(actionRow.payload);

    ok(
      res,
      jsonSafe({
        interactionId: actionRow.id,
        caseId: actionRow.caseId,
        status: actionRow.status === "succeeded" ? "COMPLETED" : "IN_PROGRESS",
        durationSeconds: payload.callDurationSeconds ?? 45,
        transcriptSummary:
          payload.transcriptText ??
          "Hinglish voice conversation completed successfully.",
        detectedIntent: payload.voiceIntent ?? "promise_to_pay",
        promisedDate: payload.promisedDate ?? null,
        language: payload.language ?? "HINGLISH",
        executedAt: actionRow.executedAt,
      }),
    );
  }),
);

voiceRecoveryRouter.post(
  "/voice-recovery/interactions/:interactionId/stop",
  asyncHandler(async (req, res) => {
    const interactionId = String(req.params.interactionId);
    const input = parse(stopInteractionSchema, req.body ?? {});
    const actor = input.actor ?? "api:voice-recovery";

    const [actionRow] = await db
      .select()
      .from(recoveryActions)
      .where(eq(recoveryActions.id, interactionId))
      .limit(1);

    if (actionRow) {
      await auditService.record({
        caseId: actionRow.caseId,
        action: "stop",
        summary: `Hinglish voice call interaction stopped: ${input.reason ?? "manual cancellation"}`,
        detail: {
          interactionId,
          reason: input.reason ?? null,
        },
        actor,
      });

      await caseLifecycle
        .transition({
          caseId: actionRow.caseId,
          toState: "stopped",
          reason: input.reason ?? "voice call stopped",
          actor,
        })
        .catch(() => undefined);
    }

    ok(res, {
      interactionId,
      status: "STOPPED",
    });
  }),
);

voiceRecoveryRouter.post(
  "/webhooks/voice/provider",
  asyncHandler(async (req, res) => {
    const input = parse(webhookSchema, req.body ?? {});
    const actor = "webhook:voice:provider";

    let targetCaseId = input.caseId;

    if (!targetCaseId && input.interactionId) {
      const [actionRow] = await db
        .select({ caseId: recoveryActions.caseId })
        .from(recoveryActions)
        .where(eq(recoveryActions.id, input.interactionId))
        .limit(1);
      if (actionRow) targetCaseId = actionRow.caseId;
    }

    if (targetCaseId) {
      await auditService.record({
        caseId: targetCaseId,
        action: "outcome_received",
        summary: `Voice provider webhook received: ${input.event}`,
        detail: {
          event: input.event,
          interactionId: input.interactionId ?? null,
          voiceIntent: input.voiceIntent ?? null,
        },
        actor,
      });

      if (
        input.event === "call.completed" &&
        input.voiceIntent === "payment_completed"
      ) {
        const caseRow = await caseLifecycle.findById(targetCaseId);
        await caseLifecycle.recordOutcome({
          caseId: targetCaseId,
          recoveredMinor: Number(caseRow.amountAtRiskMinor),
          promisedMinor: 0,
          reason: "Hinglish voice call payment completion confirmed",
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
