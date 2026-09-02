import { Router } from "express";
import { z } from "zod";
import { db } from "@recovery/db";
import { batches, recoveryCases } from "@recovery/db/schema";
import { eq, desc, inArray } from "drizzle-orm";
import { RecoveryMetricsCalculator } from "@recovery/case-lifecycle";
import { asyncHandler } from "../lib/async-handler.js";
import { ok, created } from "../lib/responses.js";
import { ApiError } from "../lib/errors.js";

export const metricsRouter = Router();
const metricsCalculator = new RecoveryMetricsCalculator(db);

const recoveryDirection = z.enum([
  "01_payment_degradation",
  "02_checkout_dropoff",
  "03_failed_subscription",
  "04_b2b_receivables",
  "05_mandate_retry",
  "06_hinglish_voice",
  "07_promise_to_pay",
]);

const metricsQuerySchema = z.object({
  direction: recoveryDirection.optional(),
  batchId: z.string().uuid().optional(),
});

const evaluateSchema = z.object({
  direction: recoveryDirection.optional(),
  directions: z.array(recoveryDirection).optional(),
  batchId: z.string().uuid().optional(),
});

const createBatchSchema = z.object({
  name: z.string().min(1).max(255),
  directions: z.array(recoveryDirection).optional(),
  caseIds: z.array(z.string().uuid()).optional(),
});

/**
 * GET /api/v1/metrics
 * Global platform recovery outcome metrics & evaluation breakdowns.
 */
metricsRouter.get(
  "/metrics",
  asyncHandler(async (req, res) => {
    const query = metricsQuerySchema.parse(req.query);
    const metrics = await metricsCalculator.getMetrics(query);
    ok(res, metrics);
  }),
);

/**
 * POST /api/v1/metrics/evaluate
 * Evaluate recovery metrics against natural baselines for filtered cases.
 */
metricsRouter.post(
  "/metrics/evaluate",
  asyncHandler(async (req, res) => {
    const body = evaluateSchema.parse(req.body);
    const metrics = await metricsCalculator.getMetrics(body);
    ok(res, {
      evaluatedAt: new Date().toISOString(),
      filters: body,
      metrics,
    });
  }),
);

/**
 * GET /api/v1/batches
 * List evaluation batches.
 */
metricsRouter.get(
  "/batches",
  asyncHandler(async (_req, res) => {
    const rows = await db
      .select()
      .from(batches)
      .orderBy(desc(batches.createdAt))
      .limit(100);
    ok(res, rows);
  }),
);

/**
 * POST /api/v1/batches
 * Create a new evaluation batch.
 */
metricsRouter.post(
  "/batches",
  asyncHandler(async (req, res) => {
    const input = createBatchSchema.parse(req.body);
    let targetCaseIds = input.caseIds ?? [];

    // If caseIds not provided explicitly, auto-attach cases matching direction filter
    if (targetCaseIds.length === 0) {
      const caseConditions = input.directions && input.directions.length > 0
        ? inArray(recoveryCases.direction, input.directions)
        : undefined;
      const matched = await db
        .select({ id: recoveryCases.id })
        .from(recoveryCases)
        .where(caseConditions);
      targetCaseIds = matched.map((m) => m.id);
    }

    const [createdBatch] = await db
      .insert(batches)
      .values({
        name: input.name,
        directions: input.directions ?? [],
        status: "created",
        caseIds: targetCaseIds,
        totalCases: BigInt(targetCaseIds.length),
      })
      .returning();

    // Link matched cases to batchId
    if (targetCaseIds.length > 0) {
      await db
        .update(recoveryCases)
        .set({ batchId: createdBatch.id })
        .where(inArray(recoveryCases.id, targetCaseIds));
    }

    created(res, createdBatch);
  }),
);

/**
 * POST /api/v1/batches/:id/evaluate
 * Evaluate a specific batch and persist metric snapshot.
 */
metricsRouter.post(
  "/batches/:id/evaluate",
  asyncHandler(async (req, res) => {
    const batchId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const [existing] = await db
      .select()
      .from(batches)
      .where(eq(batches.id, batchId))
      .limit(1);

    if (!existing) {
      throw ApiError.notFound("BATCH_NOT_FOUND", `Batch ${batchId} not found.`);
    }

    const result = await metricsCalculator.evaluateBatch(batchId);
    ok(res, result);
  }),
);

/**
 * GET /api/v1/batches/:id/metrics
 * Fetch evaluation metrics for a specific batch.
 */
metricsRouter.get(
  "/batches/:id/metrics",
  asyncHandler(async (req, res) => {
    const batchId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const [existing] = await db
      .select()
      .from(batches)
      .where(eq(batches.id, batchId))
      .limit(1);

    if (!existing) {
      throw ApiError.notFound("BATCH_NOT_FOUND", `Batch ${batchId} not found.`);
    }

    const metrics = await metricsCalculator.getMetrics({ batchId });
    ok(res, {
      batch: existing,
      metrics,
    });
  }),
);
