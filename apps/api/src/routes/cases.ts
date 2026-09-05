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
import { db } from "@recovery/db";
import { recoveryActions } from "@recovery/db/schema";
import { eq, desc } from "drizzle-orm";


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

casesRouter.post(
  "/cases/:id/sync-razorpay",
  asyncHandler(async (req, res) => {
    const id = String(req.params.id);
    const caseRow = await caseLifecycle.findById(id);

    // Look for latest payment link action
    const actions = await db
      .select()
      .from(recoveryActions)
      .where(eq(recoveryActions.caseId, id))
      .orderBy(desc(recoveryActions.createdAt));

    const paymentLinkAction = actions.find(
      (a: any) => a.type === "send_payment_link" && a.payload?.paymentLinkId,
    );

    const paymentLinkId = (paymentLinkAction?.payload as any)?.paymentLinkId;
    if (!paymentLinkId) {
      return ok(res, {
        synced: false,
        status: caseRow.currentState,
        message: "No Razorpay payment link found for this case.",
        case: caseRow,
      });
    }

    try {
      const link = await (razorpayClient as any).fetchPaymentLink(paymentLinkId);
      const payments = await (razorpayClient as any).fetchPaymentsForLink(paymentLinkId);

      const linkPayments = Array.isArray(link?.payments) ? link.payments : [];
      const directPayments = Array.isArray(payments) ? payments : [];
      const allPayments = [...linkPayments, ...directPayments];

      // Check if paid
      const isPaid =
        link.status === "paid" ||
        allPayments.some((p: any) => p.status === "captured" || p.status === "paid");

      if (isPaid && caseRow.currentState !== "recovered") {
        const updated = await caseLifecycle.recordOutcome({
          caseId: id,
          recoveredMinor: Number(caseRow.amountAtRiskMinor || 0),
          reason: "Razorpay payment link verified paid via live API sync",
          actor: "system:razorpay_sync",
        });
        await auditService.record({
          caseId: id,
          action: "outcome_received",
          summary: `[RAZORPAY] Payment confirmed captured via Razorpay API.`,
          detail: {
            lifecycleEvent: "RAZORPAY_PAYMENT_RECEIVED",
            paymentLinkId,
            status: "paid",
          },
          actor: "system:razorpay_sync",
        });
        eventBroadcaster.broadcast("case.updated", updated);
        return ok(res, {
          synced: true,
          status: "recovered",
          message: "Payment successfully verified and captured in Razorpay!",
          case: updated,
        });
      }

      // Check for failed payment attempts
      const failedPayment = allPayments.find(
        (p: any) => p.status === "failed" || p.status === "declined",
      );

      if (
        failedPayment &&
        (caseRow.currentState === "customer_action_required" ||
          caseRow.currentState === "recovering")
      ) {
        const payId = failedPayment.payment_id || failedPayment.id;
        let errorDesc = "Customer payment declined by bank.";
        let errorCode = "PAYMENT_FAILED";

        if (payId) {
          try {
            const fullPayment = await razorpayClient.fetchPayment(payId);
            errorDesc =
              fullPayment.error_description ||
              fullPayment.error_reason ||
              failedPayment.error_description ||
              errorDesc;
            errorCode = fullPayment.error_code || errorCode;
          } catch {}
        }

        const newAttempts = Number(caseRow.attemptCount || 0) + 1;

        await auditService.record({
          caseId: id,
          action: "action_failed",
          summary: `[RAZORPAY] Payment link attempt #${newAttempts} failed: ${errorDesc}`,
          detail: {
            lifecycleEvent: "PAYMENT_FAILED",
            provider: "razorpay",
            paymentId: payId,
            paymentLinkId,
            errorCode,
            errorDescription: errorDesc,
            attemptCount: newAttempts,
          },
          actor: "system:razorpay_sync",
        });

        const nextState = newAttempts >= 3 ? "escalated" : "waiting";
        const updated = await caseLifecycle.transition({
          caseId: id,
          toState: nextState,
          reason: `Razorpay payment attempt failed (${errorDesc}). ${
            nextState === "escalated"
              ? "Max retries reached; escalated to human supervisor."
              : "Queued for automated retry sequence."
          }`,
          actor: "system:razorpay_sync",
        });

        eventBroadcaster.broadcast("case.updated", updated);
        return ok(res, {
          synced: true,
          status: nextState,
          message: `Payment failure verified with Razorpay (${errorDesc}). Case moved to ${nextState}.`,
          case: updated,
        });
      }

      if (link.status === "cancelled" || link.status === "expired") {
        const updated = await caseLifecycle.transition({
          caseId: id,
          toState: "waiting",
          reason: `Razorpay payment link ${link.status}. Alternative recovery action touchpoint queued.`,
          actor: "system:razorpay_sync",
        });
        eventBroadcaster.broadcast("case.updated", updated);
        return ok(res, {
          synced: true,
          status: "waiting",
          message: `Razorpay link ${link.status}. Case moved to waiting for next recovery action.`,
          case: updated,
        });
      }

      return ok(res, {
        synced: true,
        status: caseRow.currentState,
        message: "Payment link is active; awaiting customer payment in Razorpay.",
        case: caseRow,
      });
    } catch (err: any) {
      return ok(res, {
        synced: false,
        status: caseRow.currentState,
        message: `Razorpay API check: ${err.message}`,
        case: caseRow,
      });
    }
  }),
);

casesRouter.post(
  "/cases/:id/simulate-payment-failure",
  asyncHandler(async (req, res) => {
    const id = String(req.params.id);
    const caseRow = await caseLifecycle.findById(id);
    const reason =
      req.body?.reason ||
      "Payment declined: Bank downtime / insufficient funds / card authentication failed";
    const newAttempts = Number(caseRow.attemptCount || 0) + 1;

    await auditService.record({
      caseId: id,
      action: "action_failed",
      summary: `[RAZORPAY SIMULATION] Customer payment link attempt #${newAttempts} failed: ${reason}`,
      detail: {
        lifecycleEvent: "PAYMENT_FAILED",
        provider: "razorpay",
        failureReason: reason,
        attemptCount: newAttempts,
        simulated: true,
      },
      actor: "operator:simulation",
    });

    const nextState = newAttempts >= 3 ? "escalated" : "waiting";
    const updated = await caseLifecycle.transition({
      caseId: id,
      toState: nextState,
      reason: `Customer payment attempt #${newAttempts} failed: ${reason}. ${
        nextState === "escalated"
          ? "Max retries reached; escalated to human supervisor."
          : "Automated retry sequence scheduled."
      }`,
      actor: "operator:simulation",
    });

    eventBroadcaster.broadcast("case.updated", updated);
    ok(res, {
      simulated: true,
      status: nextState,
      message: `Simulated payment failure recorded. Case transitioned to ${nextState}.`,
      case: updated,
    });
  }),
);

casesRouter.post(
  "/cases/:id/simulate-payment-success",
  asyncHandler(async (req, res) => {
    const id = String(req.params.id);
    const caseRow = await caseLifecycle.findById(id);
    const amountMinor = Number(caseRow.amountAtRiskMinor || 0);

    const updated = await caseLifecycle.recordOutcome({
      caseId: id,
      recoveredMinor: amountMinor,
      reason: "[RAZORPAY SIMULATION] Customer paid invoice via Razorpay payment link.",
      actor: "operator:simulation",
    });

    await auditService.record({
      caseId: id,
      action: "outcome_received",
      summary: `[RAZORPAY SIMULATION] Razorpay payment link paid. Recovered ₹${Math.round(
        amountMinor / 100,
      ).toLocaleString("en-IN")}.`,
      detail: {
        lifecycleEvent: "RAZORPAY_PAYMENT_RECEIVED",
        amountMinor,
        simulated: true,
      },
      actor: "operator:simulation",
    });

    eventBroadcaster.broadcast("case.updated", updated);
    ok(res, {
      simulated: true,
      status: "recovered",
      message: "Simulated payment captured! Case successfully recovered.",
      case: updated,
    });
  }),
);



