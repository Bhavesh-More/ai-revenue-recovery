import { auditService } from "@recovery/audit";
import { policyService } from "@recovery/policy";
import type { AgentStateType } from "../state.js";
import type { DecisionService, AgentDecisionType } from "../decision-service.js";

export interface CheckPolicyDeps {
  decisionService: DecisionService;
}

export function checkPolicyNode(deps: CheckPolicyDeps) {
  return async (state: AgentStateType): Promise<Partial<AgentStateType>> => {
    const rec = state.recommendation;
    if (!rec) {
      return {
        phase: "failed",
        error: {
          code: "AGENT_ERROR",
          message: "No recommendation produced by reasoner.",
          node: "checkPolicy",
        },
      };
    }

    const proposedAmountMinor =
      rec.parameters && typeof rec.parameters.amountMinor === "number"
        ? (rec.parameters.amountMinor as number)
        : rec.expectedOutcomeMinor;

    const evaluation = await policyService.evaluate({
      caseId: state.caseId,
      proposedActionType: rec.actionType,
      proposedAmountMinor,
    });

    const policyResult = {
      decision: evaluation.decision,
      reasons: evaluation.reasons,
      requiresApprovalFrom: evaluation.requiresApprovalFrom,
      policyId: evaluation.policyId,
    };

    const type: AgentDecisionType =
      state.phase === "reasoned" ? "analyze" : "recovery";

    await auditService.record({
      caseId: state.caseId,
      action: "policy_checked",
      summary: `Policy ${evaluation.policyId} → ${evaluation.decision}.`,
      detail: {
        runId: state.runId,
        policyId: evaluation.policyId,
        decision: evaluation.decision,
        reasonsJoined: evaluation.reasons.join("|"),
        reasonCount: evaluation.reasons.length,
        requiresApprovalFrom: evaluation.requiresApprovalFrom ?? null,
      },
      actor: "agent:checkPolicy",
    });

    const observations =
      evaluation.reasons.length > 0
        ? [`policy:${evaluation.decision}:${evaluation.reasons.join(",")}`]
        : [`policy:${evaluation.decision}`];

    return {
      phase:
        evaluation.decision === "require_approval"
          ? "awaiting_approval"
          : "policy_checked",
      policyResult,
      observations,
    };
  };
}
