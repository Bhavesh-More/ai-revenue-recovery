import { eq } from "drizzle-orm";
import { auditService } from "@recovery/audit";
import { caseLifecycle } from "@recovery/case-lifecycle";
import { recoveryCases } from "@recovery/db/schema";
import { agentReasonerOutputSchema } from "@recovery/validation";
import { reasonOverPaymentDegradationFacts } from "../directions/payment-degradation/analyzer.js";
import { reasonOverCheckoutDropoffFacts } from "../directions/checkout-dropoff/analyzer.js";
import type { AgentStateType } from "../state.js";
import type { Reasoner } from "../reasoner.js";
import type { DecisionService, AgentDecisionType } from "../decision-service.js";

export interface ReasonDeps {
  db: any;
  reasoner: Reasoner;
  decisionService: DecisionService;
}

export function reasonNode(deps: ReasonDeps) {
  return async (state: AgentStateType): Promise<Partial<AgentStateType>> => {
    const caseRow = await caseLifecycle.findById(state.caseId);
    const type: AgentDecisionType =
      state.phase === "context_loaded" ? "analyze" : "recovery";

    if (caseRow.direction === "01_payment_degradation") {
      const analysis = reasonOverPaymentDegradationFacts(state.observations ?? []);
      if (analysis) {
        await deps.db
          .update(recoveryCases)
          .set({
            recoveryProbability: analysis.recoveryProbability.toFixed(3),
            latestDecisionSummary: analysis.recommendation.rationale,
            updatedAt: new Date(),
          })
          .where(eq(recoveryCases.id, state.caseId));

        await auditService.record({
          caseId: state.caseId,
          action: "decision_created",
          summary: `Direction 01 classified payment degradation as ${analysis.classification}.`,
          detail: {
            runId: state.runId,
            decisionType: type,
            classification: analysis.classification,
            expectedRecoverableMinor: analysis.expectedRecoverableMinor,
            revenueAtRiskMinor: analysis.revenueAtRiskMinor,
          },
          actor: "agent:direction01",
        });

        return {
          phase: "reasoned",
          rootCause: analysis.rootCause,
          recommendation: analysis.recommendation,
          observations: analysis.observations,
        };
      }
    }

    if (caseRow.direction === "02_checkout_dropoff") {
      const analysis = reasonOverCheckoutDropoffFacts(state.observations ?? []);
      if (analysis) {
        await deps.db
          .update(recoveryCases)
          .set({
            recoveryProbability: analysis.recoveryProbability.toFixed(3),
            latestDecisionSummary: analysis.recommendation.rationale,
            updatedAt: new Date(),
          })
          .where(eq(recoveryCases.id, state.caseId));

        await auditService.record({
          caseId: state.caseId,
          action: "decision_created",
          summary: `Direction 02 classified checkout drop-off as ${analysis.classification}.`,
          detail: {
            runId: state.runId,
            decisionType: type,
            classification: analysis.classification,
            expectedRecoverableMinor: analysis.expectedRecoverableMinor,
            revenueAtRiskMinor: analysis.revenueAtRiskMinor,
          },
          actor: "agent:direction02",
        });

        return {
          phase: "reasoned",
          rootCause: analysis.rootCause,
          recommendation: analysis.recommendation,
          observations: analysis.observations,
        };
      }
    }

    const output = await deps.reasoner.reason({
      caseId: state.caseId,
      direction: caseRow.direction,
      facts: state.observations ?? [],
    });

    const parsed = agentReasonerOutputSchema.safeParse(output);
    if (!parsed.success) {
      const issues = parsed.error.issues.slice(0, 3);
      const issueSummary = issues
        .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
        .join("; ");
      await auditService.record({
        caseId: state.caseId,
        action: "decision_failed",
        summary: `Reasoner output failed validation for case ${state.caseId}: ${issueSummary}`,
        detail: {
          runId: state.runId,
          decisionType: type,
          issueCount: issues.length,
        },
        actor: "agent:reason",
      });
      return {
        phase: "failed",
        error: {
          code: "AGENT_ERROR",
          message: `Reasoner output failed validation: ${parsed.error.issues
            .slice(0, 3)
            .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
            .join("; ")}`,
          node: "reason",
        },
      };
    }

    return {
      phase: "reasoned",
      rootCause: parsed.data.rootCause,
      recommendation: parsed.data.recommendation,
      observations: parsed.data.observations,
    };
  };
}
