import type {
  BatchId,
  CaseId,
  IsoTimestamp,
  Money,
  RecoveryDirectionCode,
} from './common';

export type BatchStatus =
  | 'created'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface BatchCounts {
  totalCases: number;
  recoveredCases: number;
  escalatedCases: number;
  stoppedCases: number;
  failedCases: number;
}

export interface Batch {
  id: BatchId;
  name: string;
  // Optional single-direction filter. Empty = all directions.
  directions: RecoveryDirectionCode[];
  status: BatchStatus;
  // Snapshot for fast dashboard render.
  counts: BatchCounts;
  revenueAtRisk: Money;
  // Sum of recovered across all cases.
  revenueRecovered: Money;
  recoveryRate: number;
  caseIds: CaseId[];
  createdAt: IsoTimestamp;
  startedAt?: IsoTimestamp;
  completedAt?: IsoTimestamp;
}
