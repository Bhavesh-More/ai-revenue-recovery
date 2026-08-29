import type { AgentStateType } from "../state.js";
import type { DecisionService } from "../decision-service.js";

export interface CreateDecisionDeps {
  decisionService: DecisionService;
}

export function createDecisionNode(deps: CreateDecisionDeps) {
  return async (state: AgentStateType): Promise<Partial<AgentStateType>> => {
    if (!state.policyResult) {
      return {
        phase: "failed",
        error: {
          code: "AGENT_ERROR",
          message: "Cannot create decision without policy result.",
          node: "createDecision",
        },
      };
    }

    if (!state.recommendation) {
      return {
        phase: "failed",
        error: {
          code: "AGENT_ERROR",
          message: "Cannot create decision without recommendation.",
          node: "createDecision",
        },
      };
    }

    const existing = await deps.decisionService.findByRunId(state.runId);

    if (existing) {
      return {
        approval:
          existing.status === "awaiting_approval"
            ? {
                decisionId: existing.id,
                status: "pending",
              }
            : state.approval,
      };
    }

    const decision = await deps.decisionService.create({
      caseId: state.caseId,
      runId: state.runId,
      type: "analyze",
      observations: state.observations ?? [],
      rootCause: state.rootCause ?? "",
      recommendation:
        state.recommendation as unknown as Record<string, unknown>,
      policyResult: state.policyResult,
    });

    return {
      approval:
        decision.status === "awaiting_approval"
          ? {
              decisionId: decision.id,
              status: "pending",
            }
          : state.approval,
    };
  };
}