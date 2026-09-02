import { z } from "zod";

export const runModeSchema = z.enum(["AGENT_CONTROLLED", "MANUAL"]);

export const toolChannelSchema = z.enum(["email", "sms", "whatsapp", "voice"]);

export const toolEscalationTierSchema = z.enum([
  "operator",
  "account_manager",
  "security",
]);

export const toolPromiseTypeSchema = z.enum([
  "firm",
  "tentative",
  "conditional",
  "informational",
]);

export const sendEmailInputSchema = z.object({
  customerId: z.uuid(),
  caseId: z.uuid(),
  template: z.string().min(1).max(120),
  body: z.string().min(1).max(2000).optional(),
});

export const sendSmsInputSchema = z.object({
  customerId: z.uuid(),
  caseId: z.uuid(),
  template: z.string().min(1).max(120),
  body: z.string().min(1).max(2000).optional(),
});

export const sendWhatsappInputSchema = z.object({
  customerId: z.uuid(),
  caseId: z.uuid(),
  template: z.string().min(1).max(120),
  body: z.string().min(1).max(2000).optional(),
});

export const retryPaymentInputSchema = z.object({
  customerId: z.uuid(),
  caseId: z.uuid(),
  paymentId: z.string().min(1).optional(),
});

export const scheduleRetryInputSchema = z.object({
  customerId: z.uuid(),
  caseId: z.uuid(),
  scheduledFor: z.iso.datetime(),
  paymentId: z.string().min(1).optional(),
});

export const sendPaymentLinkInputSchema = z.object({
  customerId: z.uuid(),
  caseId: z.uuid(),
  amountMinor: z.number().int().positive(),
  currency: z.string().min(3).max(3),
  channel: toolChannelSchema.optional(),
});

export const sendResumeCheckoutLinkInputSchema = z.object({
  customerId: z.uuid(),
  caseId: z.uuid(),
  lastSeenPage: z.string().optional(),
  channel: toolChannelSchema.optional(),
});

export const requestPaymentMethodUpdateInputSchema = z.object({
  customerId: z.uuid(),
  caseId: z.uuid(),
  channel: toolChannelSchema,
});

export const recordPromiseInputSchema = z.object({
  customerId: z.uuid(),
  caseId: z.uuid(),
  promisedMinor: z.number().int().positive(),
  currency: z.string().min(3).max(3),
  dueAt: z.iso.datetime(),
  promiseType: toolPromiseTypeSchema,
});

export const escalateToHumanInputSchema = z.object({
  caseId: z.uuid(),
  reason: z.string().min(1).max(500),
  escalationTier: toolEscalationTierSchema,
});

export const stopCaseInputSchema = z.object({
  caseId: z.uuid(),
  reason: z.string().min(1).max(500),
});

// New tool input schemas for retrieval and case creation
export const retrieveCustomerInputSchema = z.object({
  caseId: z.uuid(),
  customerId: z.uuid(),
});

export const retrievePaymentInputSchema = z.object({
  caseId: z.uuid(),
  paymentId: z.uuid(),
});

export const retrieveSubscriptionInputSchema = z.object({
  caseId: z.uuid(),
  subscriptionId: z.uuid(),
});

export const createRecoveryCaseInputSchema = z.object({
  customerId: z.uuid(),
  direction: z.string().min(1), // direction code like "01_payment_degradation"
  amountAtRiskMinor: z.number().int().positive(),
  currency: z.string().min(3).max(3),
});

export const scheduleRecoveryActionInputSchema = z.object({
  caseId: z.uuid(),
  actionType: z.string().min(1), // matches registered tool name
  scheduledFor: z.iso.datetime().optional(),
  payload: z.any().optional(),
});


export const analyzeCaseSchema = z.object({
  actor: z.string().min(1).max(120).optional(),
});

export const recoverCaseSchema = z.object({
  mode: runModeSchema,
  actor: z.string().min(1).max(120).optional(),
});

export const approveDecisionSchema = z.object({
  actor: z.string().min(1).max(120),
  reason: z.string().max(500).optional(),
});

export const rejectDecisionSchema = z.object({
  actor: z.string().min(1).max(120),
  reason: z.string().min(1).max(500),
});

export const listDecisionsQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(200).optional(),
    offset: z.coerce.number().int().nonnegative().optional(),
    status: z
      .enum([
        "pending",
        "awaiting_approval",
        "approved",
        "rejected",
        "executed",
        "failed",
        "stopped",
      ])
      .optional(),
  })
  .transform((q) => ({
    limit: q.limit ?? 50,
    offset: q.offset ?? 0,
    status: q.status,
  }));
