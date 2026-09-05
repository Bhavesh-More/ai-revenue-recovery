import { Router } from "express";
import {
  agentRunner,
  DecisionNotFoundError,
  InvalidApprovalTransitionError,
} from "@recovery/agent";
import { CaseNotFoundError } from "@recovery/case-lifecycle";
import {
  analyzeCaseSchema,
  approveDecisionSchema,
  listDecisionsQuerySchema,
  recoverCaseSchema,
  rejectDecisionSchema,
} from "@recovery/validation";
import { ApiError } from "../lib/errors.js";
import { asyncHandler } from "../lib/async-handler.js";
import { accepted, ok, collection, jsonSafe } from "../lib/responses.js";

function parse<T>(
  schema: { safeParse(v: unknown): { success: true; data: T } | { success: false; error: any } },
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
  if (err instanceof DecisionNotFoundError) {
    throw ApiError.notFound("RESOURCE_NOT_FOUND", err.message);
  }
  if (err instanceof InvalidApprovalTransitionError) {
    throw ApiError.conflict("INVALID_STATE_TRANSITION", err.message, {
      from: err.from,
      to: err.to,
    });
  }
  throw err as Error;
}

export const casesAgentRouter = Router();

casesAgentRouter.post(
  "/recovery-cases/:caseId/analyze",
  asyncHandler(async (req, res) => {
    const caseId = String(req.params.caseId);
    const input = parse(analyzeCaseSchema, req.body ?? {});
    try {
      const decision = await agentRunner.runAnalysis({
        caseId,
        actor: input.actor ?? "system",
      });
      accepted(res, {
        caseId,
        runId: decision.runId,
        status: "ANALYSIS_COMPLETED",
        decision: jsonSafe(decision),
      });
    } catch (err) {
      mapDomainError(err);
    }
  }),
);

casesAgentRouter.post(
  "/recovery-cases/:caseId/recover",
  asyncHandler(async (req, res) => {
    const caseId = String(req.params.caseId);
    const input = parse(recoverCaseSchema, req.body);
    try {
      const decision = await agentRunner.runAnalysis({
        caseId,
        mode: input.mode,
        actor: input.actor ?? "system",
      });
      accepted(res, {
        caseId,
        runId: decision.runId,
        status: "RECOVERY_COMPLETED",
        decision: jsonSafe(decision),
      });
    } catch (err) {
      mapDomainError(err);
    }
  }),
);

casesAgentRouter.get(
  "/recovery-cases/:caseId/decisions",
  asyncHandler(async (req, res) => {
    const caseId = String(req.params.caseId);
    const q = parse(listDecisionsQuerySchema, req.query);
    const rows = await agentRunner.listDecisionsByCaseId(
      caseId,
      q.limit,
      q.offset,
    );
    collection(res, jsonSafe(rows) as any, {
      page: Math.floor(q.offset / q.limit) + 1,
      limit: q.limit,
      total: rows.length,
      totalPages: 1,
    });
  }),
);

casesAgentRouter.post(
  "/recovery-cases/:caseId/decisions/:decisionId/approve",
  asyncHandler(async (req, res) => {
    const decisionId = String(req.params.decisionId);
    const input = parse(approveDecisionSchema, req.body);
    try {
      const decision = await agentRunner.resumeDecision({
        decisionId,
        approved: true,
        actor: input.actor,
        reason: input.reason,
      });
      ok(res, jsonSafe(decision));
    } catch (err) {
      mapDomainError(err);
    }
  }),
);

casesAgentRouter.post(
  "/recovery-cases/:caseId/decisions/:decisionId/reject",
  asyncHandler(async (req, res) => {
    const decisionId = String(req.params.decisionId);
    const input = parse(rejectDecisionSchema, req.body);
    try {
      const decision = await agentRunner.resumeDecision({
        decisionId,
        approved: false,
        actor: input.actor,
        reason: input.reason,
      });
      ok(res, jsonSafe(decision));
    } catch (err) {
      mapDomainError(err);
    }
  }),
);
