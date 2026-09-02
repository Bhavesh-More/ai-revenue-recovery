import { eq, desc } from "drizzle-orm";
import { customers, recoveryActions, revenueEvents } from "@recovery/db/schema";
import { auditService } from "@recovery/audit";
import { caseLifecycle } from "@recovery/case-lifecycle";
import { policyService } from "@recovery/policy";
import type { AgentStateType } from "../state.js";

export interface LoadContextDeps {
  db: any;
}

function pushIfPresent(facts: string[], key: string, value: unknown): void {
  if (value === undefined || value === null || value === "") return;
  facts.push(`${key}=${String(value)}`);
}

function payloadRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

export function loadContextNode(deps: LoadContextDeps) {
  return async (state: AgentStateType): Promise<Partial<AgentStateType>> => {
    const caseRow = await caseLifecycle.findById(state.caseId);

    const [custRow] = await deps.db
      .select()
      .from(customers)
      .where(eq(customers.id, caseRow.customerId))
      .limit(1);

    const recentActions = await deps.db
      .select()
      .from(recoveryActions)
      .where(eq(recoveryActions.caseId, state.caseId))
      .orderBy(desc(recoveryActions.createdAt))
      .limit(25);

    const [originatingEvent] = await deps.db
      .select()
      .from(revenueEvents)
      .where(eq(revenueEvents.id, caseRow.originatingEventId))
      .limit(1);

    const policy = await policyService.findApplicable(caseRow.direction);

    const facts: string[] = [
      `case_id=${state.caseId}`,
      `direction=${caseRow.direction}`,
      `state=${caseRow.currentState}`,
      `risk_tier=${caseRow.riskTier}`,
      `attempt_count=${caseRow.attemptCount}`,
      `amount_minor=${caseRow.amountAtRiskMinor.toString()}`,
      `currency=${caseRow.currency}`,
      `customer_opted_out=${custRow?.optedOut ?? false}`,
      `customer_cancelled=false`,
      `recent_action_count=${recentActions.length}`,
      `policy_id=${policy.id}`,
    ];

    const history = payloadRecord(custRow?.history);
    const risk = payloadRecord(custRow?.risk);
    pushIfPresent(
      facts,
      "customer_successful_payments",
      history.successfulPayments,
    );
    pushIfPresent(facts, "customer_failed_payments", history.failedPayments);
    pushIfPresent(facts, "customer_tenure_months", history.tenureMonths);
    pushIfPresent(facts, "recovery_probability_hint", risk.recoveryProbability);

    if (originatingEvent) {
      const payload = payloadRecord(originatingEvent.payload);
      pushIfPresent(facts, "event_type", originatingEvent.type);
      pushIfPresent(facts, "event_source", originatingEvent.source);
      pushIfPresent(facts, "event_external_id", originatingEvent.externalId);
      // payment-degradation (direction 01) fields
      pushIfPresent(facts, "payment_id", payload.paymentId);
      pushIfPresent(facts, "failure_reason", payload.failureReason);
      pushIfPresent(facts, "provider", payload.provider);
      pushIfPresent(facts, "provider_code", payload.providerCode);
      pushIfPresent(facts, "payment_method", payload.paymentMethod);
      pushIfPresent(facts, "bank", payload.bank);
      pushIfPresent(facts, "region", payload.region);
      pushIfPresent(facts, "attempt_count", payload.attemptCount);
      pushIfPresent(
        facts,
        "baseline_success_rate",
        payload.baselineSuccessRate,
      );
      pushIfPresent(facts, "current_success_rate", payload.currentSuccessRate);
      pushIfPresent(
        facts,
        "similar_failure_count",
        payload.similarFailureCount,
      );
      pushIfPresent(
        facts,
        "affected_customer_count",
        payload.affectedCustomerCount,
      );
      pushIfPresent(facts, "time_window_minutes", payload.timeWindowMinutes);
      // checkout drop-off fields
      pushIfPresent(facts, "last_seen_page", payload.lastStep);
      pushIfPresent(
        facts,
        "abandonment_duration_minutes",
        payload.abandonmentDurationMinutes,
      );
      pushIfPresent(facts, "cart_value_minor", payload.cartValueMinor);
      pushIfPresent(facts, "shipping_cost_minor", payload.shippingCostMinor);
      pushIfPresent(
        facts,
        "technical_errors_count",
        payload.technicalErrorsCount,
      );
      pushIfPresent(facts, "intent_score", payload.intentScore);
      pushIfPresent(
        facts,
        "previous_abandoned_count",
        payload.previousAbandonedCount,
      );
      // failed subscription fields
      pushIfPresent(facts, "subscription_id", payload.subscriptionId);
      pushIfPresent(facts, "plan_id", payload.planId);
      pushIfPresent(facts, "billing_cycle", payload.billingCycle);
      pushIfPresent(facts, "tenure_months", payload.tenureMonths);
      pushIfPresent(
        facts,
        "previous_successful_renewals",
        payload.previousSuccessfulRenewals,
      );
      pushIfPresent(facts, "failed_renewal_count", payload.failedRenewalCount);
      pushIfPresent(
        facts,
        "grace_period_days_remaining",
        payload.gracePeriodDaysRemaining,
      );
      pushIfPresent(facts, "mrr_minor", payload.mrrMinor);
      pushIfPresent(facts, "estimated_ltv_minor", payload.estimatedLtvMinor);
      // B2B receivables fields
      pushIfPresent(facts, "invoice_id", payload.invoiceId);
      pushIfPresent(facts, "invoice_number", payload.invoiceNumber);
      pushIfPresent(facts, "days_overdue", payload.daysOverdue);
      pushIfPresent(facts, "due_date", payload.dueDate);
      pushIfPresent(facts, "payment_terms", payload.paymentTerms);
      pushIfPresent(facts, "company_name", payload.companyName);
      pushIfPresent(facts, "contact_email", payload.contactEmail);
      pushIfPresent(
        facts,
        "purchase_order_number",
        payload.purchaseOrderNumber,
      );
      pushIfPresent(facts, "dispute_status", payload.disputeStatus);
      pushIfPresent(
        facts,
        "historical_avg_delay_days",
        payload.historicalAvgDelayDays,
      );
      pushIfPresent(
        facts,
        "broken_promises_count",
        payload.brokenPromisesCount,
      );
      // mandate retry fields
      pushIfPresent(facts, "mandate_id", payload.mandateId);
      pushIfPresent(facts, "mandate_state", payload.mandateState);
      pushIfPresent(facts, "consecutive_failures", payload.consecutiveFailures);
      pushIfPresent(facts, "successful_debits_count", payload.successfulDebitsCount);
      pushIfPresent(facts, "bank_degradation_hint", payload.bankDegradationHint);
      // Hinglish voice fields
      pushIfPresent(facts, "voice_interaction_id", payload.interactionId);
      pushIfPresent(facts, "call_duration_seconds", payload.callDurationSeconds);
      pushIfPresent(facts, "transcript_text", payload.transcriptText);
      pushIfPresent(facts, "detected_language", payload.detectedLanguage);
      pushIfPresent(facts, "sentiment", payload.sentiment);
      pushIfPresent(facts, "voice_intent", payload.voiceIntent);
      pushIfPresent(facts, "promised_date", payload.promisedDate);
    }

    await auditService.record({
      caseId: state.caseId,
      action: "context_retrieved",
      summary: `Loaded ${facts.length} facts for case ${state.caseId}.`,
      detail: {
        runId: state.runId,
        factsCount: facts.length,
        policyId: policy.id,
      },
      actor: "agent:loadContext",
    });

    return {
      phase: "context_loaded",
      observations: facts,
    };
  };
}
