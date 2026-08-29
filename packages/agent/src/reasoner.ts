import type {
  RecoveryActionType,
  RecoveryDirectionCode,
} from "@recovery/types";
import type { AgentRecommendation } from "./state.js";

export interface ReasonerInput {
  caseId: string;
  direction: RecoveryDirectionCode;
  facts: string[];
  customerContext?: Record<string, string | number | boolean>;
}

export interface ReasonerOutput {
  observations: string[];
  rootCause: string;
  recommendation: AgentRecommendation;
}

export interface Reasoner {
  reason(input: ReasonerInput): Promise<ReasonerOutput>;
}

export class StubReasoner implements Reasoner {
  async reason(input: ReasonerInput): Promise<ReasonerOutput> {
    const facts = input.facts.map((f) => f.toLowerCase()).join("|");
    let actionType: RecoveryActionType = "retry_payment";
    const observations: string[] = [`[stub] case=${input.caseId}`];

    if (facts.includes("card_expired")) {
      actionType = "request_payment_method_update";
      observations.push("[stub] detected card_expired");
    } else if (facts.includes("insufficient_funds")) {
      actionType = "schedule_retry";
      observations.push("[stub] detected insufficient_funds");
    } else if (facts.includes("mandate_inactive")) {
      actionType = "send_payment_link";
      observations.push("[stub] detected mandate_inactive");
    } else if (facts.includes("abandoned")) {
      actionType = "send_email";
      observations.push("[stub] detected abandonment");
    } else if (facts.includes("invoice") || facts.includes("overdue")) {
      actionType = "send_email";
      observations.push("[stub] detected overdue invoice");
    }

    return {
      observations,
      rootCause: "stub-classification",
      recommendation: {
        actionType,
        confidence: 0.5,
        rationale: `[stub] ${input.direction} → ${actionType}`,
        ...(actionType === "send_payment_link" ||
        actionType === "retry_payment"
          ? { expectedOutcomeMinor: 100_000 }
          : {}),
      },
    };
  }
}

export class StaticReasoner implements Reasoner {
  constructor(private readonly output: ReasonerOutput) {}

  async reason(): Promise<ReasonerOutput> {
    return this.output;
  }
}
