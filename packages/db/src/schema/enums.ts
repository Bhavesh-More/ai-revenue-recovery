import { pgEnum } from "drizzle-orm/pg-core";

export const customerTypeEnum = pgEnum("customer_type", [
  "individual",
  "business",
]);

export const communicationChannelEnum = pgEnum("communication_channel", [
  "email",
  "sms",
  "whatsapp",
  "voice",
]);

export const recoveryDirectionEnum = pgEnum("recovery_direction", [
  "01_payment_degradation",
  "02_checkout_dropoff",
  "03_failed_subscription",
  "04_b2b_receivables",
  "05_mandate_retry",
  "06_hinglish_voice",
  "07_promise_to_pay",
]);

export type RecoveryDirection =
  (typeof recoveryDirectionEnum.enumValues)[number];

export const caseStateEnum = pgEnum("case_state", [
  "detected",
  "investigating",
  "action_selected",
  "waiting",
  "customer_action_required",
  "recovering",
  "escalated",
  "recovered",
  "stopped",
  "failed",
]);

export const riskTierEnum = pgEnum("risk_tier", [
  "low",
  "medium",
  "high",
  "critical",
]);

export const revenueEventTypeEnum = pgEnum("revenue_event_type", [
  "payment.failed",
  "payment.succeeded",
  "checkout.abandoned",
  "subscription.renewal_failed",
  "invoice.overdue",
  "mandate.failed",
  "customer.responded",
  "voice.call_completed",
  "promise.created",
  "promise.due",
  "promise.broken",
  "promise.fulfilled",
]);

export const failureReasonEnum = pgEnum("failure_reason", [
  "card_expired",
  "insufficient_funds",
  "bank_decline",
  "authentication_required",
  "network_error",
  "mandate_inactive",
  "provider_degradation",
  "unknown",
]);

export const recoveryActionTypeEnum = pgEnum("recovery_action_type", [
  "retry_payment",
  "send_payment_link",
  "send_resume_checkout_link",
  "send_email",
  "send_sms",
  "send_whatsapp",
  "start_voice_call",
  "request_payment_method_update",
  "record_promise",
  "escalate_to_human",
  "stop_case",
  "schedule_retry",
]);

export const actionStatusEnum = pgEnum("action_status", [
  "pending",
  "approved",
  "rejected",
  "in_progress",
  "succeeded",
  "failed",
  "cancelled",
]);

export const policyDecisionEnum = pgEnum("policy_decision", [
  "allow",
  "deny",
  "require_approval",
]);

export const auditActionEnum = pgEnum("audit_action", [
  "event_detected",
  "context_retrieved",
  "decision_created",
  "decision_failed",
  "policy_checked",
  "action_executed",
  "action_failed",
  "communication_sent",
  "outcome_received",
  "escalation",
  "recovery",
  "stop",
]);

export const batchStatusEnum = pgEnum("batch_status", [
  "created",
  "running",
  "completed",
  "failed",
  "cancelled",
]);

export const promiseTypeEnum = pgEnum("promise_type", [
  "firm",
  "tentative",
  "conditional",
  "informational",
]);

export const promiseStatusEnum = pgEnum("promise_status", [
  "pending",
  "due",
  "fulfilled",
  "partial",
  "broken",
  "rescheduled",
]);

export const checkoutLastStepEnum = pgEnum("checkout_last_step", [
  "cart",
  "address",
  "payment",
  "review",
]);

export const mandateStateEnum = pgEnum("mandate_state", [
  "active",
  "paused",
  "cancelled",
  "expired",
  "unknown",
]);

export const agentDecisionTypeEnum = pgEnum("agent_decision_type", [
  "analyze",
  "recovery",
]);

export const agentDecisionStatusEnum = pgEnum("agent_decision_status", [
  "pending",
  "awaiting_approval",
  "approved",
  "rejected",
  "executed",
  "failed",
  "stopped",
]);