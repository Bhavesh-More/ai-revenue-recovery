import type { RecoveryActionType } from "@recovery/types";
import type { AgentRecommendation } from "../../state.js";

export type MandateFailureClassification =
  | "temporary_bank_failure"
  | "insufficient_funds"
  | "authentication_required"
  | "mandate_inactive_or_expired"
  | "permanent_decline"
  | "systemic_degradation"
  | "unknown";

export interface MandateRetryFacts {
  caseId: string;
  amountAtRiskMinor: number;
  currency: string;
  mandateId?: string;
  subscriptionId?: string;
  mandateState?: "active" | "inactive" | "expired" | "revoked" | "cancelled" | "pending";
  failureReason?: string;
  bank?: string;
  provider?: string;
  consecutiveFailures: number;
  successfulDebitsCount: number;
  bankDegradationHint?: number;
  customerOptedOut: boolean;
  attemptCount: number;
  recentActionCount: number;
  recoveryProbabilityHint?: number;
}

export interface MandateRetryAnalysis {
  observations: string[];
  rootCause: string;
  classification: MandateFailureClassification;
  recoveryProbability: number;
  expectedRecoverableMinor: number;
  revenueAtRiskMinor: number;
  recommendation: AgentRecommendation;
  shouldRecordRecoveryOnExecution: boolean;
}

const HIGH_VALUE_MANDATE_MINOR = 50_000_000; // ₹5,00,000 in minor units (paise)

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

export function parseMandateRetryFacts(
  facts: readonly string[],
): MandateRetryFacts {
  const map = new Map<string, string>();
  for (const f of facts) {
    const parsed = parseFactLine(f);
    if (parsed) map.set(parsed[0], parsed[1]);
  }

  const amount = parseNumber(map.get("amount_minor")) ?? 0;
  const consecutiveFailures =
    parseNumber(map.get("consecutive_failures")) ??
    parseNumber(map.get("failed_renewal_count")) ??
    0;
  const successfulDebits =
    parseNumber(map.get("successful_debits_count")) ??
    parseNumber(map.get("customer_successful_payments")) ??
    0;

  return {
    caseId: map.get("case_id") ?? "unknown",
    amountAtRiskMinor: amount,
    currency: map.get("currency") ?? "INR",
    mandateId: map.get("mandate_id"),
    subscriptionId: map.get("subscription_id"),
    mandateState: map.get("mandate_state") as
      | "active"
      | "inactive"
      | "expired"
      | "revoked"
      | "cancelled"
      | "pending"
      | undefined,
    failureReason: map.get("failure_reason"),
    bank: map.get("bank"),
    provider: map.get("provider"),
    consecutiveFailures,
    successfulDebitsCount: successfulDebits,
    bankDegradationHint: parseNumber(map.get("bank_degradation_hint")),
    customerOptedOut: parseBoolean(map.get("customer_opted_out")),
    attemptCount: parseNumber(map.get("attempt_count")) ?? 1,
    recentActionCount: parseNumber(map.get("recent_action_count")) ?? 0,
    recoveryProbabilityHint: parseNumber(map.get("recovery_probability_hint")),
  };
}

function classify(facts: MandateRetryFacts): MandateFailureClassification {
  const state = (facts.mandateState ?? "").toLowerCase();
  const reason = (facts.failureReason ?? "").toLowerCase();

  if (
    state === "inactive" ||
    state === "expired" ||
    state === "revoked" ||
    state === "cancelled" ||
    reason.includes("mandate_invalid") ||
    reason.includes("mandate_inactive") ||
    reason.includes("mandate_revoked")
  ) {
    return "mandate_inactive_or_expired";
  }

  if (
    (typeof facts.bankDegradationHint === "number" && facts.bankDegradationHint > 0.08) ||
    reason.includes("gateway_timeout") ||
    reason.includes("bank_down") ||
    reason.includes("provider_degradation")
  ) {
    return "systemic_degradation";
  }

  if (reason.includes("insufficient_funds") || reason.includes("low_balance")) {
    return "insufficient_funds";
  }

  if (
    reason.includes("authentication_required") ||
    reason.includes("3ds") ||
    reason.includes("auth") ||
    reason.includes("otp")
  ) {
    return "authentication_required";
  }

  if (
    reason.includes("account_closed") ||
    reason.includes("stolen_card") ||
    reason.includes("do_not_honor") ||
    reason.includes("permanent_decline")
  ) {
    return "permanent_decline";
  }

  if (
    reason.includes("bank_decline") ||
    reason.includes("network_error") ||
    reason.includes("temporary_decline")
  ) {
    return "temporary_bank_failure";
  }

  return "unknown";
}

function estimateRecoveryProbability(
  facts: MandateRetryFacts,
  classification: MandateFailureClassification,
): number {
  if (facts.customerOptedOut) return 0.05;
  if (typeof facts.recoveryProbabilityHint === "number") {
    return clampProbability(facts.recoveryProbabilityHint);
  }

  let prob = 0.6;

  // Active mandate with strong history
  if (
    (facts.mandateState === "active" || facts.mandateState === undefined) &&
    facts.successfulDebitsCount >= 6
  ) {
    prob += 0.2;
  } else if (facts.successfulDebitsCount >= 3) {
    prob += 0.1;
  }

  // Classification specific weighting
  switch (classification) {
    case "mandate_inactive_or_expired":
      prob -= 0.45; // Must reauthorize mandate before payment can be collected
      break;
    case "systemic_degradation":
      prob += 0.1; // High probability once bank system comes back online
      break;
    case "temporary_bank_failure":
      prob += 0.05;
      break;
    case "authentication_required":
      prob += 0.05;
      break;
    case "insufficient_funds":
      prob -= 0.08;
      break;
    case "permanent_decline":
      prob -= 0.4;
      break;
    case "unknown":
      prob -= 0.15;
      break;
  }

  // Consecutive failures penalty
  if (facts.consecutiveFailures > 0) {
    prob -= Math.min(0.35, facts.consecutiveFailures * 0.1);
  }

  return clampProbability(prob);
}

function chooseAction(
  facts: MandateRetryFacts,
  classification: MandateFailureClassification,
  probability: number,
): {
  actionType: RecoveryActionType;
  parameters: Record<string, string | number | boolean>;
} {
  if (facts.customerOptedOut) {
    return {
      actionType: "stop_case",
      parameters: { reason: "customer opted out of mandate recovery communications" },
    };
  }

  // Inactive or revoked mandate — SAFETY RULE: never attempt debit, demand reauthorization
  if (classification === "mandate_inactive_or_expired") {
    return {
      actionType: "request_payment_method_update",
      parameters: {
        channel: "email",
        direction: "05_mandate_retry",
        reason: "mandate is inactive or expired; reauthorization required",
      },
    };
  }

  // High value account with uncertainty or 3+ failures gets human escalation
  if (
    facts.amountAtRiskMinor >= HIGH_VALUE_MANDATE_MINOR &&
    (probability < 0.5 || facts.recentActionCount >= 2 || facts.consecutiveFailures >= 2)
  ) {
    return {
      actionType: "escalate_to_human",
      parameters: {
        reason: `high-value recurring mandate debit (${facts.amountAtRiskMinor} ${facts.currency}) failure requires operator review`,
        escalationTier: "operator",
      },
    };
  }

  const stage = facts.recentActionCount;

  switch (classification) {
    case "systemic_degradation": {
      // 12-hour backoff delay to prevent retry storms during bank/provider downtime
      const scheduledFor = new Date(Date.now() + 12 * 3600 * 1000).toISOString();
      return {
        actionType: "schedule_retry",
        parameters: {
          scheduledFor,
          direction: "05_mandate_retry",
          reason: "retry storm throttling: waiting for bank/provider health recovery",
          retryStormThrottled: true,
        },
      };
    }

    case "insufficient_funds":
      if (stage === 0) {
        // Schedule delayed retry in 36-48 hours (wait for salary/balance cycle)
        const scheduledFor = new Date(Date.now() + 48 * 3600 * 1000).toISOString();
        return {
          actionType: "schedule_retry",
          parameters: {
            scheduledFor,
            direction: "05_mandate_retry",
            classification,
          },
        };
      }
      if (stage === 1) {
        return {
          actionType: "send_email",
          parameters: {
            template: "mandate-payment-retry-notice",
            body: "We could not process your recurring debit due to insufficient funds. A scheduled retry will take place shortly.",
          },
        };
      }
      return {
        actionType: "escalate_to_human",
        parameters: {
          reason: "insufficient funds mandate debit retries exhausted",
          escalationTier: "operator",
        },
      };

    case "temporary_bank_failure":
      if (stage === 0) {
        // Schedule off-peak retry (6 hours)
        const scheduledFor = new Date(Date.now() + 6 * 3600 * 1000).toISOString();
        return {
          actionType: "schedule_retry",
          parameters: {
            scheduledFor,
            direction: "05_mandate_retry",
            classification,
          },
        };
      }
      if (stage === 1) {
        return {
          actionType: "retry_payment",
          parameters: {
            direction: "05_mandate_retry",
            strategy: "AGENT_SELECTED",
          },
        };
      }
      return {
        actionType: "escalate_to_human",
        parameters: {
          reason: "temporary bank debit failures persisted across retry windows",
          escalationTier: "operator",
        },
      };

    case "authentication_required":
      if (stage === 0) {
        return {
          actionType: "send_email",
          parameters: {
            template: "mandate-authentication-required",
            body: "Your bank requires one-time authorization to process your recurring mandate payment.",
          },
        };
      }
      return {
        actionType: "request_payment_method_update",
        parameters: {
          channel: "email",
          direction: "05_mandate_retry",
        },
      };

    case "permanent_decline":
      return {
        actionType: "escalate_to_human",
        parameters: {
          reason: "permanent decline code received on mandate payment debit",
          escalationTier: "operator",
        },
      };

    default:
      if (stage === 0) {
        const scheduledFor = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
        return {
          actionType: "schedule_retry",
          parameters: {
            scheduledFor,
            direction: "05_mandate_retry",
          },
        };
      }
      return {
        actionType: "escalate_to_human",
        parameters: {
          reason: "unresolved recurring mandate payment failure",
          escalationTier: "operator",
        },
      };
  }
}

function shouldRecordRecoveryOnExecution(actionType: RecoveryActionType): boolean {
  return actionType === "retry_payment";
}

export function analyzeMandateRetry(
  facts: MandateRetryFacts,
): MandateRetryAnalysis {
  const classification = classify(facts);
  const probability = estimateRecoveryProbability(facts, classification);
  const expectedRecoverableMinor = Math.round(
    facts.amountAtRiskMinor * probability,
  );
  const action = chooseAction(facts, classification, probability);

  const observations = [
    `direction_05:classification=${classification}`,
    `direction_05:recovery_probability=${probability.toFixed(3)}`,
    `direction_05:expected_recoverable_minor=${expectedRecoverableMinor}`,
    `direction_05:consecutive_failures=${facts.consecutiveFailures}`,
    `direction_05:successful_debits_count=${facts.successfulDebitsCount}`,
  ];

  if (facts.mandateId) {
    observations.push(`direction_05:mandate_id=${facts.mandateId}`);
  }
  if (facts.mandateState) {
    observations.push(`direction_05:mandate_state=${facts.mandateState}`);
  }
  if (facts.bank) {
    observations.push(`direction_05:bank=${facts.bank}`);
  }
  if (facts.provider) {
    observations.push(`direction_05:provider=${facts.provider}`);
  }
  if (typeof facts.bankDegradationHint === "number") {
    observations.push(
      `direction_05:bank_degradation_hint=${facts.bankDegradationHint.toFixed(3)}`,
    );
  }

  const rootCause = [
    `Mandate payment debit failure classified as ${classification}.`,
    facts.mandateState
      ? `Mandate status is currently ${facts.mandateState}.`
      : "Mandate status unconfirmed.",
    facts.consecutiveFailures > 0
      ? `Encountered ${facts.consecutiveFailures} consecutive debit failures.`
      : "First debit failure for this billing cycle.",
    `Selected ${action.actionType} to sequence recovery while enforcing retry limits and preventing retry storms.`,
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

export function reasonOverMandateRetryFacts(
  facts: readonly string[],
): MandateRetryAnalysis | null {
  const hasDirection05 = facts.some(
    (f) =>
      f === "direction=05_mandate_retry" ||
      f === "event_type=mandate.failed" ||
      f.startsWith("direction_05:"),
  );

  if (!hasDirection05) return null;

  const parsed = parseMandateRetryFacts(facts);
  return analyzeMandateRetry(parsed);
}
