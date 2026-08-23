import type {
  BatchId,
  CaseId,
  CustomerId,
  IsoTimestamp,
  Money,
  RevenueEventId,
} from './common';

export type CaseState =
  | 'detected'
  | 'investigating'
  | 'action_selected'
  | 'waiting'
  | 'customer_action_required'
  | 'recovering'
  | 'escalated'
  | 'recovered'
  | 'stopped'
  | 'failed';

export type RiskTier = 'low' | 'medium' | 'high' | 'critical';

export type RecoveryDirectionCode =
  | '01_payment_degradation'
  | '02_checkout_dropoff'
  | '03_failed_subscription'
  | '04_b2b_receivables'
  | '05_mandate_retry'
  | '06_hinglish_voice'
  | '07_promise_to_pay';

export interface CaseOutcome {
  state: CaseState;
  // Money actually recovered (minor units).
  recoveredMinor: number;
  // Customer-committed money (minor units).
  promisedMinor: number;
  closedAt?: IsoTimestamp;
  reason?: string;
}

export interface RecoveryCase {
  id: CaseId;
  customerId: CustomerId;
  originatingEventId: RevenueEventId;
  direction: RecoveryDirectionCode;
  currentState: CaseState;
  amountAtRisk: Money;
  // estimate value, 0..1.
  recoveryProbability: number;
  riskTier: RiskTier;
  // Number of recovery attempts executed so far.
  attemptCount: number;
  // True if escalated to a human at any point.
  escalated: boolean;
  batchId?: BatchId;
  latestDecisionSummary?: string;
  outcome: CaseOutcome;
  openedAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
}
