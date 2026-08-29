import { auditService } from "@recovery/audit";
import type { AgentStateType } from "../state.js";

export function recordOutcomeNode() {
  return async (state: AgentStateType): Promise<Partial<AgentStateType>> => {
    await auditService.record({
      caseId: state.caseId,
      action: "outcome_received",
      summary: `Outcome recorded for run ${state.runId}.`,
      detail: {
        runId: state.runId,
        phase: state.phase,
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
