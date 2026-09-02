import type { RecoveryActionType } from "@recovery/types";
import type { AgentRecommendation } from "../../state.js";

export type SubscriptionFailureClassification =
  | "card_expired"
  | "insufficient_funds"
  | "bank_decline"
  | "authentication_required"
  | "mandate_failure"
  | "provider_degradation"
  | "unknown";

export interface SubscriptionRecoveryFacts {
  caseId: string;
  amountAtRiskMinor: number;
  currency: string;
  subscriptionId?: string;
  planId?: string;
  billingCycle?: "monthly" | "quarterly" | "annual";
  failureReason?: string;
  tenureMonths: number;
  previousSuccessfulRenewals: number;
  failedRenewalCount: number;
  gracePeriodDaysRemaining?: number;
  mrrMinor?: number;
  estimatedLtvMinor?: number;
  customerOptedOut: boolean;
  attemptCount: number;
  recentActionCount: number;
  recoveryProbabilityHint?: number;
}

export interface SubscriptionRecoveryAnalysis {
  observations: string[];
  rootCause: string;
  classification: SubscriptionFailureClassification;
  recoveryProbability: number;
  expectedRecoverableMinor: number;
  revenueAtRiskMinor: number;
  recommendation: AgentRecommendation;
  shouldRecordRecoveryOnExecution: boolean;
}

const HIGH_VALUE_MINOR = 50_000_000; // ₹5,00,000 in minor paise

function clampProbability(value: number): number {
  return Math.min(0.95, Math.max(0.05, Number(value.toFixed(3))));
}

function parseBoolean(value: string | undefined): boolean {
  return value === "true";
}

function parseNumber(value: string | undefined): number | undefined {
  if (value === undefined || value.length === 0) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseFactLine(fact: string): [string, string] | null {
  const idx = fact.indexOf("=");
  if (idx === -1) return null;
  return [fact.slice(0, idx), fact.slice(idx + 1)];
}

export function parseSubscriptionRecoveryFacts(
  facts: readonly string[],
): SubscriptionRecoveryFacts {
  const map = new Map<string, string>();
  for (const f of facts) {
    const parsed = parseFactLine(f);
    if (parsed) map.set(parsed[0], parsed[1]);
  }

  const amount = parseNumber(map.get("amount_minor")) ?? 0;
  const tenure =
    parseNumber(map.get("tenure_months")) ??
    parseNumber(map.get("customer_tenure_months")) ??
    0;
  const successfulRenewals =
    parseNumber(map.get("previous_successful_renewals")) ??
    parseNumber(map.get("customer_successful_payments")) ??
    0;
  const failedRenewals =
    parseNumber(map.get("failed_renewal_count")) ??
    parseNumber(map.get("customer_failed_payments")) ??
    0;

  return {
    caseId: map.get("case_id") ?? "unknown",
    amountAtRiskMinor: amount,
    currency: map.get("currency") ?? "INR",
    subscriptionId: map.get("subscription_id"),
    planId: map.get("plan_id"),
    billingCycle: map.get("billing_cycle") as
      | "monthly"
      | "quarterly"
      | "annual"
      | undefined,
    failureReason: map.get("failure_reason"),
    tenureMonths: tenure,
    previousSuccessfulRenewals: successfulRenewals,
    failedRenewalCount: failedRenewals,
    gracePeriodDaysRemaining: parseNumber(
      map.get("grace_period_days_remaining"),
    ),
    mrrMinor: parseNumber(map.get("mrr_minor")),
    estimatedLtvMinor: parseNumber(map.get("estimated_ltv_minor")),
    customerOptedOut: parseBoolean(map.get("customer_opted_out")),
    attemptCount: parseNumber(map.get("attempt_count")) ?? 1,
    recentActionCount: parseNumber(map.get("recent_action_count")) ?? 0,
    recoveryProbabilityHint: parseNumber(map.get("recovery_probability_hint")),
  };
}

function classify(
  facts: SubscriptionRecoveryFacts,
): SubscriptionFailureClassification {
  const reason = (facts.failureReason ?? "").toLowerCase();

  if (reason.includes("card_expired") || reason.includes("expired_card")) {
    return "card_expired";
  }
  if (reason.includes("insufficient_funds") || reason.includes("low_balance")) {
    return "insufficient_funds";
  }
  if (
    reason.includes("bank_decline") ||
    reason.includes("decline") ||
    reason.includes("do_not_honor")
  ) {
    return "bank_decline";
  }
  if (
    reason.includes("authentication_required") ||
    reason.includes("3ds") ||
    reason.includes("otp") ||
    reason.includes("auth")
  ) {
    return "authentication_required";
  }
  if (
    reason.includes("mandate_inactive") ||
    reason.includes("mandate_failed") ||
    reason.includes("mandate")
  ) {
    return "mandate_failure";
  }
  if (
    reason.includes("provider_degradation") ||
    reason.includes("network_error") ||
    reason.includes("gateway_timeout")
  ) {
    return "provider_degradation";
  }

  return "unknown";
}

function estimateRecoveryProbability(
  facts: SubscriptionRecoveryFacts,
  classification: SubscriptionFailureClassification,
): number {
  if (facts.customerOptedOut) return 0.05;
  if (typeof facts.recoveryProbabilityHint === "number") {
    return clampProbability(facts.recoveryProbabilityHint);
  }

  let prob = 0.5;

  // Tenure effect: long-term subscribers have much lower voluntary churn propensity
  if (facts.tenureMonths >= 24) prob += 0.2;
  else if (facts.tenureMonths >= 12) prob += 0.15;
  else if (facts.tenureMonths >= 6) prob += 0.08;
  else if (facts.tenureMonths >= 3) prob += 0.04;

  // Historical renewals track record
  if (facts.previousSuccessfulRenewals >= 12 && facts.failedRenewalCount <= 1) {
    prob += 0.15;
  } else if (
    facts.previousSuccessfulRenewals >= 6 &&
    facts.failedRenewalCount <= 1
  ) {
    prob += 0.1;
  } else if (facts.previousSuccessfulRenewals >= 3) {
    prob += 0.05;
  }

  // Classification specific baseline expectations
  switch (classification) {
    case "card_expired":
      // Customers with expired cards generally want to keep the service and easily update cards
      prob += 0.12;
      break;
    case "provider_degradation":
      // Transient provider issue — high probability of recovery once resolved
      prob += 0.15;
      break;
    case "authentication_required":
      prob += 0.06;
      break;
    case "insufficient_funds":
      prob -= 0.06;
      break;
    case "bank_decline":
      prob -= 0.1;
      break;
    case "mandate_failure":
      prob -= 0.08;
      break;
    case "unknown":
      prob -= 0.15;
      break;
  }

  // Repeated failures penalize probability
  if (facts.failedRenewalCount > 0) {
    prob -= 0.07 * Math.min(facts.failedRenewalCount, 4);
  }

  // Grace period urgency
  if (
    typeof facts.gracePeriodDaysRemaining === "number" &&
    facts.gracePeriodDaysRemaining <= 1
  ) {
    prob -= 0.1;
  }

  return clampProbability(prob);
}

function chooseAction(
  facts: SubscriptionRecoveryFacts,
  classification: SubscriptionFailureClassification,
  probability: number,
): {
  actionType: RecoveryActionType;
  parameters: Record<string, string | number | boolean>;
} {
  if (facts.customerOptedOut) {
    return {
      actionType: "stop_case",
      parameters: { reason: "customer opted out of recovery communications" },
    };
  }

  // High value accounts with uncertainty or repeated failures get human escalation
  if (
    facts.amountAtRiskMinor >= HIGH_VALUE_MINOR &&
    (probability < 0.6 || facts.recentActionCount >= 2)
  ) {
    return {
      actionType: "escalate_to_human",
      parameters: {
        reason: `high-value subscription (${facts.amountAtRiskMinor} ${facts.currency}) renewal recovery requires account manager intervention`,
        escalationTier: "account_manager",
      },
    };
  }

  const stage = facts.recentActionCount;

  switch (classification) {
    case "card_expired":
      if (stage === 0) {
        return {
          actionType: "request_payment_method_update",
          parameters: {
            channel: "email",
            direction: "03_failed_subscription",
            classification,
          },
        };
      }
      if (stage === 1) {
        return {
          actionType: "send_email",
          parameters: {
            template: "subscription-card-expired-reminder",
            body: "Your card has expired. Please update your payment method to keep your subscription active.",
          },
        };
      }
      return {
        actionType: "escalate_to_human",
        parameters: {
          reason: "customer has not updated expired card after notification",
          escalationTier: "operator",
        },
      };

    case "insufficient_funds":
      if (stage === 0) {
        // Schedule delayed retry in 24-48 hours
        const scheduledDate = new Date(
          Date.now() + 48 * 3600 * 1000,
        ).toISOString();
        return {
          actionType: "schedule_retry",
          parameters: {
            scheduledFor: scheduledDate,
            direction: "03_failed_subscription",
            classification,
          },
        };
      }
      if (stage === 1) {
        return {
          actionType: "send_email",
          parameters: {
            template: "subscription-payment-retry-notice",
            body: "We could not process your renewal payment. A scheduled retry will take place shortly.",
          },
        };
      }
      if (stage === 2) {
        return {
          actionType: "send_payment_link",
          parameters: {
            amountMinor: facts.amountAtRiskMinor,
            currency: facts.currency,
            channel: "email",
          },
        };
      }
      return {
        actionType: "stop_case",
        parameters: {
          reason: "insufficient funds retry ladder exhausted",
        },
      };

    case "bank_decline":
      if (stage === 0) {
        const scheduledDate = new Date(
          Date.now() + 24 * 3600 * 1000,
        ).toISOString();
        return {
          actionType: "schedule_retry",
          parameters: {
            scheduledFor: scheduledDate,
            direction: "03_failed_subscription",
            classification,
          },
        };
      }
      if (stage === 1) {
        return {
          actionType: "send_payment_link",
          parameters: {
            amountMinor: facts.amountAtRiskMinor,
            currency: facts.currency,
            channel: "email",
          },
        };
      }
      return {
        actionType: "escalate_to_human",
        parameters: {
          reason: "repeated bank decline on subscription recurring charge",
          escalationTier: "operator",
        },
      };

    case "authentication_required":
      if (stage === 0) {
        return {
          actionType: "send_payment_link",
          parameters: {
            amountMinor: facts.amountAtRiskMinor,
            currency: facts.currency,
            channel: "email",
          },
        };
      }
      if (stage === 1) {
        return {
          actionType: "send_email",
          parameters: {
            template: "subscription-authentication-required",
            body: "Your bank requires one-time authentication to continue your subscription.",
          },
        };
      }
      return {
        actionType: "escalate_to_human",
        parameters: {
          reason: "customer authentication not completed for recurring renewal",
          escalationTier: "operator",
        },
      };

    case "mandate_failure":
      if (stage === 0) {
        return {
          actionType: "send_payment_link",
          parameters: {
            amountMinor: facts.amountAtRiskMinor,
            currency: facts.currency,
            channel: "email",
          },
        };
      }
      if (stage === 1) {
        return {
          actionType: "request_payment_method_update",
          parameters: {
            channel: "email",
            direction: "03_failed_subscription",
            classification,
          },
        };
      }
      return {
        actionType: "escalate_to_human",
        parameters: {
          reason:
            "mandate failure requires manual intervention or alternative payment method",
          escalationTier: "operator",
        },
      };

    case "provider_degradation":
      return {
        actionType: "schedule_retry",
        parameters: {
          scheduledFor: new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
          direction: "03_failed_subscription",
          classification,
        },
      };

    default:
      if (stage === 0) {
        return {
          actionType: "send_email",
          parameters: {
            template: "subscription-renewal-problem",
            body: "There was a problem renewing your subscription. Please check your payment details.",
          },
        };
      }
      return {
        actionType: "escalate_to_human",
        parameters: {
          reason: "unclassified recurring subscription renewal failure",
          escalationTier: "operator",
        },
      };
  }
}

function shouldRecordRecoveryOnExecution(
  actionType: RecoveryActionType,
): boolean {
  return actionType === "retry_payment" || actionType === "send_payment_link";
}

export function analyzeSubscriptionRecovery(
  facts: SubscriptionRecoveryFacts,
): SubscriptionRecoveryAnalysis {
  const classification = classify(facts);
  const probability = estimateRecoveryProbability(facts, classification);
  const expectedRecoverableMinor = Math.round(
    facts.amountAtRiskMinor * probability,
  );
  const action = chooseAction(facts, classification, probability);

  const observations = [
    `direction_03:classification=${classification}`,
    `direction_03:recovery_probability=${probability.toFixed(3)}`,
    `direction_03:expected_recoverable_minor=${expectedRecoverableMinor}`,
    `direction_03:tenure_months=${facts.tenureMonths}`,
    `direction_03:successful_renewals=${facts.previousSuccessfulRenewals}`,
    `direction_03:failed_renewals=${facts.failedRenewalCount}`,
  ];

  if (facts.subscriptionId) {
    observations.push(`direction_03:subscription_id=${facts.subscriptionId}`);
  }
  if (facts.planId) {
    observations.push(`direction_03:plan_id=${facts.planId}`);
  }
  if (facts.billingCycle) {
    observations.push(`direction_03:billing_cycle=${facts.billingCycle}`);
  }
  if (typeof facts.gracePeriodDaysRemaining === "number") {
    observations.push(
      `direction_03:grace_period_days_remaining=${facts.gracePeriodDaysRemaining}`,
    );
  }
  if (typeof facts.mrrMinor === "number") {
    observations.push(`direction_03:mrr_minor=${facts.mrrMinor}`);
  }
  if (typeof facts.estimatedLtvMinor === "number") {
    observations.push(
      `direction_03:estimated_ltv_minor=${facts.estimatedLtvMinor}`,
    );
  }

  const rootCause = [
    `Subscription renewal payment failure classified as ${classification}.`,
    facts.tenureMonths > 0
      ? `Customer has ${facts.tenureMonths} months tenure with ${facts.previousSuccessfulRenewals} successful renewals.`
      : "New or low-tenure subscription customer.",
    facts.failedRenewalCount > 0
      ? `Encountered ${facts.failedRenewalCount} prior renewal failures.`
      : "No prior renewal failure history.",
    `Selected ${action.actionType} on recovery ladder to prevent involuntary churn and protect recurring revenue.`,
  ].join(" ");

  const rationale = [
    rootCause,
    `Selected ${action.actionType} with expected recoverable value ${expectedRecoverableMinor} minor units (probability: ${probability.toFixed(3)}).`,
  ].join(" ");

  return {
    observations,
    rootCause,
    classification,
    recoveryProbability: probability,
    expectedRecoverableMinor,
    revenueAtRiskMinor: facts.amountAtRiskMinor,
    recommendation: {
      actionType: action.actionType,
      parameters: action.parameters,
      expectedOutcomeMinor: expectedRecoverableMinor,
      confidence: probability,
      rationale,
    },
    shouldRecordRecoveryOnExecution: shouldRecordRecoveryOnExecution(
      action.actionType,
    ),
  };
}

export function reasonOverSubscriptionRecoveryFacts(
  facts: readonly string[],
): SubscriptionRecoveryAnalysis | null {
  const hasDirection03 = facts.some(
    (f) =>
      f === "direction=03_failed_subscription" ||
      f === "event_type=subscription.renewal_failed" ||
      f.startsWith("direction_03:"),
  );

  if (!hasDirection03) return null;

  const parsed = parseSubscriptionRecoveryFacts(facts);
  return analyzeSubscriptionRecovery(parsed);
}
