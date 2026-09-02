import type { RecoveryActionType } from "@recovery/types";
import type { AgentRecommendation } from "../../state.js";

export type PromiseTrackerClassification =
  | "firm_promise_pending"
  | "due_today"
  | "fulfilled"
  | "partial_payment"
  | "broken_promise"
  | "rescheduled"
  | "conditional_pending"
  | "unknown";

export interface PromiseTrackerFacts {
  caseId: string;
  amountAtRiskMinor: number;
  currency: string;
  promiseId?: string;
  promisedAmountMinor: number;
  promisedDate?: string;
  promiseType?: "firm" | "tentative" | "conditional" | "informational";
  promiseStatus?: "pending" | "due" | "fulfilled" | "partial" | "broken" | "rescheduled";
  promiseSource?: string;
  fulfilledAmountMinor: number;
  customerReliabilityScore: number;
  customerOptedOut: boolean;
  attemptCount: number;
  recentActionCount: number;
  recoveryProbabilityHint?: number;
}

export interface PromiseTrackerAnalysis {
  observations: string[];
  rootCause: string;
  classification: PromiseTrackerClassification;
  recoveryProbability: number;
  expectedRecoverableMinor: number;
  revenueAtRiskMinor: number;
  recommendation: AgentRecommendation;
  shouldRecordRecoveryOnExecution: boolean;
}

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

export function parsePromiseTrackerFacts(
  facts: readonly string[],
): PromiseTrackerFacts {
  const map = new Map<string, string>();
  for (const f of facts) {
    const parsed = parseFactLine(f);
    if (parsed) map.set(parsed[0], parsed[1]);
  }

  const amount = parseNumber(map.get("amount_minor")) ?? 0;
  const promisedAmount = parseNumber(map.get("promised_amount_minor")) ?? amount;
  const fulfilledAmount = parseNumber(map.get("fulfilled_amount_minor")) ?? 0;
  const reliability = parseNumber(map.get("customer_reliability_score")) ?? 0.85;

  return {
    caseId: map.get("case_id") ?? "unknown",
    amountAtRiskMinor: amount,
    currency: map.get("currency") ?? "INR",
    promiseId: map.get("promise_id"),
    promisedAmountMinor: promisedAmount,
    promisedDate: map.get("promised_date"),
    promiseType: map.get("promise_type") as "firm" | "tentative" | "conditional" | "informational" | undefined,
    promiseStatus: map.get("promise_status") as "pending" | "due" | "fulfilled" | "partial" | "broken" | "rescheduled" | undefined,
    promiseSource: map.get("promise_source"),
    fulfilledAmountMinor: fulfilledAmount,
    customerReliabilityScore: reliability,
    customerOptedOut: parseBoolean(map.get("customer_opted_out")),
    attemptCount: parseNumber(map.get("attempt_count")) ?? 1,
    recentActionCount: parseNumber(map.get("recent_action_count")) ?? 0,
    recoveryProbabilityHint: parseNumber(map.get("recovery_probability_hint")),
  };
}

function classify(facts: PromiseTrackerFacts): PromiseTrackerClassification {
  const status = (facts.promiseStatus ?? "").toLowerCase();

  if (status === "fulfilled" || (facts.fulfilledAmountMinor > 0 && facts.fulfilledAmountMinor >= facts.promisedAmountMinor)) {
    return "fulfilled";
  }

  if (facts.fulfilledAmountMinor > 0 && facts.fulfilledAmountMinor < facts.promisedAmountMinor) {
    return "partial_payment";
  }

  if (status === "broken") {
    return "broken_promise";
  }

  if (status === "rescheduled") {
    return "rescheduled";
  }

  if (facts.promisedDate) {
    const pDate = new Date(facts.promisedDate);
    const now = new Date();
    const isToday =
      pDate.getFullYear() === now.getFullYear() &&
      pDate.getMonth() === now.getMonth() &&
      pDate.getDate() === now.getDate();

    if (isToday || status === "due") {
      return "due_today";
    }

    if (pDate < now && status !== "fulfilled") {
      return "broken_promise";
    }
  }

  if (facts.promiseType === "conditional") {
    return "conditional_pending";
  }

  if (status === "pending" || facts.promiseType === "firm") {
    return "firm_promise_pending";
  }

  return "unknown";
}

function estimateRecoveryProbability(
  facts: PromiseTrackerFacts,
  classification: PromiseTrackerClassification,
): number {
  if (facts.customerOptedOut) return 0.05;
  if (typeof facts.recoveryProbabilityHint === "number") {
    return clampProbability(facts.recoveryProbabilityHint);
  }

  let prob = 0.75;

  switch (classification) {
    case "fulfilled":
      return 1.0;
    case "partial_payment":
      prob = 0.85;
      break;
    case "due_today":
    case "firm_promise_pending":
      prob = 0.75 + facts.customerReliabilityScore * 0.15;
      break;
    case "rescheduled":
      prob = 0.65;
      break;
    case "conditional_pending":
      prob = 0.55;
      break;
    case "broken_promise":
      prob = 0.2;
      break;
    case "unknown":
      prob = 0.4;
      break;
  }

  return clampProbability(prob);
}

function chooseAction(
  facts: PromiseTrackerFacts,
  classification: PromiseTrackerClassification,
  probability: number,
): {
  actionType: RecoveryActionType;
  parameters: Record<string, string | number | boolean>;
} {
  if (facts.customerOptedOut) {
    return {
      actionType: "stop_case",
      parameters: { reason: "customer opted out of promise tracking notifications" },
    };
  }

  switch (classification) {
    case "fulfilled":
      return {
        actionType: "stop_case",
        parameters: { reason: "promise to pay has been fully satisfied and payment received" },
      };

    case "partial_payment": {
      const remainingMinor = facts.promisedAmountMinor - facts.fulfilledAmountMinor;
      return {
        actionType: "send_payment_link",
        parameters: {
          amountMinor: remainingMinor,
          currency: facts.currency,
          channel: "whatsapp",
          reason: `partial promise payment received (${facts.fulfilledAmountMinor}/${facts.promisedAmountMinor}); link sent for remaining balance`,
        },
      };
    }

    case "due_today":
      return {
        actionType: "send_whatsapp",
        parameters: {
          message: `Namaste! Friendly reminder regarding your promised payment of ${facts.promisedAmountMinor} ${facts.currency} due today. Please let us know if you need assistance.`,
        },
      };

    case "broken_promise":
      if (facts.recentActionCount === 0) {
        return {
          actionType: "send_payment_link",
          parameters: {
            amountMinor: facts.promisedAmountMinor,
            currency: facts.currency,
            channel: "email",
            reason: "promised payment date passed without settlement; immediate payment link sent",
          },
        };
      }
      return {
        actionType: "escalate_to_human",
        parameters: {
          reason: "customer broke payment commitment date; manual collections escalation required",
          escalationTier: "collections",
        },
      };

    case "rescheduled":
      return {
        actionType: "schedule_retry",
        parameters: {
          scheduledFor: facts.promisedDate ?? new Date(Date.now() + 7 * 3600 * 24 * 1000).toISOString(),
          direction: "07_promise_to_pay",
          reason: "promise date rescheduled by customer",
        },
      };

    case "conditional_pending":
      return {
        actionType: "send_email",
        parameters: {
          template: "conditional-promise-check",
          body: "Following up on your conditional payment commitment. Please update us once your pending condition resolves.",
        },
      };

    case "firm_promise_pending":
    default:
      return {
        actionType: "schedule_retry",
        parameters: {
          scheduledFor: facts.promisedDate ?? new Date(Date.now() + 3 * 3600 * 24 * 1000).toISOString(),
          direction: "07_promise_to_pay",
          reason: "tracking active promise to pay date",
        },
      };
  }
}

function shouldRecordRecoveryOnExecution(actionType: RecoveryActionType): boolean {
  return actionType === "send_payment_link";
}

export function analyzePromiseTracker(
  facts: PromiseTrackerFacts,
): PromiseTrackerAnalysis {
  const classification = classify(facts);
  const probability = estimateRecoveryProbability(facts, classification);
  const expectedRecoverableMinor = Math.round(
    facts.promisedAmountMinor * probability,
  );
  const action = chooseAction(facts, classification, probability);

  const observations = [
    `direction_07:classification=${classification}`,
    `direction_07:recovery_probability=${probability.toFixed(3)}`,
    `direction_07:expected_recoverable_minor=${expectedRecoverableMinor}`,
    `direction_07:promised_amount_minor=${facts.promisedAmountMinor}`,
    `direction_07:fulfilled_amount_minor=${facts.fulfilledAmountMinor}`,
    `direction_07:customer_reliability_score=${facts.customerReliabilityScore.toFixed(3)}`,
  ];

  if (facts.promiseId) {
    observations.push(`direction_07:promise_id=${facts.promiseId}`);
  }
  if (facts.promisedDate) {
    observations.push(`direction_07:promised_date=${facts.promisedDate}`);
  }
  if (facts.promiseType) {
    observations.push(`direction_07:promise_type=${facts.promiseType}`);
  }
  if (facts.promiseStatus) {
    observations.push(`direction_07:promise_status=${facts.promiseStatus}`);
  }

  const rootCause = [
    `Promise-to-pay tracking classified as ${classification}.`,
    facts.promisedDate
      ? `Payment promised for ${facts.promisedDate}.`
      : "No firm promised date provided.",
    facts.fulfilledAmountMinor > 0
      ? `Received partial settlement of ${facts.fulfilledAmountMinor} minor units.`
      : "No settlement received yet.",
    `Selected ${action.actionType} to track commitment lifecycle and verify settlement.`,
  ].join(" ");

  const rationale = [
    rootCause,
    `Selected ${action.actionType} with expected recoverable cash ${expectedRecoverableMinor} minor units (probability: ${probability.toFixed(3)}).`,
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

export function reasonOverPromiseTrackerFacts(
  facts: readonly string[],
): PromiseTrackerAnalysis | null {
  const hasDirection07 = facts.some(
    (f) =>
      f === "direction=07_promise_to_pay" ||
      f.startsWith("promise.") ||
      f.startsWith("direction_07:"),
  );

  if (!hasDirection07) return null;

  const parsed = parsePromiseTrackerFacts(facts);
  return analyzePromiseTracker(parsed);
}
