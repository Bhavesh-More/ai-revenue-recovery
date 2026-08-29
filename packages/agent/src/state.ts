import { Annotation } from "@langchain/langgraph";
import type { RecoveryActionType } from "@recovery/types";

export type AgentPhase =
  | "context_loaded"
  | "reasoned"
  | "policy_checked"
  | "awaiting_approval"
  | "executed"
  | "outcome_recorded"
  | "denied"
  | "failed"
  | "done";

export interface AgentRecommendation {
  actionType: RecoveryActionType;
  parameters?: Record<string, string | number | boolean>;
  expectedOutcomeMinor?: number;
  confidence: number;
  rationale: string;
}

export interface AgentPolicyResult {
  decision: "allow" | "deny" | "require_approval";
  reasons: string[];
  requiresApprovalFrom?: "operator" | "account_manager" | "human";
  policyId: string;
}

export interface AgentApprovalState {
  decisionId: string;
  status: "pending" | "approved" | "rejected";
  approvedBy?: string;
  reason?: string;
  decidedAt?: string;
}

export interface AgentErrorState {
  code:
    | "AGENT_ERROR"
    | "AGENT_TIMEOUT"
    | "AGENT_TOOL_ERROR"
    | "POLICY_VIOLATION"
    | "INVALID_STATE";
  message: string;
  node: string;
}

export interface AgentOutcome {
  recoveredMinor: number;
  promisedMinor: number;
  reason?: string;
}

export const AgentState = Annotation.Root({
  caseId: Annotation<string>(),
  runId: Annotation<string>(),
  phase: Annotation<AgentPhase>(),
  observations: Annotation<string[]>({
    reducer: (curr, next) => (curr ?? []).concat(next ?? []),
    default: () => [] as string[],
  }),
  rootCause: Annotation<string>(),
  recommendation: Annotation<AgentRecommendation>(),
  policyResult: Annotation<AgentPolicyResult>(),
  approval: Annotation<AgentApprovalState>(),
  error: Annotation<AgentErrorState>(),
  outcome: Annotation<AgentOutcome>(),
});

export type AgentStateType = typeof AgentState.State;
