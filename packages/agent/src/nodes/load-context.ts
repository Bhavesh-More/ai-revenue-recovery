import { eq, desc } from "drizzle-orm";
import {
  customers,
  recoveryActions,
  revenueEvents,
} from "@recovery/db/schema";
import { auditService } from "@recovery/audit";
import { caseLifecycle } from "@recovery/case-lifecycle";
import { policyService } from "@recovery/policy";
import type { AgentStateType } from "../state.js";

export interface LoadContextDeps {
  db: any;
}

function pushIfPresent(
  facts: string[],
  key: string,
  value: unknown,
): void {
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
    pushIfPresent(facts, "customer_successful_payments", history.successfulPayments);
    pushIfPresent(facts, "customer_failed_payments", history.failedPayments);
    pushIfPresent(facts, "customer_tenure_months", history.tenureMonths);
    pushIfPresent(facts, "recovery_probability_hint", risk.recoveryProbability);

    if (originatingEvent) {
      const payload = payloadRecord(originatingEvent.payload);
      pushIfPresent(facts, "event_type", originatingEvent.type);
      pushIfPresent(facts, "event_source", originatingEvent.source);
      pushIfPresent(facts, "event_external_id", originatingEvent.externalId);
      pushIfPresent(facts, "payment_id", payload.paymentId);
      pushIfPresent(facts, "failure_reason", payload.failureReason);
      pushIfPresent(facts, "provider", payload.provider);
      pushIfPresent(facts, "provider_code", payload.providerCode);
      pushIfPresent(facts, "payment_method", payload.paymentMethod);
      pushIfPresent(facts, "bank", payload.bank);
      pushIfPresent(facts, "region", payload.region);
      pushIfPresent(facts, "attempt_count", payload.attemptCount);
      pushIfPresent(facts, "baseline_success_rate", payload.baselineSuccessRate);
      pushIfPresent(facts, "current_success_rate", payload.currentSuccessRate);
      pushIfPresent(facts, "similar_failure_count", payload.similarFailureCount);
      pushIfPresent(facts, "affected_customer_count", payload.affectedCustomerCount);
      pushIfPresent(facts, "time_window_minutes", payload.timeWindowMinutes);
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
