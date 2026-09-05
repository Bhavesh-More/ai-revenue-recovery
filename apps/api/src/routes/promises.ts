import { Router } from "express";
import { and, desc, eq, gte, lte, type SQL } from "drizzle-orm";
import { z } from "zod";
import { auditService } from "@recovery/audit";
import { caseLifecycle, CaseNotFoundError } from "@recovery/case-lifecycle";
import { db } from "@recovery/db";
import {
  auditEvents,
  customers,
  promises,
  recoveryActions,
  recoveryCases,
} from "@recovery/db/schema";
import { policyService } from "@recovery/policy";
import { ApiError } from "../lib/errors.js";
import { asyncHandler } from "../lib/async-handler.js";
import { accepted, collection, jsonSafe, ok } from "../lib/responses.js";

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
    status: z.string().optional(),
    dueFrom: z.string().optional(),
    dueTo: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(200).optional(),
    offset: z.coerce.number().int().nonnegative().optional(),
  })
  .transform((q) => ({
    status: q.status,
    dueFrom: q.dueFrom,
    dueTo: q.dueTo,
    limit: q.limit ?? 50,
    offset: q.offset ?? 0,
  }));

const createPromiseSchema = z.object({
  caseId: z.string().uuid(),
  amount: z.coerce.number().int().positive(),
  currency: z.string().optional().default("INR"),
  promisedFor: z.string().min(1),
  source: z.string().optional().default("MANUAL"),
  promiseType: z.enum(["firm", "tentative", "conditional", "informational"]).optional().default("firm"),
  conditions: z.string().optional(),
  actor: z.string().min(1).max(120).optional(),
});

const updatePromiseSchema = z.object({
  status: z.enum(["pending", "due", "fulfilled", "partial", "broken", "rescheduled"]).optional(),
  promisedFor: z.string().optional(),
  fulfilledAmount: z.coerce.number().int().nonnegative().optional(),
  actor: z.string().min(1).max(120).optional(),
});

const checkPromiseSchema = z.object({
  actor: z.string().min(1).max(120).optional(),
});

export const promisesRouter = Router();

promisesRouter.get(
  "/promises",
  asyncHandler(async (req, res) => {
    const q = parse(listQuerySchema, req.query);
    const conditions: SQL[] = [];

    if (q.status) {
      const lower = q.status.toLowerCase();
      if (lower === "active") {
        conditions.push(eq(promises.status, "pending" as any));
      } else {
        conditions.push(eq(promises.status, lower as any));
      }
    }

    if (q.dueFrom) {
      conditions.push(gte(promises.promisedDate, new Date(q.dueFrom)));
    }
    if (q.dueTo) {
      conditions.push(lte(promises.promisedDate, new Date(q.dueTo)));
    }

    const rows = await db
      .select({
        promise: promises,
        case: recoveryCases,
        customer: customers,
      })
      .from(promises)
      .innerJoin(recoveryCases, eq(recoveryCases.id, promises.caseId))
      .innerJoin(customers, eq(customers.id, promises.customerId))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(promises.createdAt))
      .limit(q.limit)
      .offset(q.offset);

    collection(
      res,
      jsonSafe(
        rows.map((r) => ({
          ...r.promise,
          amount: Number(r.promise.amountMinor),
          fulfilledAmount: Number(r.promise.fulfilledAmountMinor),
          promisedFor: r.promise.promisedDate,
          customer: {
            id: r.customer.id,
            name: r.customer.name,
            email: r.customer.email,
          },
          case: {
            id: r.case.id,
            direction: r.case.direction,
            currentState: r.case.currentState,
          },
        })),
      ) as any,
      {
        page: Math.floor(q.offset / q.limit) + 1,
        limit: q.limit,
        total: rows.length,
        totalPages: Math.ceil(rows.length / q.limit) || 1,
      },
    );
  }),
);

promisesRouter.get(
  "/promises/:promiseId",
  asyncHandler(async (req, res) => {
    const promiseId = String(req.params.promiseId);

    const [promiseRow] = await db
      .select()
      .from(promises)
      .where(eq(promises.id, promiseId))
      .limit(1);

    if (!promiseRow) {
      throw ApiError.notFound("PROMISE_NOT_FOUND", `Promise ${promiseId} not found.`);
    }

    const [caseRow] = await db
      .select()
      .from(recoveryCases)
      .where(eq(recoveryCases.id, promiseRow.caseId))
      .limit(1);

    const [customerRow] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, promiseRow.customerId))
      .limit(1);

    ok(
      res,
      jsonSafe({
        id: promiseRow.id,
        caseId: promiseRow.caseId,
        customerId: promiseRow.customerId,
        amount: Number(promiseRow.amountMinor),
        fulfilledAmount: Number(promiseRow.fulfilledAmountMinor),
        currency: promiseRow.currency,
        promisedFor: promiseRow.promisedDate,
        promiseType: promiseRow.promiseType,
        status: promiseRow.status,
        source: promiseRow.source,
        confidence: promiseRow.confidence,
        conditions: promiseRow.conditions,
        createdAt: promiseRow.createdAt,
        updatedAt: promiseRow.updatedAt,
        customer: customerRow ?? null,
        case: caseRow ?? null,
      }),
    );
  }),
);

promisesRouter.post(
  "/promises",
  asyncHandler(async (req, res) => {
    const input = parse(createPromiseSchema, req.body ?? {});
    const actor = input.actor ?? "api:promises";

    try {
      const [caseRow] = await db
        .select()
        .from(recoveryCases)
        .where(eq(recoveryCases.id, input.caseId))
        .limit(1);

      if (!caseRow) throw new CaseNotFoundError(input.caseId);

      const promisedDate = new Date(input.promisedFor);

      const [promiseRow] = await db
        .insert(promises)
        .values({
          caseId: input.caseId,
          customerId: caseRow.customerId,
          amountMinor: input.amount,
          currency: input.currency,
          promisedDate,
          promiseType: input.promiseType as any,
          status: "pending",
          source: input.source,
          conditions: input.conditions ?? null,
        })
        .returning();

      await db
        .update(recoveryCases)
        .set({
          outcomePromisedMinor: input.amount,
          currentState: "waiting",
          updatedAt: new Date(),
        })
        .where(eq(recoveryCases.id, input.caseId));

      await auditService.record({
        caseId: input.caseId,
        action: "action_executed",
        summary: `Promise to pay recorded: ${input.amount} ${input.currency} promised for ${promisedDate.toISOString()}.`,
        detail: {
          promiseId: promiseRow.id,
          amountMinor: input.amount,
          promisedDate: promisedDate.toISOString(),
          source: input.source,
          promiseType: input.promiseType,
        },
        actor,
      });

      accepted(res, jsonSafe({
        id: promiseRow.id,
        caseId: promiseRow.caseId,
        customerId: promiseRow.customerId,
        amount: Number(promiseRow.amountMinor),
        currency: promiseRow.currency,
        promisedFor: promiseRow.promisedDate,
        status: promiseRow.status,
        source: promiseRow.source,
        createdAt: promiseRow.createdAt,
      }) as any);
    } catch (err) {
      mapDomainError(err);
    }
  }),
);

promisesRouter.patch(
  "/promises/:promiseId",
  asyncHandler(async (req, res) => {
    const promiseId = String(req.params.promiseId);
    const input = parse(updatePromiseSchema, req.body ?? {});
    const actor = input.actor ?? "api:promises";

    const [promiseRow] = await db
      .select()
      .from(promises)
      .where(eq(promises.id, promiseId))
      .limit(1);

    if (!promiseRow) {
      throw ApiError.notFound("PROMISE_NOT_FOUND", `Promise ${promiseId} not found.`);
    }

    const updates: Partial<typeof promises.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (input.status) updates.status = input.status as any;
    if (input.promisedFor) updates.promisedDate = new Date(input.promisedFor);
    if (input.fulfilledAmount !== undefined) {
      updates.fulfilledAmountMinor = input.fulfilledAmount;
      if (input.fulfilledAmount >= Number(promiseRow.amountMinor)) {
        updates.status = "fulfilled";
        updates.fulfilledAt = new Date();
      } else if (input.fulfilledAmount > 0) {
        updates.status = "partial";
      }
    }

    const [updated] = await db
      .update(promises)
      .set(updates)
      .where(eq(promises.id, promiseId))
      .returning();

    await auditService.record({
      caseId: promiseRow.caseId,
      action: "outcome_received",
      summary: `Promise ${promiseId} updated to status ${updated.status}.`,
      detail: {
        promiseId,
        status: updated.status,
        fulfilledAmountMinor: updated.fulfilledAmountMinor,
      },
      actor,
    });

    if (updated.status === "fulfilled") {
      await caseLifecycle.recordOutcome({
        caseId: promiseRow.caseId,
        recoveredMinor: Number(updated.fulfilledAmountMinor),
        promisedMinor: Number(promiseRow.amountMinor),
        reason: "promise to pay fulfilled",
        actor,
      }).catch(() => undefined);
    }

    ok(res, jsonSafe({
      id: updated.id,
      caseId: updated.caseId,
      amount: Number(updated.amountMinor),
      fulfilledAmount: Number(updated.fulfilledAmountMinor),
      status: updated.status,
      promisedFor: updated.promisedDate,
      updatedAt: updated.updatedAt,
    }));
  }),
);

promisesRouter.post(
  "/promises/:promiseId/check",
  asyncHandler(async (req, res) => {
    const promiseId = String(req.params.promiseId);
    const input = parse(checkPromiseSchema, req.body ?? {});
    const actor = input.actor ?? "api:promises";

    const [promiseRow] = await db
      .select()
      .from(promises)
      .where(eq(promises.id, promiseId))
      .limit(1);

    if (!promiseRow) {
      throw ApiError.notFound("PROMISE_NOT_FOUND", `Promise ${promiseId} not found.`);
    }

    const now = new Date();
    const pDate = new Date(promiseRow.promisedDate);
    const isPast = pDate < now;
    const isFulfilled = Number(promiseRow.fulfilledAmountMinor) >= Number(promiseRow.amountMinor);

    let evaluatedStatus: "FULFILLED" | "PENDING" | "DUE_SOON" | "MISSED" = "PENDING";

    if (isFulfilled || promiseRow.status === "fulfilled") {
      evaluatedStatus = "FULFILLED";
    } else if (isPast) {
      evaluatedStatus = "MISSED";
      await db
        .update(promises)
        .set({ status: "broken", updatedAt: now })
        .where(eq(promises.id, promiseId));

      await auditService.record({
        caseId: promiseRow.caseId,
        action: "escalation",
        summary: `Promise ${promiseId} missed/broken on ${pDate.toISOString()}.`,
        detail: { promiseId, promisedDate: pDate.toISOString() },
        actor,
      });

      await caseLifecycle
        .transition({
          caseId: promiseRow.caseId,
          toState: "escalated",
          reason: "promise to pay date missed",
          actor,
        })
        .catch(() => undefined);
    } else if (pDate.getTime() - now.getTime() <= 24 * 3600 * 1000) {
      evaluatedStatus = "DUE_SOON";
    }

    ok(res, jsonSafe({
      promiseId,
      caseId: promiseRow.caseId,
      status: evaluatedStatus,
      amount: Number(promiseRow.amountMinor),
      promisedFor: promiseRow.promisedDate,
      checkedAt: now,
    }));
  }),
);

promisesRouter.get(
  "/promises/:promiseId/history",
  asyncHandler(async (req, res) => {
    const promiseId = String(req.params.promiseId);

    const [promiseRow] = await db
      .select()
      .from(promises)
      .where(eq(promises.id, promiseId))
      .limit(1);

    if (!promiseRow) {
      throw ApiError.notFound("PROMISE_NOT_FOUND", `Promise ${promiseId} not found.`);
    }

    const events = await auditService.list({
      caseId: promiseRow.caseId,
      limit: 50,
    });

    ok(
      res,
      jsonSafe({
        promiseId,
        caseId: promiseRow.caseId,
        history: events,
      }),
    );
  }),
);
