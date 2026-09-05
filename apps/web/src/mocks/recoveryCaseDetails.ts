import { RecoveryCaseStatus, RecoveryCaseRisk } from './recoveryCases';

export interface TimelineEvent {
  id: string;
  title: string;
  description?: string;
  time: string;
  icon: string;
  iconColor: 'orange' | 'blue' | 'green' | 'muted' | 'red';
  bgClass: string;
}

export interface CaseOutcome {
  successful: boolean;
  title: string;
  description: string;
  amountRecovered: number;
}

export interface AIDecision {
  whyExplanation: string;
  recommendedAction: string;
  confidence: 'High' | 'Medium' | 'Low';
}

export interface PolicyDecisionData {
  proposedAction: string;
  actionAllowed: boolean;
  policyReason: string;
  retriesUsed: string;
  commsAttempts: string;
  humanApproval: string;
}

export interface RecoveryCaseDetail {
  id: string;
  customer: string;
  direction: string;
  amountAtRisk: number;
  amountRecovered: number;
  status: RecoveryCaseStatus;
  risk: RecoveryCaseRisk;
  recoveryProbability: number;
  timeline: TimelineEvent[];
  outcome: CaseOutcome;
  aiDecision: AIDecision;
  policyDecision: PolicyDecisionData;
  batchId?: string | null;
}

export const mockCaseDetails: Record<string, RecoveryCaseDetail> = {};
