import { END, START, StateGraph } from "@langchain/langgraph";
import { AgentState, type AgentStateType } from "./state.js";
import type { Reasoner } from "./reasoner.js";
import type { DecisionService } from "./decision-service.js";
import { loadContextNode } from "./nodes/load-context.js";
import { reasonNode } from "./nodes/reason.js";
import { checkPolicyNode } from "./nodes/check-policy.js";
import { createDecisionNode } from "./nodes/create-decision.js";
import { waitForApprovalNode } from "./nodes/wait-for-approval.js";
import { executeNode } from "./nodes/execute.js";
import { recordOutcomeNode } from "./nodes/record-outcome.js";

export interface BuildGraphDeps {
  db: any;
  reasoner: Reasoner;
  decisionService: DecisionService;
}

export function buildRecoveryGraph(deps: BuildGraphDeps) {
  return new StateGraph(AgentState)
    .addNode("loadContext", loadContextNode({ db: deps.db }))
    .addNode("reason", reasonNode(deps))
    .addNode("checkPolicy", checkPolicyNode(deps))
    .addNode(
      "createDecision",
      createDecisionNode({
        decisionService: deps.decisionService,
      }),
    )
    .addNode("waitForApproval", waitForApprovalNode({}))
    .addNode("execute", executeNode({ db: deps.db }))
    .addNode("recordOutcome", recordOutcomeNode())

    .addEdge(START, "loadContext")
    .addEdge("loadContext", "reason")
    .addEdge("reason", "checkPolicy")
    .addEdge("checkPolicy", "createDecision")

    .addConditionalEdges(
      "createDecision",
      (s: AgentStateType) => {
        if (!s.policyResult) return "deny";

        if (s.policyResult.decision === "deny") {
          return "deny";
        }

        if (s.policyResult.decision === "require_approval") {
          return "wait";
        }

        return "execute";
      },
      {
        deny: "recordOutcome",
        wait: "waitForApproval",
        execute: "execute",
      },
    )

    .addConditionalEdges(
      "waitForApproval",
      (s: AgentStateType) => {
        if (s.approval?.status === "approved") {
          return "execute";
        }

        return "deny";
      },
      {
        execute: "execute",
        deny: "recordOutcome",
      },
    )
    .addEdge("execute", "recordOutcome")
    .addEdge("recordOutcome", END);
}
