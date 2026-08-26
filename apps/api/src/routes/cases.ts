import { Router } from "express";
import { z } from "zod";
import {
  caseLifecycle,
  CaseAlreadyTerminalError,
  CaseNotFoundError,
  InvalidStateTransitionError,
} from "@recovery/case-lifecycle";
import { ApiError } from "../lib/errors.js";
import { asyncHandler } from "../lib/async-handler.js";
import { created, ok, collection } from "../lib/responses.js";

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
      ok(res, row);
    } catch (err) {
      mapDomainError(err);
    }
  }),
);
