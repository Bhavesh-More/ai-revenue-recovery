import type {
  CaseId,
  IsoTimestamp,
  Money,
  PolicyId,
  RecoveryDirectionCode,
} from './common';

export type PolicyDecision = 'allow' | 'deny' | 'require_approval';

export interface RetryLimits {
  maxPaymentRetries: number;
  minRetryIntervalSeconds: number;
  maxCaseAgeSeconds: number;
}

export interface CommunicationLimits {
  maxMessages: number;
  minMessageIntervalSeconds: number;
  allowedChannels: ('email' | 'sms' | 'whatsapp' | 'voice')[];
  callWindowStartHour?: number;
  callWindowEndHour?: number;
}

export interface FinancialLimits {
  highValueApprovalThreshold: Money;
  maxDiscountMinor: number;
  maxPlanDurationDays: number;
}

export interface EscalationRules {
  escalateOnRepeatedFailure: number;
  escalateOnBrokenPromise: boolean;
  escalateOnDispute: boolean;
  escalateOnHighValue: boolean;
}

export interface StopRules {
  stopOnOptOut: boolean;
  stopOnCancel: boolean;
  stopOnMaxAttempts: boolean;
  stopOnHumanTakeover: boolean;
}

export interface Policy {
  id: PolicyId;
  name: string;
  // Empty array = applies to all directions. 
  applicableDirections: RecoveryDirectionCode[];
  retry: RetryLimits;
  communication: CommunicationLimits;
  financial: FinancialLimits;
  escalation: EscalationRules;
  stop: StopRules;
  enabled: boolean;
  updatedAt: IsoTimestamp;
  updatedBy?: string;
}

export interface PolicyEvaluation {
  caseId: CaseId;
  policyId: PolicyId;
  decision: PolicyDecision;
  // Human-readable reasons.
  reasons: string[];
  // When true, agent must wait for approval before executing.
  requiresApprovalFrom?: 'operator' | 'account_manager' | 'human';
  evaluatedAt: IsoTimestamp;
}
