import { eq, desc } from "drizzle-orm";
import {
  customers,
  recoveryActions,
} from "@recovery/db/schema";
import { auditService } from "@recovery/audit";
import { caseLifecycle } from "@recovery/case-lifecycle";
import { policyService } from "@recovery/policy";
import type { AgentStateType } from "../state.js";

export interface LoadContextDeps {
  db: any;
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

    const policy = await policyService.findApplicable(caseRow.direction);

    const facts: string[] = [
      `direction=${caseRow.direction}`,
      `state=${caseRow.currentState}`,
      `risk_tier=${caseRow.riskTier}`,
      `attempt_count=${caseRow.attemptCount}`,
      `amount_minor=${caseRow.amountAtRiskMinor.toString()}`,
      `customer_opted_out=${custRow?.optedOut ?? false}`,
      `customer_cancelled=false`,
      `recent_action_count=${recentActions.length}`,
      `policy_id=${policy.id}`,
    ];

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
