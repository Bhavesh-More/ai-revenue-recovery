import { Router } from "express";
import { policyService, PolicyNotFoundError } from "@recovery/policy";
import {
  activatePolicySchema,
  createPolicySchema,
  evaluatePolicySchema,
  listPoliciesQuerySchema,
  patchPolicySchema,
} from "@recovery/validation";
import { ApiError } from "../lib/errors.js";
import { asyncHandler } from "../lib/async-handler.js";
import { created, ok, collection, jsonSafe } from "../lib/responses.js";

function parse<T>(schema: { safeParse(v: unknown): { success: true; data: T } | { success: false; error: any } }, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw ApiError.badRequest(
      "VALIDATION_ERROR",
      "Invalid request.",
      {
        fieldErrors: parsed.error.issues.map((i: any) => ({
          path: i.path.join(".") || "(root)",
          message: i.message,
        })),
      },
    );
  }
  return parsed.data;
}

function mapDomainError(err: unknown): never {
  if (err instanceof PolicyNotFoundError) {
    throw ApiError.notFound("POLICY_NOT_FOUND", err.message);
  }
  throw err as Error;
}

export const policiesRouter = Router();

policiesRouter.get(
  "/policies",
  asyncHandler(async (req, res) => {
    const q = parse(listPoliciesQuerySchema, req.query);
    const rows = await policyService.list({ enabled: q.enabled });
    collection(res, jsonSafe(rows) as any, {
      page: q.page,
      limit: q.limit,
      total: rows.length,
      totalPages: 1,
    });
  }),
);

policiesRouter.get(
  "/policies/:id",
  asyncHandler(async (req, res) => {
    try {
      const row = await policyService.findById(String(req.params.id));
      ok(res, jsonSafe(row));
    } catch (err) {
      mapDomainError(err);
    }
  }),
);

policiesRouter.post(
  "/policies",
  asyncHandler(async (req, res) => {
    const input = parse(createPolicySchema, req.body);
    const row = await policyService.create(input, "system");
    created(res, jsonSafe(row));
  }),
);

policiesRouter.patch(
  "/policies/:id",
  asyncHandler(async (req, res) => {
    const id = String(req.params.id);
    const input = parse(patchPolicySchema, req.body);
    try {
      const row = await policyService.patch(id, input, "system");
      ok(res, jsonSafe(row));
    } catch (err) {
      mapDomainError(err);
    }
  }),
);

policiesRouter.post(
  "/policies/:id/activate",
  asyncHandler(async (req, res) => {
    const id = String(req.params.id);
    const input = parse(activatePolicySchema, req.body);
    try {
      const row = await policyService.activate(id, "system", input.enabled);
      ok(res, jsonSafe(row));
    } catch (err) {
      mapDomainError(err);
    }
  }),
);

export const casesPolicyRouter = Router();

casesPolicyRouter.post(
  "/recovery-cases/:caseId/policy-check",
  asyncHandler(async (req, res) => {
    const caseId = String(req.params.caseId);
    const input = parse(evaluatePolicySchema, req.body);
    try {
      const result = await policyService.evaluate({
        caseId,
        proposedActionType: input.proposedActionType,
        proposedAmountMinor: input.proposedAmountMinor,
      });
      ok(res, result);
    } catch (err) {
      if (err instanceof PolicyNotFoundError) {
        if (err.policyId.startsWith("case:")) {
          throw ApiError.notFound("CASE_NOT_FOUND", err.message);
        }
        throw ApiError.notFound("POLICY_NOT_FOUND", err.message);
      }
      throw err;
    }
  }),
);
