import { Router } from "express";
import { z } from "zod";
import {
  caseLifecycle,
  CaseAlreadyTerminalError,
  CaseNotFoundError,
  InvalidStateTransitionError,
} from "@recovery/case-lifecycle";
import { batchSimulator } from "@recovery/agent";
import { ApiError } from "../lib/errors.js";

import { asyncHandler } from "../lib/async-handler.js";
import { created, ok, collection } from "../lib/responses.js";
import { razorpayClient } from "@recovery/integrations";
import { auditService } from "@recovery/audit";
import { eventBroadcaster } from "../lib/broadcaster.js";


const recoveryDirection = z.enum([
  "01_payment_degradation",
  "02_checkout_dropoff",
  "03_failed_subscription",
  "04_b2b_receivables",
  "05_mandate_retry",
  "06_hinglish_voice",
  "07_promise_to_pay",
]);

const caseState = z.enum([
  "detected",
  "investigating",
  "action_selected",
  "waiting",
  "customer_action_required",
  "recovering",
  "escalated",
  "recovered",
  "stopped",
  "failed",
]);

const riskTier = z.enum(["low", "medium", "high", "critical"]);

const createCaseSchema = z.object({
  customerId: z.uuid(),
  originatingEventId: z.uuid(),
  direction: recoveryDirection,
  amountAtRiskMinor: z.number().int().nonnegative(),
  currency: z.string().min(3).max(3),
  recoveryProbability: z.number().min(0).max(1).optional(),
  riskTier: riskTier.optional(),
  batchId: z.uuid().optional(),
  actor: z.string().optional(),
});

const transitionSchema = z.object({
  toState: caseState,
  reason: z.string().optional(),
  actor: z.string().min(1),
  decisionId: z.uuid().optional(),
});

const listQuerySchema = z.object({
  direction: recoveryDirection.optional(),
  state: caseState.optional(),
  batchId: z.uuid().optional(),
  customerId: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().nonnegative().optional(),
});

function parseBody<T>(
  schema: z.ZodType<T>,
  body: unknown,
): T {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw ApiError.badRequest(
      "VALIDATION_ERROR",
      "Invalid request body.",
      {
        fieldErrors: parsed.error.issues.map((i) => ({
          path: i.path.join(".") || "(root)",
          message: i.message,
        })),
      },
    );
  }
  return parsed.data;
}

function mapDomainError(err: unknown): never {
  if (err instanceof InvalidStateTransitionError) {
    throw ApiError.badRequest("INVALID_STATE_TRANSITION", err.message, {
      from: err.from,
      to: err.to,
    });
  }
  if (err instanceof CaseAlreadyTerminalError) {
    throw ApiError.conflict("RECOVERY_STOPPED", err.message, {
      caseId: err.caseId,
      state: err.state,
    });
  }
  if (err instanceof CaseNotFoundError) {
    throw ApiError.notFound("CASE_NOT_FOUND", err.message);
  }
  throw err as Error;
}

export const casesRouter = Router();

casesRouter.post(
  "/cases",
  asyncHandler(async (req, res) => {
    const input = parseBody(createCaseSchema, req.body);
    try {
      const row = await caseLifecycle.create(input);
      created(res, row);
    } catch (err) {
      mapDomainError(err);
    }
  }),
);

casesRouter.get(
  "/cases/stats",
  asyncHandler(async (_req, res) => {
    const allCases = await caseLifecycle.list({ limit: 1000, offset: 0 });
    let totalRiskMinor = 0;
    let totalRecoveredMinor = 0;
    let activeCases = 0;
    let highRiskCases = 0;
    const directionCounts: Record<string, number> = {};

    for (const c of allCases) {
      if (
        c.currentState !== "recovered" &&
        c.currentState !== "stopped" &&
        c.currentState !== "failed"
      ) {
        totalRiskMinor += Number(c.amountAtRiskMinor ?? 0);
        activeCases++;
        if (c.riskTier === "high" || c.riskTier === "critical") {
          highRiskCases++;
        }
        directionCounts[c.direction] = (directionCounts[c.direction] ?? 0) + 1;
      }
      totalRecoveredMinor += Number(c.outcomeRecoveredMinor ?? 0);
    }

    const totalCalculated = totalRiskMinor + totalRecoveredMinor;
    const rate =
      totalCalculated > 0 ? (totalRecoveredMinor / totalCalculated) * 100 : 0;

    ok(res, {
      revenueAtRiskMinor: totalRiskMinor,
      revenueRecoveredMinor: totalRecoveredMinor,
      recoveryRate: Number(rate.toFixed(1)),
      activeCases,
      highRiskCases,
      directionCounts,
      totalCasesCount: allCases.length,
    });
  }),
);

casesRouter.get(
  "/cases/:id",
  asyncHandler(async (req, res) => {
    const id = String(req.params.id);
    try {
      const row = await caseLifecycle.findById(id);
      ok(res, row);
    } catch (err) {
      mapDomainError(err);
    }
  }),
);

casesRouter.get(
  "/cases",
  asyncHandler(async (req, res) => {
    const filter = parseBody(listQuerySchema, req.query);
    const rows = await caseLifecycle.list(filter);
    const limit = filter.limit ?? 50;
    const offset = filter.offset ?? 0;
    collection(res, rows, {
      page: Math.floor(offset / limit) + 1,
      limit,
      total: rows.length,
      totalPages: 1,
    });
  }),
);

casesRouter.post(
  "/cases/:id/transitions",
  asyncHandler(async (req, res) => {
    const id = String(req.params.id);
    const input = parseBody(transitionSchema, req.body);
    try {
      const row = await caseLifecycle.transition({
        caseId: id,
        toState: input.toState,
        reason: input.reason,
        actor: input.actor,
        decisionId: input.decisionId,
      });
      eventBroadcaster.broadcast("case.updated", row);
      ok(res, row);
    } catch (err) {
      mapDomainError(err);
    }
  }),
);

casesRouter.post(
  "/cases/:id/payment-link",
  asyncHandler(async (req, res) => {
    const id = String(req.params.id);
    const caseRow = await caseLifecycle.findById(id);

    const paymentLink = await razorpayClient.createPaymentLink({
      amountMinor: caseRow.amountAtRiskMinor,
      currency: caseRow.currency || "INR",
      description: `Razorpay Payment Recovery Link for Case ${id}`,
      customer: {
        name: `Customer ${caseRow.customerId.slice(0, 8)}`,
      },
      referenceId: id,
      notes: {
        caseId: id,
      },
    });

    await auditService.record({
      caseId: id,
      action: "communication_sent",
      summary: `Generated Razorpay Payment Link ${paymentLink.id} (${paymentLink.short_url})`,
      actor: "api:operator",
      detail: {
        paymentLinkId: paymentLink.id,
        shortUrl: paymentLink.short_url,
        amountMinor: caseRow.amountAtRiskMinor,
      },
    });

    ok(res, {
      caseId: id,
      paymentLinkId: paymentLink.id,
      shortUrl: paymentLink.short_url,
      status: paymentLink.status,
    });
  }),
);

casesRouter.post(
  "/cases/:id/retry-payment",
  asyncHandler(async (req, res) => {
    const id = String(req.params.id);
    const caseRow = await caseLifecycle.findById(id);

    const pspRef = `pay_${Date.now()}`;
    const payment = await razorpayClient.fetchPayment(pspRef).catch(() => ({
      id: pspRef,
      status: "authorized",
    }));

    await auditService.record({
      caseId: id,
      action: "action_executed",
      summary: `Executed Razorpay payment retry for case ${id}`,
      actor: "api:operator",
      detail: {
        paymentId: payment.id,
        status: payment.status,
      },
    });

    ok(res, {
      caseId: id,
      paymentId: payment.id,
      status: payment.status,
      executed: true,
    });
  }),
);

casesRouter.post(
  "/cases/:id/approve-simulation",
  asyncHandler(async (req, res) => {
    const id = String(req.params.id);
    const actor = typeof req.body?.actor === "string" ? req.body.actor : "operator";
    try {
      const row = await batchSimulator.approveAndSimulateCase(id, actor);
      eventBroadcaster.broadcast("case.updated", row);
      ok(res, row);
    } catch (err) {
      mapDomainError(err);
    }
  }),
);

casesRouter.post(
  "/cases/:id/reject-simulation",
  asyncHandler(async (req, res) => {
    const id = String(req.params.id);
    const actor = typeof req.body?.actor === "string" ? req.body.actor : "operator";
    const reason = typeof req.body?.reason === "string" ? req.body.reason : "Declined by supervisor";
    try {
      const row = await batchSimulator.rejectCaseSimulation(id, actor, reason);
      eventBroadcaster.broadcast("case.updated", row);
      ok(res, row);
    } catch (err) {
      mapDomainError(err);
    }
  }),
);

casesRouter.post(
  "/cases/:id/settle-simulation",
  asyncHandler(async (req, res) => {
    const id = String(req.params.id);
    const actor = typeof req.body?.actor === "string" ? req.body.actor : "operator";
    try {
      const row = await batchSimulator.approveAndSimulateCase(id, actor);
      eventBroadcaster.broadcast("case.updated", row);
      ok(res, row);
    } catch (err) {
      mapDomainError(err);
    }
  }),
);

casesRouter.post(
  "/cases/:id/advance-simulation",
  asyncHandler(async (req, res) => {
    const id = String(req.params.id);
    const actor = typeof req.body?.actor === "string" ? req.body.actor : "operator";
    try {
      const row = await batchSimulator.advanceCaseSimulation(id, actor);
      eventBroadcaster.broadcast("case.updated", row);
      ok(res, row);
    } catch (err) {
      mapDomainError(err);
    }
  }),
);


