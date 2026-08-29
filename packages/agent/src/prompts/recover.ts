import type { RecoveryDirectionCode } from "@recovery/types";

export interface ReasonerPromptInput {
  caseId: string;
  direction: RecoveryDirectionCode;
  facts: string[];
  customerContext?: Record<string, string | number | boolean>;
}

export interface ReasonerPrompt {
  system: string;
  user: string;
}

const ACTION_TYPES = [
  "retry_payment",
  "send_payment_link",
  "send_email",
  "send_sms",
  "send_whatsapp",
  "start_voice_call",
  "request_payment_method_update",
  "record_promise",
  "escalate_to_human",
  "stop_case",
  "schedule_retry",
].join(" | ");

export function buildReasonerPrompt(input: ReasonerPromptInput): ReasonerPrompt {
  const system = `You are a revenue recovery agent for case ${input.caseId} in direction ${input.direction}.
You will be given facts about a recovery case. Decide the single best next recovery step.

Output a single JSON object with this exact shape:
{
  "observations": string[],            // short bullet-style insights you extracted from the facts
  "rootCause": string,                 // one short sentence naming the most likely cause
  "recommendation": {
    "actionType": "<one of the recovery actions listed below>",
    "parameters"?: object,             // optional action-specific parameters as flat string|number|boolean values
    "expectedOutcomeMinor"?: integer,  // optional expected recovery amount in minor units (paise for INR)
    "confidence": number,              // number in [0, 1]
    "rationale": string                // one sentence explaining why this action fits the facts
  }
}

Recovery action types you may choose from:
${ACTION_TYPES}

Rules:
- Choose exactly one actionType.
- Do not propose any action outside the list above.
- Do not invent policy, customer consent, or external outcomes you cannot infer from the facts.
- Set confidence to a number between 0 and 1 (inclusive).
- expectedOutcomeMinor must be an integer if present.
- Output ONLY the JSON object. No prose, no markdown fences, no commentary.`;

  const facts = input.facts.length > 0 ? input.facts.map((f, i) => `${i + 1}. ${f}`).join("\n") : "(no facts provided)";
  const customerBlock = input.customerContext
    ? Object.entries(input.customerContext)
        .map(([k, v]) => `- ${k}: ${String(v)}`)
        .join("\n")
    : undefined;

  const user = `Case ID: ${input.caseId}
Direction: ${input.direction}

Facts:
${facts}
${customerBlock ? `\nCustomer context:\n${customerBlock}\n` : ""}
Decide the next recovery step. Output JSON only.`;

  return { system, user };
}
