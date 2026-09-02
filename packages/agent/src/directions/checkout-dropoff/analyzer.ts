import type { RecoveryActionType } from "@recovery/types";
import type { AgentRecommendation } from "../../state.js";

export type CheckoutDropoffClassification =
  | "payment_failure"
  | "shipping_price_hesitation"
  | "technical_friction"
  | "distraction"
  | "unknown";

export interface CheckoutDropoffFacts {
  caseId: string;
  amountAtRiskMinor: number;
  currency: string;
  abandonmentDurationMinutes: number;
  lastSeenPage: string;
  technicalErrorsCount: number;
  customerOptedOut: boolean;
  cartValueMinor: number;
  shippingCostMinor?: number;
  customerHistoryCompletionRate?: number;
  intentScore?: number;
  previousAbandonedCount?: number;
  recoveryProbabilityHint?: number;
}

export interface CheckoutDropoffAnalysis {
  observations: string[];
  rootCause: string;
  classification: CheckoutDropoffClassification;
  recoveryProbability: number;
  expectedRecoverableMinor: number;
  revenueAtRiskMinor: number;
  recommendation: AgentRecommendation;
  shouldRecordRecoveryOnExecution: boolean;
}

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

export function parseCheckoutDropoffFacts(
  facts: readonly string[],
): CheckoutDropoffFacts | null {
  const bag = new Map<string, string>();
  for (const fact of facts) {
    const parsed = parseFactLine(fact);
    if (parsed) bag.set(parsed[0], parsed[1]);
  }

  if (bag.get("direction") !== "02_checkout_dropoff") {
    return null;
  }

  const amountAtRiskMinor = parseNumber(bag.get("amount_minor")) ?? 0;
  return {
    caseId: bag.get("case_id") ?? "",
    amountAtRiskMinor,
    currency: bag.get("currency") ?? "INR",
    abandonmentDurationMinutes:
      parseNumber(bag.get("abandonment_duration_minutes")) ?? 0,
    lastSeenPage: bag.get("last_seen_page") ?? "unknown",
    technicalErrorsCount: parseNumber(bag.get("technical_errors_count")) ?? 0,
    customerOptedOut: parseBoolean(bag.get("customer_opted_out")),
    cartValueMinor:
      parseNumber(bag.get("cart_value_minor")) ?? amountAtRiskMinor,
    shippingCostMinor: parseNumber(bag.get("shipping_cost_minor")),
    customerHistoryCompletionRate: parseNumber(
      bag.get("customer_completion_rate"),
    ),
    intentScore: parseNumber(bag.get("intent_score")),
    previousAbandonedCount: parseNumber(bag.get("previous_abandoned_count")),
    recoveryProbabilityHint: parseNumber(bag.get("recovery_probability_hint")),
  };
}

function classify(facts: CheckoutDropoffFacts): CheckoutDropoffClassification {
  if (facts.lastSeenPage === "payment" && facts.technicalErrorsCount > 0) {
    return "payment_failure";
  }

  if (
    facts.lastSeenPage === "shipping" &&
    facts.shippingCostMinor !== undefined &&
    facts.shippingCostMinor > facts.cartValueMinor * 0.1
  ) {
    return "shipping_price_hesitation";
  }

  if (facts.technicalErrorsCount > 3) {
    return "technical_friction";
  }

  if (
    facts.abandonmentDurationMinutes > 0 &&
    facts.abandonmentDurationMinutes < 120
  ) {
    return "distraction";
  }

  return "unknown";
}

function estimateRecoveryProbability(
  facts: CheckoutDropoffFacts,
  classification: CheckoutDropoffClassification,
): number {
  if (facts.recoveryProbabilityHint !== undefined) {
    return clampProbability(facts.recoveryProbabilityHint);
  }

  const historyBoost =
    (facts.customerHistoryCompletionRate ?? 0) > 0.8 ? 0.1 : 0;
  const intentBoost = (facts.intentScore ?? 0) > 0.7 ? 0.1 : 0;
  const repeatPenalty = Math.min(
    0.2,
    (facts.previousAbandonedCount ?? 0) * 0.05,
  );

  switch (classification) {
    case "payment_failure":
      return clampProbability(
        0.65 + historyBoost + intentBoost - repeatPenalty,
      );
    case "shipping_price_hesitation":
      return clampProbability(0.4 + historyBoost - repeatPenalty);
    case "technical_friction":
      return clampProbability(0.5 + historyBoost - repeatPenalty);
    case "distraction":
      return clampProbability(0.7 + historyBoost + intentBoost - repeatPenalty);
    default:
      return clampProbability(0.3 + historyBoost);
  }
}

function chooseAction(
  facts: CheckoutDropoffFacts,
  classification: CheckoutDropoffClassification,
): {
  actionType: RecoveryActionType;
  parameters: Record<string, string | number | boolean>;
} {
  if (facts.customerOptedOut) {
    return {
      actionType: "stop_case",
      parameters: { reason: "customer opted out of recovery communication" },
    };
  }

  if (facts.cartValueMinor >= HIGH_VALUE_MINOR) {
    return {
      actionType: "escalate_to_human",
      parameters: {
        reason: "high-value checkout abandonment requires human review",
        escalationTier: "account_manager",
      },
    };
  }

  switch (classification) {
    case "payment_failure":
      return {
        actionType: "send_payment_link",
        parameters: {
          amountMinor: facts.cartValueMinor,
          currency: facts.currency,
          channel: "email",
        },
      };
    case "shipping_price_hesitation":
      return {
        actionType: "send_email",
        parameters: {
          template: "shipping-cost-clarification",
          body: "Provide clarification on shipping costs or a small shipping incentive.",
        },
      };
    case "technical_friction":
      return {
        actionType: "escalate_to_human",
        parameters: {
          reason: "technical checkout friction detected",
          escalationTier: "operator",
        },
      };
    case "distraction":
      return {
        actionType: "send_resume_checkout_link",
        parameters: {
          lastSeenPage: facts.lastSeenPage,
          channel: "email",
        },
      };
    default:
      return {
        actionType: "send_email",
        parameters: {
          template: "checkout-reminder",
          body: "Gentle reminder to complete your purchase.",
        },
      };
  }
}

function shouldRecordRecoveryOnExecution(
  actionType: RecoveryActionType,
): boolean {
  return (
    actionType === "send_payment_link" ||
    actionType === "send_resume_checkout_link"
  );
}

export function analyzeCheckoutDropoff(
  facts: CheckoutDropoffFacts,
): CheckoutDropoffAnalysis {
  const classification = classify(facts);
  const probability = estimateRecoveryProbability(facts, classification);
  const expectedRecoverableMinor = Math.round(
    facts.cartValueMinor * probability,
  );
  const action = chooseAction(facts, classification);

  const observations = [
    `direction_02:classification=${classification}`,
    `direction_02:recovery_probability=${probability.toFixed(3)}`,
    `direction_02:expected_recoverable_minor=${expectedRecoverableMinor}`,
    `direction_02:last_seen_page=${facts.lastSeenPage}`,
    `direction_02:technical_errors=${facts.technicalErrorsCount}`,
  ];

  const rootCause = [
    `Checkout abandonment classified as ${classification}.`,
    `Customer dropped off at ${facts.lastSeenPage}.`,
    facts.technicalErrorsCount > 0
      ? `Observed ${facts.technicalErrorsCount} technical errors during session.`
      : "No significant technical errors observed.",
    `Selected ${action.actionType} based on diagnosis and la-value recovery potential.`,
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
        direction: "02_checkout_dropoff",
        classification,
        amountMinor: facts.cartValueMinor,
        currency: facts.currency,
      },
      expectedOutcomeMinor: expectedRecoverableMinor,
      confidence: probability,
      rationale: `${rootCause} Selected ${action.actionType} with expected recoverable value ${expectedRecoverableMinor} minor units.`,
    },
  };
}

export function reasonOverCheckoutDropoffFacts(
  facts: readonly string[],
): CheckoutDropoffAnalysis | null {
  const parsed = parseCheckoutDropoffFacts(facts);
  if (!parsed) return null;
  return analyzeCheckoutDropoff(parsed);
}
