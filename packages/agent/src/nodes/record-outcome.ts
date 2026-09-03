import { auditService } from "@recovery/audit";
import { caseLifecycle } from "@recovery/case-lifecycle";
import type { AgentStateType } from "../state.js";

export function recordOutcomeNode() {
  return async (state: AgentStateType): Promise<Partial<AgentStateType>> => {
    if (state.policyResult?.decision === "deny") {
      try {
        await caseLifecycle.transition({
          caseId: state.caseId,
          toState: "stopped",
          reason: state.policyResult.reasons.join("; ") || "policy denial",
          actor: "agent:recordOutcome",
        });
      } catch {}
    }

    await auditService.record({
      caseId: state.caseId,
      action: "outcome_received",
      summary: `Outcome recorded for run ${state.runId}.`,
      detail: {
        runId: state.runId,
        phase: state.phase,
        policyDecision: state.policyResult?.decision ?? null,
        recoveredMinor: state.outcome?.recoveredMinor ?? 0,
        promisedMinor: state.outcome?.promisedMinor ?? 0,
      },
      actor: "agent:recordOutcome",
    });

    return {
      phase: "outcome_recorded",
    };
  };
}

