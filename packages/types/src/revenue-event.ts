import type {
  CaseId,
  CheckoutId,
  CustomerId,
  InvoiceId,
  IsoTimestamp,
  MandateId,
  PaymentId,
  RevenueEventId,
  SubscriptionId,
} from './common';
import type { Money } from './common';

export type RevenueEventType =
  | 'payment.failed'
  | 'payment.succeeded'
  | 'checkout.abandoned'
  | 'subscription.renewal_failed'
  | 'invoice.overdue'
  | 'mandate.failed'
  | 'customer.responded'
  | 'promise.created'
  | 'promise.due'
  | 'promise.broken'
  | 'promise.fulfilled';

export type FailureReasonCode =
  | 'card_expired'
  | 'insufficient_funds'
  | 'bank_decline'
  | 'authentication_required'
  | 'network_error'
  | 'mandate_inactive'
  | 'provider_degradation'
  | 'unknown';

export interface PaymentFailedPayload {
  paymentId: PaymentId;
  providerCode?: string;
  provider?: string;
  paymentMethod?: string;
  bank?: string;
  region?: string;
  reasonCode?: FailureReasonCode;
  failureReason?: FailureReasonCode;
  retryEligible: boolean;
  attemptCount?: number;
  baselineSuccessRate?: number;
  currentSuccessRate?: number;
  similarFailureCount?: number;
  affectedCustomerCount?: number;
  timeWindowMinutes?: number;
}

export interface PaymentSucceededPayload {
  paymentId: PaymentId;
  amount: Money;
}

export interface CheckoutAbandonedPayload {
  checkoutId: CheckoutId;
  cartValue: Money;
  // Last checkout step the customer reached.
  lastStep: 'cart' | 'address' | 'payment' | 'review';
  paymentAttempted: boolean;
}

export interface SubscriptionRenewalFailedPayload {
  subscriptionId: SubscriptionId;
  paymentId: PaymentId;
  reasonCode: FailureReasonCode;
  tenureMonths: number;
}

export interface InvoiceOverduePayload {
  invoiceId: InvoiceId;
  amount: Money;
  daysOverdue: number;
}

export interface MandateFailedPayload {
  mandateId: MandateId;
  paymentId: PaymentId;
  mandateState: 'active' | 'paused' | 'cancelled' | 'expired' | 'unknown';
  reasonCode: FailureReasonCode;
}

export interface CustomerRespondedPayload {
  message: string;
  channel: 'email' | 'sms' | 'whatsapp' | 'voice' | 'other';
  relatedCaseId?: CaseId;
}

export interface PromiseCreatedPayload {
  promiseId: string;
  amount: Money;
  promisedAt: IsoTimestamp;
  // Raw customer statement the promise was extracted from.
  sourceText?: string;
}

export interface PromiseDuePayload {
  promiseId: string;
  dueAt: IsoTimestamp;
}

export interface PromiseBrokenPayload {
  promiseId: string;
  brokenAt: IsoTimestamp;
}

export interface PromiseFulfilledPayload {
  promiseId: string;
  amount: Money;
  fulfilledAt: IsoTimestamp;
}

export type RevenueEventPayload =
  | { type: 'payment.failed'; data: PaymentFailedPayload }
  | { type: 'payment.succeeded'; data: PaymentSucceededPayload }
  | { type: 'checkout.abandoned'; data: CheckoutAbandonedPayload }
  | { type: 'subscription.renewal_failed'; data: SubscriptionRenewalFailedPayload }
  | { type: 'invoice.overdue'; data: InvoiceOverduePayload }
  | { type: 'mandate.failed'; data: MandateFailedPayload }
  | { type: 'customer.responded'; data: CustomerRespondedPayload }
  | { type: 'promise.created'; data: PromiseCreatedPayload }
  | { type: 'promise.due'; data: PromiseDuePayload }
  | { type: 'promise.broken'; data: PromiseBrokenPayload }
  | { type: 'promise.fulfilled'; data: PromiseFulfilledPayload };

export interface RevenueEvent {
  id: RevenueEventId;
  customerId: CustomerId;
  type: RevenueEventType;
  occurredAt: IsoTimestamp;
  // Source provider/system — e.g. 'razorpay', 'batch-simulator'.
  source: string;
  // Original event id from source
  externalId?: string;
  // Amount-at-risk derived from payload
  amountAtRisk?: Money;
  payload: RevenueEventPayload;
}
