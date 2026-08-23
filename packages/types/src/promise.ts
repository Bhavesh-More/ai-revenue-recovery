import type {
  CaseId,
  CustomerId,
  InvoiceId,
  IsoTimestamp,
  Money,
  PromiseId,
} from './common';

export type PromiseType =
  | 'firm'
  | 'tentative'
  | 'conditional'
  | 'informational';

export type PromiseStatus =
  | 'pending'
  | 'due'
  | 'fulfilled'
  | 'partial'
  | 'broken'
  | 'rescheduled';

export interface Promise {
  id: PromiseId;
  caseId: CaseId;
  customerId: CustomerId;
  // Invoice the promise applies to.
  invoiceIds: InvoiceId[];
  type: PromiseType;
  status: PromiseStatus;
  amount: Money;
  // Date the customer said they would pay.
  promisedAt: IsoTimestamp;
  // Date the customer actually paid (if fulfilled).
  condition?: string;
  /** 0..1 — extraction confidence. */
  confidence: number;
  /** Raw customer statement the promise was extracted from. */
  sourceText?: string;
  /** Partial / final collection (minor units). */
  actualAmountMinor?: number;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
}
