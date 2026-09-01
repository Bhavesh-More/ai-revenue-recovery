import type { RecoveryActionType } from "@recovery/types";
import type { AgentRecommendation } from "../../state.js";

export type PaymentDegradationClassification =
  | "customer_specific"
  | "payment_method_specific"
  | "provider_specific"
  | "bank_specific"
  | "regional"
  | "temporal"
  | "unknown";

export type PaymentRootCause =
  | "card_expired"
  | "insufficient_funds"
  | "bank_decline"
  | "authentication_required"
  | "network_error"
  | "mandate_inactive"
  | "provider_degradation"
  | "unknown";

export interface PaymentDegradationFacts {
  caseId: string;
  amountAtRiskMinor: number;
  currency: string;
  attemptCount: number;
  recentActionCount: number;
  customerOptedOut: boolean;
  paymentId?: string;
  provider?: string;
  paymentMethod?: string;
  bank?: string;
  region?: string;
  failureReason?: PaymentRootCause;
  baselineSuccessRate?: number;
  currentSuccessRate?: number;
  similarFailureCount?: number;
  affectedCustomerCount?: number;
  timeWindowMinutes?: number;
  successfulPaymentCount?: number;
  failedPaymentCount?: number;
  recoveryProbabilityHint?: number;
}

export interface PaymentDegradationAnalysis {
  observations: string[];
  rootCause: string;
  classification: PaymentDegradationClassification;
  recoveryProbability: number;
  expectedRecoverableMinor: number;
  revenueAtRiskMinor: number;
  recommendation: AgentRecommendation;
  shouldRecordRecoveryOnExecution: boolean;
}

const SYSTEMIC_FAILURE_COUNT = 25;
const SYSTEMIC_CUSTOMER_COUNT = 10;
const PROVIDER_DEGRADATION_DROP = 0.08;
const HIGH_VALUE_MINOR = 50_000_000;

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

export function parsePaymentDegradationFacts(
  facts: readonly string[],
): PaymentDegradationFacts | null {
  const bag = new Map<string, string>();
  for (const fact of facts) {
    const parsed = parseFactLine(fact);
    if (parsed) bag.set(parsed[0], parsed[1]);
  }

  if (bag.get("direction") !== "01_payment_degradation") {
    return null;
  }

  const amountAtRiskMinor = parseNumber(bag.get("amount_minor")) ?? 0;
  return {
    caseId: bag.get("case_id") ?? "",
    amountAtRiskMinor,
    currency: bag.get("currency") ?? "INR",
    attemptCount: parseNumber(bag.get("attempt_count")) ?? 0,
    recentActionCount: parseNumber(bag.get("recent_action_count")) ?? 0,
    customerOptedOut: parseBoolean(bag.get("customer_opted_out")),
    paymentId: bag.get("payment_id"),
    provider: bag.get("provider"),
    paymentMethod: bag.get("payment_method"),
    bank: bag.get("bank"),
    region: bag.get("region"),
    failureReason: bag.get("failure_reason") as PaymentRootCause | undefined,
    baselineSuccessRate: parseNumber(bag.get("baseline_success_rate")),
    currentSuccessRate: parseNumber(bag.get("current_success_rate")),
    similarFailureCount: parseNumber(bag.get("similar_failure_count")),
    affectedCustomerCount: parseNumber(bag.get("affected_customer_count")),
    timeWindowMinutes: parseNumber(bag.get("time_window_minutes")),
    successfulPaymentCount: parseNumber(
      bag.get("customer_successful_payments"),
    ),
    failedPaymentCount: parseNumber(bag.get("customer_failed_payments")),
    recoveryProbabilityHint: parseNumber(bag.get("recovery_probability_hint")),
  };
}

function successRateDrop(facts: PaymentDegradationFacts): number {
  if (
    facts.baselineSuccessRate === undefined ||
    facts.currentSuccessRate === undefined
  ) {
    return 0;
  }
  return facts.baselineSuccessRate - facts.currentSuccessRate;
}

function classify(
  facts: PaymentDegradationFacts,
): PaymentDegradationClassification {
  const drop = successRateDrop(facts);
  const similarFailures = facts.similarFailureCount ?? 0;
  const affectedCustomers = facts.affectedCustomerCount ?? 0;

  if (
    facts.failureReason === "provider_degradation" ||
    (facts.provider &&
      drop >= PROVIDER_DEGRADATION_DROP &&
      similarFailures >= SYSTEMIC_FAILURE_COUNT &&
      affectedCustomers >= SYSTEMIC_CUSTOMER_COUNT)
  ) {
    return "provider_specific";
  }

  if (facts.bank && similarFailures >= SYSTEMIC_FAILURE_COUNT) {
    return "bank_specific";
  }

  if (facts.paymentMethod && similarFailures >= SYSTEMIC_FAILURE_COUNT) {
    return "payment_method_specific";
  }

  if (facts.region && affectedCustomers >= SYSTEMIC_CUSTOMER_COUNT) {
    return "regional";
  }

  if (
    (facts.timeWindowMinutes ?? 0) > 0 &&
    similarFailures >= SYSTEMIC_FAILURE_COUNT
  ) {
    return "temporal";
  }

  if ((facts.attemptCount ?? 0) <= 3) {
    return "customer_specific";
  }

  return "unknown";
}

function estimateRecoveryProbability(
  facts: PaymentDegradationFacts,
  classification: PaymentDegradationClassification,
): number {
  if (facts.recoveryProbabilityHint !== undefined) {
    return clampProbability(facts.recoveryProbabilityHint);
  }

  const successful = facts.successfulPaymentCount ?? 0;
  const failed = facts.failedPaymentCount ?? 0;
  const historyBoost = successful >= 12 ? 0.12 : successful >= 3 ? 0.06 : 0;
  const repeatPenalty = Math.min(0.25, Math.max(0, failed - 1) * 0.06);

  switch (facts.failureReason) {
    case "card_expired":
      return clampProbability(0.78 + historyBoost - repeatPenalty);
    case "insufficient_funds":
      return clampProbability(0.52 + historyBoost - repeatPenalty);
    case "authentication_required":
      return clampProbability(0.62 + historyBoost - repeatPenalty);
    case "network_error":
      return clampProbability(0.7 + historyBoost - repeatPenalty);
    case "bank_decline":
      return clampProbability(0.45 + historyBoost - repeatPenalty);
    case "mandate_inactive":
      return clampProbability(0.48 + historyBoost - repeatPenalty);
    case "provider_degradation":
      return clampProbability(0.68 - repeatPenalty);
    default:
      return clampProbability(
        classification === "unknown" ? 0.32 + historyBoost : 0.5 + historyBoost,
      );
  }
}

function nextIsoAfterMinutes(minutes: number): string {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

function chooseAction(
  facts: PaymentDegradationFacts,
  classification: PaymentDegradationClassification,
): {
  actionType: RecoveryActionType;
  parameters: Record<string, string | number | boolean>;
} {
  const amountMinor = facts.amountAtRiskMinor;

  if (facts.customerOptedOut) {
    return {
      actionType: "stop_case",
      parameters: { reason: "customer opted out of recovery communication" },
    };
  }

  if (classification === "provider_specific") {
    return {
      actionType: "schedule_retry",
      parameters: {
        scheduledFor: nextIsoAfterMinutes(90),
        paymentId: facts.paymentId ?? "",
        reason:
          "provider degradation detected; defer retry to avoid retry storm",
      },
    };
  }

  if (amountMinor >= HIGH_VALUE_MINOR || facts.attemptCount >= 3) {
    return {
      actionType: "escalate_to_human",
      parameters: {
        reason:
          amountMinor >= HIGH_VALUE_MINOR
            ? "high-value payment degradation requires human review"
            : "maximum autonomous recovery attempts reached",
        escalationTier:
          amountMinor >= HIGH_VALUE_MINOR ? "account_manager" : "operator",
      },
    };
  }

  switch (facts.failureReason) {
    case "card_expired":
      return {
        actionType: "request_payment_method_update",
        parameters: { channel: "email" },
      };
    case "insufficient_funds":
      return {
        actionType: "schedule_retry",
        parameters: {
          scheduledFor: nextIsoAfterMinutes(24 * 60),
          paymentId: facts.paymentId ?? "",
        },
      };
    case "authentication_required":
      return {
        actionType: "send_email",
        parameters: {
          template: "payment-authentication-required",
          body: "Ask the customer to complete payment authentication.",
        },
      };
    case "network_error":
      return {
        actionType: "retry_payment",
        parameters: { paymentId: facts.paymentId ?? "" },
      };
    case "mandate_inactive":
      return {
        actionType: "send_payment_link",
        parameters: {
          amountMinor,
          currency: facts.currency,
          channel: "email",
        },
      };
    case "bank_decline":
      return {
        actionType: "send_payment_link",
        parameters: {
          amountMinor,
          currency: facts.currency,
          channel: "email",
        },
      };
    default:
      return {
        actionType: "send_email",
        parameters: {
          template: "payment-recovery-review",
          body: "Ask the customer to review the failed payment and retry.",
        },
      };
  }
}

function shouldRecordRecoveryOnExecution(
  actionType: RecoveryActionType,
): boolean {
  return actionType === "retry_payment" || actionType === "send_payment_link";
}

export function analyzePaymentDegradation(
  facts: PaymentDegradationFacts,
): PaymentDegradationAnalysis {
  const classification = classify(facts);
  const probability = estimateRecoveryProbability(facts, classification);
  const expectedRecoverableMinor = Math.round(
    facts.amountAtRiskMinor * probability,
  );
  const action = chooseAction(facts, classification);
  const drop = successRateDrop(facts);
  const rootCauseCode = facts.failureReason ?? "unknown";
  const systemic =
    classification === "provider_specific" ||
    classification === "bank_specific" ||
    classification === "payment_method_specific" ||
    classification === "regional" ||
    classification === "temporal";

  const observations = [
    `direction_01:classification=${classification}`,
    `direction_01:root_cause=${rootCauseCode}`,
    `direction_01:success_rate_drop=${drop.toFixed(3)}`,
    `direction_01:recovery_probability=${probability.toFixed(3)}`,
    `direction_01:expected_recoverable_minor=${expectedRecoverableMinor}`,
    systemic
      ? "direction_01:systemic_pattern_detected=true"
      : "direction_01:systemic_pattern_detected=false",
  ];

  const rootCause = [
    `Payment degradation classified as ${classification}.`,
    `Likely root cause: ${rootCauseCode}.`,
    facts.baselineSuccessRate !== undefined &&
    facts.currentSuccessRate !== undefined
      ? `Baseline success rate ${(facts.baselineSuccessRate * 100).toFixed(1)}% vs current ${(facts.currentSuccessRate * 100).toFixed(1)}%.`
      : "No complete baseline/current success-rate pair was supplied.",
    systemic
      ? "The pattern appears broader than one customer, so customer messaging and retries should remain bounded."
      : "The evidence points to an individual recoverable payment failure.",
  ].join(" ");

  return {
    observations,
    rootCause,
    classification,
    recoveryProbability: probability,
    expectedRecoverableMinor,
    revenueAtRiskMinor: facts.amountAtRiskMinor,
    shouldRecordRecoveryOnExecution: shouldRecordRecoveryOnExecution(
      action.actionType,
    ),
    recommendation: {
      actionType: action.actionType,
      parameters: {
        ...action.parameters,
        direction: "01_payment_degradation",
        classification,
        rootCause: rootCauseCode,
        amountMinor: facts.amountAtRiskMinor,
        currency: facts.currency,
      },
      expectedOutcomeMinor: expectedRecoverableMinor,
      confidence: probability,
      rationale: `${rootCause} Selected ${action.actionType} with expected recoverable value ${expectedRecoverableMinor} minor units.`,
    },
  };
}

export function reasonOverPaymentDegradationFacts(
  facts: readonly string[],
): PaymentDegradationAnalysis | null {
  const parsed = parsePaymentDegradationFacts(facts);
  if (!parsed) return null;
  return analyzePaymentDegradation(parsed);
}
