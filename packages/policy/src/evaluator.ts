import type { RecoveryActionType } from "@recovery/types";

export type Channel = "email" | "sms" | "whatsapp" | "voice";

const RETRY_ACTION_TYPES: readonly RecoveryActionType[] = [
  "retry_payment",
  "schedule_retry",
  "send_payment_link",
];

const COMMUNICATION_ACTION_TYPES: readonly RecoveryActionType[] = [
  "send_email",
  "send_sms",
  "send_whatsapp",
  "send_resume_checkout_link",
  "start_voice_call",
];

const FINANCIAL_ACTION_TYPES: readonly RecoveryActionType[] = [
  "send_payment_link",
  "request_payment_method_update",
];

function isRetryAction(t: RecoveryActionType): boolean {
  return RETRY_ACTION_TYPES.includes(t);
}

function isCommunicationAction(t: RecoveryActionType): boolean {
  return COMMUNICATION_ACTION_TYPES.includes(t);
}

function isFinancialAction(t: RecoveryActionType): boolean {
  return FINANCIAL_ACTION_TYPES.includes(t);
}

export interface PolicyLimits {
  retry: {
    maxPaymentRetries: number;
    minRetryIntervalSeconds: number;
    maxCaseAgeSeconds: number;
  };
  communication: {
    maxMessages: number;
    minMessageIntervalSeconds: number;
    allowedChannels: Channel[];
  };
  financial: {
    highValueApprovalThreshold: {
      amountMinor: number | bigint;
      currency: string;
    };
    maxDiscountMinor: number;
    maxPlanDurationDays: number;
  };
  escalation: {
    escalateOnRepeatedFailure: number;
    escalateOnBrokenPromise: boolean;
    escalateOnDispute: boolean;
    escalateOnHighValue: boolean;
  };
  stop: {
    stopOnOptOut: boolean;
    stopOnCancel: boolean;
    stopOnMaxAttempts: boolean;
    stopOnHumanTakeover: boolean;
  };
}

export interface EvaluationContext {
  customerOptedOut: boolean;
  customerCancelled: boolean;
  caseEscalated: boolean;
  actionAttemptCount: number;
  // Created/executed timestamp of the most recent action
  lastActionAt?: Date;
  // Count of communication-type actions on this case so far
  messagesSentCount: number;
  // Proposed amount for the action being evaluated (if applicable)
  proposedAmountMinor?: number;
}

export type PolicyDecisionResult = "allow" | "deny" | "require_approval";

export interface PolicyEvaluationOutput {
  decision: PolicyDecisionResult;
  reasons: string[];
  requiresApprovalFrom?: "operator" | "account_manager" | "human";
}

function channelForAction(t: RecoveryActionType): Channel | undefined {
  switch (t) {
    case "send_email":
      return "email";
    case "send_sms":
      return "sms";
    case "send_whatsapp":
      return "whatsapp";
    case "start_voice_call":
      return "voice";
    default:
      return undefined;
  }
}

export function evaluatePolicy(
  limits: PolicyLimits,
  proposedActionType: RecoveryActionType,
  ctx: EvaluationContext,
): PolicyEvaluationOutput {
  // 1. Stop rules
  if (limits.stop.stopOnOptOut && ctx.customerOptedOut) {
    return { decision: "deny", reasons: ["customer opted out"] };
  }
  if (limits.stop.stopOnCancel && ctx.customerCancelled) {
    return { decision: "deny", reasons: ["customer cancelled"] };
  }
  if (limits.stop.stopOnHumanTakeover && ctx.caseEscalated) {
    return { decision: "deny", reasons: ["human takeover in progress"] };
  }

  const reasons: string[] = [];
  let decision: PolicyDecisionResult = "allow";
  let requiresApprovalFrom: "operator" | "account_manager" | "human" | undefined;

  // 2. Retry limits
  if (isRetryAction(proposedActionType)) {
    if (limits.stop.stopOnMaxAttempts && ctx.actionAttemptCount >= limits.retry.maxPaymentRetries) {
      return {
        decision: "deny",
        reasons: ["max payment retries reached"],
      };
    }
    if (ctx.lastActionAt) {
      const elapsedSeconds =
        (Date.now() - ctx.lastActionAt.getTime()) / 1000;
      if (elapsedSeconds < limits.retry.minRetryIntervalSeconds) {
        return {
          decision: "deny",
          reasons: ["min retry interval not elapsed"],
        };
      }
    }
  }

  // 3. Communication limits.
  if (isCommunicationAction(proposedActionType)) {
    if (ctx.messagesSentCount >= limits.communication.maxMessages) {
      return {
        decision: "deny",
        reasons: ["max messages reached"],
      };
    }
    const channel = channelForAction(proposedActionType);
    if (
      channel !== undefined &&
      !limits.communication.allowedChannels.includes(channel)
    ) {
      return {
        decision: "deny",
        reasons: ["channel not allowed"],
      };
    }
  }

  // 4. Financial limits + escalation rules
  const threshold = Number(limits.financial.highValueApprovalThreshold.amountMinor);
  if (isFinancialAction(proposedActionType) && ctx.proposedAmountMinor !== undefined) {
    if (ctx.proposedAmountMinor >= threshold) {
      decision = "require_approval";
      requiresApprovalFrom = "operator";
      reasons.push("greater than set default threshold for financial action");
    }
  }

  // If high value escalation is enabled AND amount >= threshold then require approval, even if the action isn't financial.
  if (limits.escalation.escalateOnHighValue && ctx.proposedAmountMinor !== undefined) {
    if (ctx.proposedAmountMinor >= threshold) {
      decision = "require_approval";
      // if requiresApprovalFrom is already set to "operator" from the financial check, we don't want to override it with "account_manager". So we only set it if it's not already set.
      requiresApprovalFrom = requiresApprovalFrom ?? "account_manager";
      if (!reasons.includes("high-value escalation")) {
        reasons.push("high-value escalation");
      }
    }
  }

  // If an action has failed/repeated enough times → require approval.
  if (limits.escalation.escalateOnRepeatedFailure > 0 && ctx.actionAttemptCount >= limits.escalation.escalateOnRepeatedFailure) {
    decision = "require_approval";
    requiresApprovalFrom = requiresApprovalFrom ?? "operator";
    if (!reasons.includes("repeated failure escalation")) {
      reasons.push("repeated failure escalation");
    }
  }

  return { decision, reasons, requiresApprovalFrom };
}
