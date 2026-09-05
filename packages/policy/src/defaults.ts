import type {
  CommunicationLimits,
  EscalationRules,
  FinancialLimits,
  RetryLimits,
  StopRules,
} from "@recovery/types";

export const DEFAULT_POLICY_NAME = "Default Recovery Policy";

// ₹50,000.00 in paise = 5,000,000 minor units (bigint for safe DB write).
export const DEFAULT_HIGH_VALUE_APPROVAL_THRESHOLD_MINOR = 5_000_000n;

export const DEFAULT_RETRY_LIMITS: RetryLimits = {
  maxPaymentRetries: 3,
  minRetryIntervalSeconds: 3600,
  maxCaseAgeSeconds: 30 * 86400,
};

export const DEFAULT_COMMUNICATION_LIMITS: CommunicationLimits = {
  maxMessages: 5,
  minMessageIntervalSeconds: 86400,
  allowedChannels: ["email", "sms", "whatsapp", "voice"],
};

export const DEFAULT_FINANCIAL_LIMITS: FinancialLimits = {
  highValueApprovalThreshold: {
    amountMinor: Number(DEFAULT_HIGH_VALUE_APPROVAL_THRESHOLD_MINOR),
    currency: "INR",
  },
  maxDiscountMinor: 0,
  maxPlanDurationDays: 90,
};

export const DEFAULT_ESCALATION_RULES: EscalationRules = {
  escalateOnRepeatedFailure: 2,
  escalateOnBrokenPromise: true,
  escalateOnDispute: true,
  escalateOnHighValue: true,
};

export const DEFAULT_STOP_RULES: StopRules = {
  stopOnOptOut: true,
  stopOnCancel: true,
  stopOnMaxAttempts: true,
  stopOnHumanTakeover: true,
};

export const DEFAULT_POLICY_LIMITS = {
  retry: DEFAULT_RETRY_LIMITS,
  communication: DEFAULT_COMMUNICATION_LIMITS,
  financial: DEFAULT_FINANCIAL_LIMITS,
  escalation: DEFAULT_ESCALATION_RULES,
  stop: DEFAULT_STOP_RULES,
} as const;
