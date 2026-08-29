import { interrupt } from "@langchain/langgraph";
import { auditService } from "@recovery/audit";
import type { AgentStateType } from "../state.js";

export interface WaitForApprovalDeps {
  // interrupt is imported globally from langgraph
}

export function waitForApprovalNode(_deps: WaitForApprovalDeps) {
  return async (state: AgentStateType): Promise<Partial<AgentStateType>> => {
    const decisionId = state.approval?.decisionId;

    if (!decisionId) {
      return {
        phase: "failed",
        error: {
          code: "AGENT_ERROR",
          message: "Approval requested without a decision ID.",
          node: "waitForApproval",
        },
      };
    }

    const payload = {
      decisionId,
      caseId: state.caseId,
      runId: state.runId,
      recommendation: state.recommendation,
      policyResult: state.policyResult,
      awaitingSince: new Date().toISOString(),
    };

    await auditService.record({
      caseId: state.caseId,
      action: "decision_created",
      summary: `Decision ${decisionId} awaiting human approval.`,
      detail: {
        runId: state.runId,
        decisionId,
        policyDecision: state.policyResult?.decision ?? "unknown",
        requiresApprovalFrom: state.policyResult?.requiresApprovalFrom ?? null,
      },
      actor: "agent:waitForApproval",
    });

    // Interrupt pauses the graph. Resume happens when /decisions/:id/approve or /reject
    // calls graph.invoke(null, { configurable: { thread_id: state.caseId } })
    const resumed = interrupt(payload);

    const approval = {
      decisionId,
      status: (resumed as { approved?: boolean })?.approved
        ? ("approved" as const)
        : ("rejected" as const),
      approvedBy: (resumed as { actor?: string })?.actor,
      reason: (resumed as { reason?: string })?.reason,
      decidedAt: new Date().toISOString(),
    };

    return {
      phase: approval.status === "approved"
        ? "policy_checked"
        : "denied",
      approval,
    };
  };
}
