import type { RecoveryActionType } from "@recovery/types";
import type { AgentRecommendation } from "../../state.js";

export type B2BReceivablesClassification =
  | "disputed"
  | "administrative_delay"
  | "cash_flow_delay"
  | "predictable_late"
  | "unresponsive_chronic"
  | "unknown";

export interface B2BReceivablesFacts {
  caseId: string;
  amountAtRiskMinor: number;
  currency: string;
  invoiceId?: string;
  invoiceNumber?: string;
  daysOverdue: number;
  dueDate?: string;
  paymentTerms?: string;
  companyName?: string;
  contactEmail?: string;
  purchaseOrderNumber?: string;
  disputeStatus?: "none" | "active" | "resolved";
  historicalAvgDelayDays?: number;
  brokenPromisesCount: number;
  failureReason?: string;
  customerOptedOut: boolean;
  attemptCount: number;
  recentActionCount: number;
  recoveryProbabilityHint?: number;
}

export interface B2BReceivablesAnalysis {
  observations: string[];
  rootCause: string;
  classification: B2BReceivablesClassification;
  recoveryProbability: number;
  expectedRecoverableMinor: number;
  revenueAtRiskMinor: number;
  recommendation: AgentRecommendation;
  shouldRecordRecoveryOnExecution: boolean;
}

const HIGH_VALUE_RECEIVABLE_MINOR = 100_000_000; // ₹10,00,000 in minor units (paise)

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

export function parseB2BReceivablesFacts(
  facts: readonly string[],
): B2BReceivablesFacts {
  const map = new Map<string, string>();
  for (const f of facts) {
    const parsed = parseFactLine(f);
    if (parsed) map.set(parsed[0], parsed[1]);
  }

  const amount = parseNumber(map.get("amount_minor")) ?? 0;
  const daysOverdue = parseNumber(map.get("days_overdue")) ?? 0;
  const historicalAvgDelay = parseNumber(map.get("historical_avg_delay_days"));
  const brokenPromises = parseNumber(map.get("broken_promises_count"));

  return {
    caseId: map.get("case_id") ?? "unknown",
    amountAtRiskMinor: amount,
    currency: map.get("currency") ?? "INR",
    invoiceId: map.get("invoice_id"),
    invoiceNumber: map.get("invoice_number"),
    daysOverdue,
    dueDate: map.get("due_date"),
    paymentTerms: map.get("payment_terms"),
    companyName: map.get("company_name"),
    contactEmail: map.get("contact_email"),
    purchaseOrderNumber: map.get("purchase_order_number"),
    disputeStatus: map.get("dispute_status") as
      | "none"
      | "active"
      | "resolved"
      | undefined,
    historicalAvgDelayDays: historicalAvgDelay,
    brokenPromisesCount: brokenPromises ?? 0,
    failureReason: map.get("failure_reason"),
    customerOptedOut: parseBoolean(map.get("customer_opted_out")),
    attemptCount: parseNumber(map.get("attempt_count")) ?? 1,
    recentActionCount: parseNumber(map.get("recent_action_count")) ?? 0,
    recoveryProbabilityHint: parseNumber(map.get("recovery_probability_hint")),
  };
}

function classify(facts: B2BReceivablesFacts): B2BReceivablesClassification {
  const reason = (facts.failureReason ?? "").toLowerCase();

  if (
    facts.disputeStatus === "active" ||
    reason.includes("dispute") ||
    reason.includes("error") ||
    reason.includes("wrong_amount") ||
    reason.includes("quality")
  ) {
    return "disputed";
  }

  if (
    (typeof facts.brokenPromisesCount === "number" &&
      facts.brokenPromisesCount > 0) ||
    facts.daysOverdue > 60 ||
    facts.recentActionCount >= 3
  ) {
    return "unresponsive_chronic";
  }

  if (
    typeof facts.historicalAvgDelayDays === "number" &&
    facts.daysOverdue <= facts.historicalAvgDelayDays + 7 &&
    facts.brokenPromisesCount === 0
  ) {
    return "predictable_late";
  }

  if (
    reason.includes("po_missing") ||
    reason.includes("approval_pending") ||
    reason.includes("ap_processing") ||
    facts.daysOverdue <= 15
  ) {
    return "administrative_delay";
  }

  if (
    reason.includes("cash_flow") ||
    reason.includes("liquidity") ||
    reason.includes("promise")
  ) {
    return "cash_flow_delay";
  }

  return "unknown";
}

function estimateRecoveryProbability(
  facts: B2BReceivablesFacts,
  classification: B2BReceivablesClassification,
): number {
  if (facts.customerOptedOut) return 0.05;
  if (typeof facts.recoveryProbabilityHint === "number") {
    return clampProbability(facts.recoveryProbabilityHint);
  }

  let prob = 0.65;

  // Alignment with historical payment timing pattern
  if (
    typeof facts.historicalAvgDelayDays === "number" &&
    facts.daysOverdue <= facts.historicalAvgDelayDays + 5
  ) {
    prob += 0.15; // Customer is acting within their normal payment routine
  }

  // Classification adjustments
  switch (classification) {
    case "predictable_late":
      prob += 0.15;
      break;
    case "administrative_delay":
      prob += 0.1;
      break;
    case "cash_flow_delay":
      prob -= 0.05;
      break;
    case "disputed":
      prob -= 0.35; // Disputes require manual settlement before cash is collected
      break;
    case "unresponsive_chronic":
      prob -= 0.3;
      break;
    case "unknown":
      prob -= 0.1;
      break;
  }

  // Aging penalty past 30 days
  if (facts.daysOverdue > 30) {
    const extraDays = facts.daysOverdue - 30;
    prob -= Math.min(0.3, extraDays * 0.005);
  }

  // Broken promises heavy penalty
  if (facts.brokenPromisesCount > 0) {
    prob -= Math.min(0.4, facts.brokenPromisesCount * 0.15);
  }

  return clampProbability(prob);
}

function chooseAction(
  facts: B2BReceivablesFacts,
  classification: B2BReceivablesClassification,
  probability: number,
): {
  actionType: RecoveryActionType;
  parameters: Record<string, string | number | boolean>;
} {
  if (facts.customerOptedOut) {
    return {
      actionType: "stop_case",
      parameters: { reason: "customer opted out of collection communications" },
    };
  }

  if (classification === "disputed") {
    return {
      actionType: "escalate_to_human",
      parameters: {
        reason: `B2B invoice ${facts.invoiceNumber ?? facts.invoiceId ?? "unspecified"} is disputed by customer`,
        escalationTier: "account_manager",
      },
    };
  }

  if (
    facts.amountAtRiskMinor >= HIGH_VALUE_RECEIVABLE_MINOR &&
    (probability < 0.5 || facts.recentActionCount >= 2)
  ) {
    return {
      actionType: "escalate_to_human",
      parameters: {
        reason: `high-value B2B receivable (${facts.amountAtRiskMinor} ${facts.currency}) requires executive/collections review`,
        escalationTier: "collections",
      },
    };
  }

  const stage = facts.recentActionCount;

  switch (classification) {
    case "predictable_late":
      if (stage === 0) {
        return {
          actionType: "send_email",
          parameters: {
            template: "b2b-statement-of-account",
            body: `Gentle statement of account for Invoice ${facts.invoiceNumber ?? facts.invoiceId ?? "due"}.`,
          },
        };
      }
      return {
        actionType: "send_email",
        parameters: {
          template: "b2b-payment-courtesy-reminder",
          body: `Courtesy reminder regarding outstanding balance for Invoice ${facts.invoiceNumber ?? facts.invoiceId ?? "due"}.`,
        },
      };

    case "administrative_delay":
      if (stage === 0) {
        return {
          actionType: "send_email",
          parameters: {
            template: "b2b-invoice-reminder",
            body: `Invoice ${facts.invoiceNumber ?? facts.invoiceId ?? "due"} is past due. Please confirm AP processing status or PO reference.`,
          },
        };
      }
      if (stage === 1) {
        return {
          actionType: "send_whatsapp",
          parameters: {
            message: `Hi ${facts.companyName ?? "there"}, following up on Invoice ${facts.invoiceNumber ?? facts.invoiceId ?? ""}. Please update us on the payment date.`,
          },
        };
      }
      return {
        actionType: "escalate_to_human",
        parameters: {
          reason: "administrative AP delay unresolved after follow-ups",
          escalationTier: "operator",
        },
      };

    case "cash_flow_delay":
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
          actionType: "record_promise",
          parameters: {
            promisedDate: new Date(
              Date.now() + 14 * 3600 * 24 * 1000,
            ).toISOString(),
            amountMinor: facts.amountAtRiskMinor,
          },
        };
      }
      return {
        actionType: "escalate_to_human",
        parameters: {
          reason: "customer requested extended payment terms due to cash flow",
          escalationTier: "account_manager",
        },
      };

    case "unresponsive_chronic":
      if (stage === 0) {
        return {
          actionType: "send_email",
          parameters: {
            template: "b2b-overdue-urgent-notice",
            body: `URGENT: Invoice ${facts.invoiceNumber ?? facts.invoiceId ?? ""} is ${facts.daysOverdue} days overdue. Immediate payment is required.`,
          },
        };
      }
      return {
        actionType: "escalate_to_human",
        parameters: {
          reason: `chronically overdue invoice (${facts.daysOverdue} days overdue, ${facts.brokenPromisesCount} broken promises)`,
          escalationTier: "collections",
        },
      };

    default:
      if (stage === 0) {
        return {
          actionType: "send_email",
          parameters: {
            template: "b2b-invoice-reminder",
            body: `Reminder regarding overdue Invoice ${facts.invoiceNumber ?? facts.invoiceId ?? ""}.`,
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
          reason: "unresolved overdue B2B invoice",
          escalationTier: "operator",
        },
      };
  }
}

function shouldRecordRecoveryOnExecution(
  actionType: RecoveryActionType,
): boolean {
  return actionType === "send_payment_link";
}

export function analyzeB2BReceivables(
  facts: B2BReceivablesFacts,
): B2BReceivablesAnalysis {
  const classification = classify(facts);
  const probability = estimateRecoveryProbability(facts, classification);
  const expectedRecoverableMinor = Math.round(
    facts.amountAtRiskMinor * probability,
  );
  const action = chooseAction(facts, classification, probability);

  const observations = [
    `direction_04:classification=${classification}`,
    `direction_04:recovery_probability=${probability.toFixed(3)}`,
    `direction_04:expected_recoverable_minor=${expectedRecoverableMinor}`,
    `direction_04:days_overdue=${facts.daysOverdue}`,
    `direction_04:broken_promises_count=${facts.brokenPromisesCount}`,
  ];

  if (facts.invoiceId) {
    observations.push(`direction_04:invoice_id=${facts.invoiceId}`);
  }
  if (facts.invoiceNumber) {
    observations.push(`direction_04:invoice_number=${facts.invoiceNumber}`);
  }
  if (facts.companyName) {
    observations.push(`direction_04:company_name=${facts.companyName}`);
  }
  if (typeof facts.historicalAvgDelayDays === "number") {
    observations.push(
      `direction_04:historical_avg_delay_days=${facts.historicalAvgDelayDays}`,
    );
  }
  if (facts.disputeStatus) {
    observations.push(`direction_04:dispute_status=${facts.disputeStatus}`);
  }

  const rootCause = [
    `Overdue B2B invoice (${facts.daysOverdue} days overdue) classified as ${classification}.`,
    facts.historicalAvgDelayDays !== undefined
      ? `Customer average historical payment delay is ${facts.historicalAvgDelayDays} days.`
      : "No historical payment delay data available.",
    facts.brokenPromisesCount > 0
      ? `Customer has ${facts.brokenPromisesCount} broken promises to pay.`
      : "No broken promise history.",
    `Selected ${action.actionType} to advance collection workflow while preserving customer relationship.`,
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

export function reasonOverB2BReceivablesFacts(
  facts: readonly string[],
): B2BReceivablesAnalysis | null {
  const hasDirection04 = facts.some(
    (f) =>
      f === "direction=04_b2b_receivables" ||
      f === "event_type=invoice.overdue" ||
      f.startsWith("direction_04:"),
  );

  if (!hasDirection04) return null;

  const parsed = parseB2BReceivablesFacts(facts);
  return analyzeB2BReceivables(parsed);
}
