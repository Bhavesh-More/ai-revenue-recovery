import { z } from "zod";

export const revenueEventType = z.enum([
  "payment.failed",
  "payment.succeeded",
  "checkout.abandoned",
  "subscription.renewal_failed",
  "invoice.overdue",
  "mandate.failed",
  "customer.responded",
  "promise.created",
  "promise.due",
  "promise.broken",
  "promise.fulfilled",
]);

export const failureReasonCode = z.enum([
  "card_expired",
  "insufficient_funds",
  "bank_decline",
  "authentication_required",
  "network_error",
  "mandate_inactive",
  "provider_degradation",
  "unknown",
]);

export const mandateState = z.enum([
  "active",
  "paused",
  "cancelled",
  "expired",
  "unknown",
]);

export const isoTimestamp = z.iso.datetime({ offset: true });

const baseFields = z.object({
  customerId: z.uuid(),
  amountAtRiskMinor: z.number().int().nonnegative().optional(),
  currency: z.string().min(3).max(3).default("INR"),
});

export const paymentFailedSchema = baseFields.extend({
  type: z.literal("payment.failed"),
  paymentId: z.string().min(1),
  attemptCount: z.number().int().nonnegative().default(1),
  failureReason: failureReasonCode.optional(),
  provider: z.string().optional(),
  providerCode: z.string().optional(),
  paymentMethod: z.string().optional(),
  bank: z.string().optional(),
  region: z.string().optional(),
  baselineSuccessRate: z.number().min(0).max(1).optional(),
  currentSuccessRate: z.number().min(0).max(1).optional(),
  similarFailureCount: z.number().int().nonnegative().optional(),
  affectedCustomerCount: z.number().int().nonnegative().optional(),
  timeWindowMinutes: z.number().int().positive().optional(),
});

export const paymentSucceededSchema = baseFields.extend({
  type: z.literal("payment.succeeded"),
  paymentId: z.string().min(1),
});

export const checkoutAbandonedSchema = baseFields.extend({
  type: z.literal("checkout.abandoned"),
  checkoutSessionId: z.string().min(1),
  lastStep: z.enum(["cart", "address", "payment", "review"]).optional(),
  abandonmentDurationMinutes: z.number().int().nonnegative().optional(),
  cartValueMinor: z.number().int().nonnegative().optional(),
  shippingCostMinor: z.number().int().nonnegative().optional(),
  technicalErrorsCount: z.number().int().nonnegative().optional(),
  intentScore: z.number().min(0).max(1).optional(),
  previousAbandonedCount: z.number().int().nonnegative().optional(),
});

export const subscriptionRenewalFailedSchema = baseFields.extend({
  type: z.literal("subscription.renewal_failed"),
  subscriptionId: z.string().min(1),
  failureReason: failureReasonCode.optional(),
});

export const invoiceOverdueSchema = baseFields.extend({
  type: z.literal("invoice.overdue"),
  invoiceId: z.string().min(1),
  daysOverdue: z.number().int().nonnegative(),
});

export const mandateFailedSchema = baseFields.extend({
  type: z.literal("mandate.failed"),
  mandateId: z.string().min(1),
  mandateState: mandateState.optional(),
  failureReason: failureReasonCode.optional(),
});

export const customerRespondedSchema = z.object({
  type: z.literal("customer.responded"),
  channel: z.enum(["email", "sms", "whatsapp", "voice"]),
  message: z.string().min(1),
});

export const promiseCreatedSchema = baseFields.extend({
  type: z.literal("promise.created"),
  promiseId: z.string().min(1),
  promisedMinor: z.number().int().nonnegative(),
  promiseDate: isoTimestamp,
});

export const promiseDueSchema = z.object({
  type: z.literal("promise.due"),
  promiseId: z.string().min(1),
});

export const promiseBrokenSchema = z.object({
  type: z.literal("promise.broken"),
  promiseId: z.string().min(1),
});

export const promiseFulfilledSchema = baseFields.extend({
  type: z.literal("promise.fulfilled"),
  promiseId: z.string().min(1),
  amountMinor: z.number().int().nonnegative(),
});

export const revenueEventSchema = z.discriminatedUnion("type", [
  paymentFailedSchema,
  paymentSucceededSchema,
  checkoutAbandonedSchema,
  subscriptionRenewalFailedSchema,
  invoiceOverdueSchema,
  mandateFailedSchema,
  customerRespondedSchema,
  promiseCreatedSchema,
  promiseDueSchema,
  promiseBrokenSchema,
  promiseFulfilledSchema,
]);

export const ingestEventInputSchema = z.object({
  source: z.string().min(1),
  externalId: z.string().min(1),
  customerId: z.uuid(),
  occurredAt: isoTimestamp.optional(),
  payload: revenueEventSchema,
  amountAtRiskMinorOverride: z.number().int().nonnegative().optional(),
  riskTier: z.enum(["low", "medium", "high", "critical"]).optional(),
  actor: z.string().optional(),
});

export type IngestEventInput = z.infer<typeof ingestEventInputSchema>;
export type RevenueEventPayload = z.infer<typeof revenueEventSchema>;
