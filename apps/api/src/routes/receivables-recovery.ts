import { Router } from "express";
import { and, desc, eq, gte, inArray, type SQL } from "drizzle-orm";
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
    daysOverdue: z.coerce.number().int().nonnegative().optional(),
    priority: z.enum(["HIGH", "MEDIUM", "LOW"]).optional(),
    limit: z.coerce.number().int().min(1).max(200).optional(),
    offset: z.coerce.number().int().nonnegative().optional(),
  })
  .transform((q) => ({
    status: q.status,
    daysOverdue: q.daysOverdue,
    priority: q.priority,
    limit: q.limit ?? 50,
    offset: q.offset ?? 0,
  }));

const startSchema = z.object({
  actor: z.string().min(1).max(120).optional(),
});

const messageSchema = z.object({
  channel: z.enum(["EMAIL", "SMS", "WHATSAPP"]).optional(),
  templateId: z.string().optional(),
  body: z.string().optional(),
  actor: z.string().min(1).max(120).optional(),
});

const stopSchema = z.object({
  reason: z.string().min(1).max(500),
  actor: z.string().min(1).max(120).optional(),
});

async function getDirection04Case(caseId: string) {
  const [caseRow] = await db
    .select()
    .from(recoveryCases)
    .where(
      and(
        eq(recoveryCases.id, caseId),
        eq(recoveryCases.direction, "04_b2b_receivables"),
      ),
    )
    .limit(1);

  if (!caseRow) throw new CaseNotFoundError(caseId);
  return caseRow;
}

export const receivablesRecoveryRouter = Router();

receivablesRecoveryRouter.get(
  "/receivables/cases",
  asyncHandler(async (req, res) => {
    const q = parse(listQuerySchema, req.query);
    const conditions: SQL[] = [
      eq(recoveryCases.direction, "04_b2b_receivables"),
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

    if (q.priority === "HIGH") {
      conditions.push(eq(recoveryCases.riskTier, "high"));
    } else if (q.priority === "MEDIUM") {
      conditions.push(eq(recoveryCases.riskTier, "medium"));
    } else if (q.priority === "LOW") {
      conditions.push(eq(recoveryCases.riskTier, "low"));
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
      if (
        q.daysOverdue !== undefined &&
        Number(payload.daysOverdue ?? 0) < q.daysOverdue
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
            invoice: {
              invoiceId: payload.invoiceId ?? null,
              invoiceNumber: payload.invoiceNumber ?? null,
              daysOverdue: payload.daysOverdue ?? null,
              dueDate: payload.dueDate ?? null,
              companyName: payload.companyName ?? null,
              contactEmail: payload.contactEmail ?? null,
              purchaseOrderNumber: payload.purchaseOrderNumber ?? null,
              disputeStatus: payload.disputeStatus ?? "none",
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

receivablesRecoveryRouter.get(
  "/receivables/cases/:caseId",
  asyncHandler(async (req, res) => {
    const caseId = String(req.params.caseId);

    try {
      const caseRow = await getDirection04Case(caseId);

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
          invoice: {
            invoiceId: payload.invoiceId ?? null,
            invoiceNumber: payload.invoiceNumber ?? null,
            daysOverdue: payload.daysOverdue ?? null,
            dueDate: payload.dueDate ?? null,
            paymentTerms: payload.paymentTerms ?? null,
            companyName: payload.companyName ?? null,
            contactEmail: payload.contactEmail ?? null,
            contactPhone: payload.contactPhone ?? null,
            purchaseOrderNumber: payload.purchaseOrderNumber ?? null,
            disputeStatus: payload.disputeStatus ?? "none",
            historicalAvgDelayDays: payload.historicalAvgDelayDays ?? null,
            brokenPromisesCount: payload.brokenPromisesCount ?? null,
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

receivablesRecoveryRouter.post(
  "/receivables/cases/:caseId/start",
  asyncHandler(async (req, res) => {
    const caseId = String(req.params.caseId);
    const input = parse(startSchema, req.body ?? {});
    const actor = input.actor ?? "api:receivables-recovery";

    try {
      const caseRow = await getDirection04Case(caseId);

      const policy = await policyService.evaluate({
        caseId,
        proposedActionType: "send_email",
        proposedAmountMinor: Number(caseRow.amountAtRiskMinor),
      });

      if (policy.decision === "deny") {
        throw ApiError.conflict(
          "POLICY_VIOLATION",
          "Receivables workflow start denied by policy.",
          {
            reasons: policy.reasons,
            policyId: policy.policyId,
          },
        );
      }

      await caseLifecycle.transition({
        caseId,
        toState: "investigating",
        reason: "B2B receivables recovery workflow initiated",
        actor,
      });

      await auditService.record({
        caseId,
        action: "context_retrieved",
        summary: "B2B receivables workflow started.",
        detail: {
          policyId: policy.policyId,
          policyDecision: policy.decision,
        },
        actor,
      });

      accepted(res, {
        caseId,
        status: "INVESTIGATING",
        policy,
      });
    } catch (err) {
      mapDomainError(err);
    }
  }),
);

receivablesRecoveryRouter.post(
  "/receivables/cases/:caseId/message",
  asyncHandler(async (req, res) => {
    const caseId = String(req.params.caseId);
    const input = parse(messageSchema, req.body ?? {});
    const actor = input.actor ?? "api:receivables-recovery";
    const channel = (input.channel ?? "EMAIL").toLowerCase() as
      | "email"
      | "sms"
      | "whatsapp";
    const actionType =
      channel === "whatsapp"
        ? "send_whatsapp"
        : channel === "sms"
          ? "send_sms"
          : "send_email";

    try {
      const caseRow = await getDirection04Case(caseId);

      const policy = await policyService.evaluate({
        caseId,
        proposedActionType: actionType,
        proposedAmountMinor: Number(caseRow.amountAtRiskMinor),
      });

      if (policy.decision === "deny") {
        throw ApiError.conflict(
          "POLICY_VIOLATION",
          "B2B communication denied by policy.",
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
          type: actionType,
          status:
            policy.decision === "require_approval" ? "pending" : "succeeded",
          requiredApproval: policy.decision === "require_approval",
          payload: {
            channel,
            templateId: input.templateId ?? "b2b-invoice-reminder",
            body: input.body ?? "B2B invoice payment reminder dispatched.",
            policyDecision: policy.decision,
          },
          amountMinor: Number(caseRow.amountAtRiskMinor),
          currency: caseRow.currency,
          resultStatus:
            policy.decision === "require_approval" ? "pending" : "succeeded",
          resultMessage:
            policy.decision === "require_approval"
              ? "B2B communication prepared for approval"
              : `B2B communication sent via ${channel}`,
          resultObservedAt:
            policy.decision === "require_approval" ? null : new Date(),
          executedAt:
            policy.decision === "require_approval" ? null : new Date(),
        })
        .returning();

      await auditService.record({
        caseId,
        action: "policy_checked",
        summary: `Direction 04 message policy ${policy.decision}.`,
        detail: {
          policyId: policy.policyId,
          decision: policy.decision,
          actionType,
        },
        actor,
      });

      await auditService.record({
        caseId,
        action:
          policy.decision === "require_approval"
            ? "decision_created"
            : "communication_sent",
        summary:
          policy.decision === "require_approval"
            ? "B2B communication queued for approval."
            : `B2B collection message sent via ${channel}.`,
        detail: {
          actionId: action.id,
          channel,
          templateId: input.templateId ?? "b2b-invoice-reminder",
        },
        actor,
      });

      if (policy.decision !== "require_approval") {
        await caseLifecycle
          .transition({
            caseId,
            toState: "action_selected",
            reason: `${actionType} selected`,
            actor,
          })
          .catch(() => undefined);
        await caseLifecycle
          .transition({
            caseId,
            toState: "customer_action_required",
            reason: "awaiting B2B customer payment or response",
            actor,
          })
          .catch(() => undefined);
      }

      accepted(res, {
        caseId,
        actionId: action.id,
        actionType,
        channel,
        status:
          policy.decision === "require_approval"
            ? "APPROVAL_REQUIRED"
            : "DISPATCHED",
        policy,
      });
    } catch (err) {
      mapDomainError(err);
    }
  }),
);

receivablesRecoveryRouter.post(
  "/receivables/cases/:caseId/stop",
  asyncHandler(async (req, res) => {
    const caseId = String(req.params.caseId);
    const input = parse(stopSchema, req.body ?? {});
    const actor = input.actor ?? "api:receivables-recovery";

    try {
      await getDirection04Case(caseId);

      await caseLifecycle.transition({
        caseId,
        toState: "stopped",
        reason: input.reason,
        actor,
      });

      await auditService.record({
        caseId,
        action: "stop",
        summary: `Direction 04 case stopped: ${input.reason}`,
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
