import type { RecoveryActionType } from "@recovery/types";
import type { AgentRecommendation } from "../../state.js";

export type HinglishVoiceIntent =
  | "promise_to_pay"
  | "payment_link_requested"
  | "technical_card_issue"
  | "disputed"
  | "refused_unwilling"
  | "unreachable_no_answer"
  | "unknown";

export interface HinglishVoiceFacts {
  caseId: string;
  amountAtRiskMinor: number;
  currency: string;
  voiceInteractionId?: string;
  callDurationSeconds?: number;
  transcriptText?: string;
  detectedLanguage?: string;
  sentiment?: "positive" | "neutral" | "negative";
  voiceIntent?: HinglishVoiceIntent;
  promisedDate?: string;
  customerPhone?: string;
  digitalRemindersCount: number;
  callAttemptsCount: number;
  customerOptedOut: boolean;
  attemptCount: number;
  recentActionCount: number;
  recoveryProbabilityHint?: number;
}

export interface HinglishVoiceAnalysis {
  observations: string[];
  rootCause: string;
  classification: HinglishVoiceIntent;
  recoveryProbability: number;
  expectedRecoverableMinor: number;
  revenueAtRiskMinor: number;
  recommendation: AgentRecommendation;
  shouldRecordRecoveryOnExecution: boolean;
}

const MIN_VOICE_CALL_AMOUNT_MINOR = 500_000; // ₹5,000 in minor units (paise)

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

export function parseHinglishVoiceFacts(
  facts: readonly string[],
): HinglishVoiceFacts {
  const map = new Map<string, string>();
  for (const f of facts) {
    const parsed = parseFactLine(f);
    if (parsed) map.set(parsed[0], parsed[1]);
  }

  const amount = parseNumber(map.get("amount_minor")) ?? 0;
  const digitalReminders = parseNumber(map.get("digital_reminders_count")) ?? 0;
  const callAttempts = parseNumber(map.get("call_attempts_count")) ?? 0;
  const duration = parseNumber(map.get("call_duration_seconds"));

  return {
    caseId: map.get("case_id") ?? "unknown",
    amountAtRiskMinor: amount,
    currency: map.get("currency") ?? "INR",
    voiceInteractionId: map.get("voice_interaction_id"),
    callDurationSeconds: duration,
    transcriptText: map.get("transcript_text"),
    detectedLanguage: map.get("detected_language") ?? "HINGLISH",
    sentiment: map.get("sentiment") as
      | "positive"
      | "neutral"
      | "negative"
      | undefined,
    voiceIntent: map.get("voice_intent") as HinglishVoiceIntent | undefined,
    promisedDate: map.get("promised_date"),
    customerPhone: map.get("customer_phone"),
    digitalRemindersCount: digitalReminders,
    callAttemptsCount: callAttempts,
    customerOptedOut: parseBoolean(map.get("customer_opted_out")),
    attemptCount: parseNumber(map.get("attempt_count")) ?? 1,
    recentActionCount: parseNumber(map.get("recent_action_count")) ?? 0,
    recoveryProbabilityHint: parseNumber(map.get("recovery_probability_hint")),
  };
}

function classifyIntentFromTranscript(
  facts: HinglishVoiceFacts,
): HinglishVoiceIntent {
  if (facts.voiceIntent && facts.voiceIntent !== "unknown") {
    return facts.voiceIntent;
  }

  const text = (facts.transcriptText ?? "").toLowerCase();

  if (
    facts.callDurationSeconds === 0 ||
    text.includes("no answer") ||
    text.includes("missed")
  ) {
    return "unreachable_no_answer";
  }

  if (
    text.includes("link bhej") ||
    text.includes("payment link") ||
    text.includes("whatsapp pe link") ||
    text.includes("send link")
  ) {
    return "payment_link_requested";
  }

  if (
    text.includes("kal pay") ||
    text.includes("salary aane") ||
    text.includes("ko pay") ||
    text.includes("pay kar dunga") ||
    text.includes("promise") ||
    text.includes("due date tak")
  ) {
    return "promise_to_pay";
  }

  if (
    text.includes("card expire") ||
    text.includes("card issue") ||
    text.includes("bank issue") ||
    text.includes("decline ho raha")
  ) {
    return "technical_card_issue";
  }

  if (
    text.includes("galat charge") ||
    text.includes("wrong amount") ||
    text.includes("dispute") ||
    text.includes("galti hai")
  ) {
    return "disputed";
  }

  if (
    text.includes("nahi chahiye") ||
    text.includes("renew nahi karna") ||
    text.includes("cancel kar do") ||
    text.includes("stop service")
  ) {
    return "refused_unwilling";
  }

  return "unknown";
}

function estimateRecoveryProbability(
  facts: HinglishVoiceFacts,
  classification: HinglishVoiceIntent,
): number {
  if (facts.customerOptedOut) return 0.05;
  if (typeof facts.recoveryProbabilityHint === "number") {
    return clampProbability(facts.recoveryProbabilityHint);
  }

  let prob = 0.5;

  switch (classification) {
    case "payment_link_requested":
      prob = 0.85; // Customer actively asked for link during call
      break;
    case "promise_to_pay":
      prob = 0.75; // Explicit verbal commitment made
      break;
    case "technical_card_issue":
      prob = 0.7; // High intent, technical friction
      break;
    case "disputed":
      prob = 0.25; // Dispute requires human resolution
      break;
    case "refused_unwilling":
      prob = 0.05; // Explicit refusal
      break;
    case "unreachable_no_answer":
      prob = 0.35;
      break;
    case "unknown":
      prob = 0.45;
      break;
  }

  if (facts.sentiment === "positive") prob += 0.1;
  else if (facts.sentiment === "negative") prob -= 0.15;

  return clampProbability(prob);
}

function evaluateVoiceEligibility(facts: HinglishVoiceFacts): boolean {
  if (facts.customerOptedOut) return false;
  if (facts.callAttemptsCount >= 2) return false;
  // Eligible if amount is high enough OR digital channels were ignored
  return (
    facts.amountAtRiskMinor >= MIN_VOICE_CALL_AMOUNT_MINOR ||
    facts.digitalRemindersCount >= 2
  );
}

function chooseAction(
  facts: HinglishVoiceFacts,
  classification: HinglishVoiceIntent,
  probability: number,
): {
  actionType: RecoveryActionType;
  parameters: Record<string, string | number | boolean>;
} {
  if (facts.customerOptedOut) {
    return {
      actionType: "stop_case",
      parameters: {
        reason: "customer opted out of voice recovery communications",
      },
    };
  }

  // Pre-call stage: if no call interaction recorded yet, evaluate call eligibility
  if (!facts.voiceInteractionId && facts.recentActionCount === 0) {
    const isEligible = evaluateVoiceEligibility(facts);
    if (isEligible) {
      return {
        actionType: "start_voice_call",
        parameters: {
          language: facts.detectedLanguage ?? "HINGLISH",
          voiceProfile: "DEFAULT_HINGLISH",
          reason:
            "customer is eligible for Hinglish voice recovery conversation",
        },
      };
    }
    return {
      actionType: "send_email",
      parameters: {
        template: "digital-recovery-fallback",
        body: "Standard digital recovery reminder.",
      },
    };
  }

  // Post-call stage: select action based on extracted transcript intent
  switch (classification) {
    case "payment_link_requested":
      return {
        actionType: "send_payment_link",
        parameters: {
          amountMinor: facts.amountAtRiskMinor,
          currency: facts.currency,
          channel: "whatsapp",
          reason: "customer requested payment link during Hinglish voice call",
        },
      };

    case "promise_to_pay": {
      const defaultDate = new Date(
        Date.now() + 7 * 3600 * 24 * 1000,
      ).toISOString();
      return {
        actionType: "record_promise",
        parameters: {
          promisedDate: facts.promisedDate ?? defaultDate,
          amountMinor: facts.amountAtRiskMinor,
          source: "hinglish_voice_call",
        },
      };
    }

    case "technical_card_issue":
      return {
        actionType: "request_payment_method_update",
        parameters: {
          channel: "email",
          direction: "06_hinglish_voice",
          reason: "customer experienced technical card issue during voice call",
        },
      };

    case "disputed":
      return {
        actionType: "escalate_to_human",
        parameters: {
          reason: "customer raised billing dispute during Hinglish voice call",
          escalationTier: "account_manager",
        },
      };

    case "refused_unwilling":
      return {
        actionType: "stop_case",
        parameters: {
          reason:
            "customer explicitly refused renewal/payment during voice call",
        },
      };

    case "unreachable_no_answer":
      if (facts.callAttemptsCount < 2) {
        return {
          actionType: "send_whatsapp",
          parameters: {
            message:
              "Namaste! Humne aapko call karne ki koshish ki thi regarding your payment. Aap yahan payment complete kar sakte hain.",
          },
        };
      }
      return {
        actionType: "escalate_to_human",
        parameters: {
          reason: "customer unreachable after multiple voice call attempts",
          escalationTier: "operator",
        },
      };

    default:
      return {
        actionType: "send_payment_link",
        parameters: {
          amountMinor: facts.amountAtRiskMinor,
          currency: facts.currency,
          channel: "email",
        },
      };
  }
}

function shouldRecordRecoveryOnExecution(
  actionType: RecoveryActionType,
): boolean {
  return actionType === "send_payment_link";
}

export function analyzeHinglishVoice(
  facts: HinglishVoiceFacts,
): HinglishVoiceAnalysis {
  const classification = classifyIntentFromTranscript(facts);
  const probability = estimateRecoveryProbability(facts, classification);
  const expectedRecoverableMinor = Math.round(
    facts.amountAtRiskMinor * probability,
  );
  const action = chooseAction(facts, classification, probability);

  const observations = [
    `direction_06:classification=${classification}`,
    `direction_06:recovery_probability=${probability.toFixed(3)}`,
    `direction_06:expected_recoverable_minor=${expectedRecoverableMinor}`,
    `direction_06:voice_eligible=${evaluateVoiceEligibility(facts)}`,
    `direction_06:digital_reminders_count=${facts.digitalRemindersCount}`,
    `direction_06:call_attempts_count=${facts.callAttemptsCount}`,
  ];

  if (facts.voiceInteractionId) {
    observations.push(
      `direction_06:voice_interaction_id=${facts.voiceInteractionId}`,
    );
  }
  if (facts.detectedLanguage) {
    observations.push(
      `direction_06:detected_language=${facts.detectedLanguage}`,
    );
  }
  if (facts.sentiment) {
    observations.push(`direction_06:sentiment=${facts.sentiment}`);
  }
  if (facts.promisedDate) {
    observations.push(`direction_06:promised_date=${facts.promisedDate}`);
  }

  const rootCause = [
    `Hinglish voice call interaction classified as intent: ${classification}.`,
    facts.transcriptText
      ? `Transcript: "${facts.transcriptText.slice(0, 120)}..."`
      : "No transcript recorded yet.",
    `Customer sentiment is ${facts.sentiment ?? "neutral"}.`,
    `Selected ${action.actionType} to advance recovery conversation and capture commitment.`,
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

export function reasonOverHinglishVoiceFacts(
  facts: readonly string[],
): HinglishVoiceAnalysis | null {
  const hasDirection06 = facts.some(
    (f) =>
      f === "direction=06_hinglish_voice" ||
      f === "event_type=voice.call_completed" ||
      f.startsWith("direction_06:"),
  );

  if (!hasDirection06) return null;

  const parsed = parseHinglishVoiceFacts(facts);
  return analyzeHinglishVoice(parsed);
}
