import type {
  CaseId,
  DecisionId,
  IsoTimestamp,
  Money,
} from './common';
import type { RecoveryActionType } from './recovery-action';

export interface AgentObservations {
  facts: string[];
  contextSnapshot?: Record<string, string | number | boolean>;
}

export interface AgentRecommendation {
  actionType: RecoveryActionType;
  parameters?: Record<string, string | number | boolean>;
  // Predicted revenue outcome (minor units).
  expectedOutcomeMinor?: number;
}

export interface AgentDecision {
  id: DecisionId;
  caseId: CaseId;
  observations: AgentObservations;
  rootCause: string;
  // 0..1 — model confidence in diagnosis.
  confidence: number;
  recommendation: AgentRecommendation;
  rationale: string;
  policyRequirements: string[];
  expectedOutcome?: Money;
  createdAt: IsoTimestamp;
}
