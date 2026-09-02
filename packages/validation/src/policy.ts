import { z } from "zod";

export const policyDecisionSchema = z.enum(["allow", "deny", "require_approval"]);

export const recoveryActionTypeSchema = z.enum([
  "retry_payment",
  "send_payment_link",
  "send_resume_checkout_link",
  "send_email",
  "send_sms",
  "send_whatsapp",
  "start_voice_call",
  "request_payment_method_update",
  "record_promise",
  "escalate_to_human",
  "stop_case",
  "schedule_retry",
]);

export const recoveryDirectionSchema = z.enum([
  "01_payment_degradation",
  "02_checkout_dropoff",
  "03_failed_subscription",
  "04_b2b_receivables",
  "05_mandate_retry",
  "06_hinglish_voice",
  "07_promise_to_pay",
]);

const channelSchema = z.enum(["email", "sms", "whatsapp", "voice"]);

export const retryLimitsSchema = z.object({
  maxPaymentRetries: z.number().int().nonnegative(),
  minRetryIntervalSeconds: z.number().int().nonnegative(),
  maxCaseAgeSeconds: z.number().int().nonnegative(),
});

export const communicationLimitsSchema = z.object({
  maxMessages: z.number().int().nonnegative(),
  minMessageIntervalSeconds: z.number().int().nonnegative(),
  allowedChannels: z.array(channelSchema).min(1),
  callWindowStartHour: z.number().int().min(0).max(23).optional(),
  callWindowEndHour: z.number().int().min(0).max(23).optional(),
});

export const financialLimitsSchema = z.object({
  highValueApprovalThreshold: z.object({
    amountMinor: z.number().int().nonnegative(),
    currency: z.string().min(3).max(3),
  }),
  maxDiscountMinor: z.number().int().nonnegative(),
  maxPlanDurationDays: z.number().int().nonnegative(),
});

export const escalationRulesSchema = z.object({
  escalateOnRepeatedFailure: z.number().int().nonnegative(),
  escalateOnBrokenPromise: z.boolean(),
  escalateOnDispute: z.boolean(),
  escalateOnHighValue: z.boolean(),
});

export const stopRulesSchema = z.object({
  stopOnOptOut: z.boolean(),
  stopOnCancel: z.boolean(),
  stopOnMaxAttempts: z.boolean(),
  stopOnHumanTakeover: z.boolean(),
});

export const policyLimitsSchema = z.object({
  retry: retryLimitsSchema,
  communication: communicationLimitsSchema,
  financial: financialLimitsSchema,
  escalation: escalationRulesSchema,
  stop: stopRulesSchema,
});

export const partialPolicyLimitsSchema = z.object({
  retry: retryLimitsSchema.partial().optional(),
  communication: communicationLimitsSchema.partial().optional(),
  financial: financialLimitsSchema.partial().optional(),
  escalation: escalationRulesSchema.partial().optional(),
  stop: stopRulesSchema.partial().optional(),
});

export const createPolicySchema = z.object({
  name: z.string().min(1).max(200),
  applicableDirections: z.array(recoveryDirectionSchema).optional(),
  enabled: z.boolean().optional(),
  highValueApprovalThresholdMinor: z.number().int().nonnegative().optional(),
  currency: z.string().min(3).max(3).optional(),
  limits: policyLimitsSchema,
});

export const patchPolicySchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    applicableDirections: z.array(recoveryDirectionSchema).optional(),
    enabled: z.boolean().optional(),
    highValueApprovalThresholdMinor: z.number().int().nonnegative().optional(),
    currency: z.string().min(3).max(3).optional(),
    limits: partialPolicyLimitsSchema.optional(),
  })
  .strict();

export const activatePolicySchema = z.object({
  enabled: z.boolean(),
});

export const listPoliciesQuerySchema = z
  .object({
    enabled: z
      .union([z.literal("true"), z.literal("false")])
      .transform((v) => v === "true")
      .optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(200).optional(),
    offset: z.coerce.number().int().nonnegative().optional(),
  })
  .transform((q) => {
    const limit = q.limit ?? 50;
    const page = q.page ?? 1;
    const offset = q.offset ?? (page - 1) * limit;
    return { enabled: q.enabled, limit, offset, page };
  });

export const evaluatePolicySchema = z.object({
  proposedActionType: recoveryActionTypeSchema,
  proposedAmountMinor: z.number().int().nonnegative().optional(),
});

export const policyRequiresApprovalFromSchema = z.enum([
  "operator",
  "account_manager",
  "human",
]);
