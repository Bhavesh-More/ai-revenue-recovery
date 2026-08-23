export type IsoCurrencyCode = string;

export interface Money {
  amountMinor: number;
  currency: IsoCurrencyCode;
}

export type Brand<T, B extends string> = T & { readonly __brand: B };

import type { RecoveryDirectionCode } from './recovery-case';

export type { RecoveryDirectionCode };

export type CustomerId = Brand<string, 'CustomerId'>;
export type RevenueEventId = Brand<string, 'RevenueEventId'>;
export type CaseId = Brand<string, 'CaseId'>;
export type ActionId = Brand<string, 'ActionId'>;
export type DecisionId = Brand<string, 'DecisionId'>;
export type PolicyId = Brand<string, 'PolicyId'>;
export type PromiseId = Brand<string, 'PromiseId'>;
export type AuditEventId = Brand<string, 'AuditEventId'>;
export type BatchId = Brand<string, 'BatchId'>;
export type InvoiceId = Brand<string, 'InvoiceId'>;
export type SubscriptionId = Brand<string, 'SubscriptionId'>;
export type PaymentId = Brand<string, 'PaymentId'>;
export type CheckoutId = Brand<string, 'CheckoutId'>;
export type MandateId = Brand<string, 'MandateId'>;

export type IsoTimestamp = Brand<string, 'IsoTimestamp'>;

export interface Timestamps {
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
}
