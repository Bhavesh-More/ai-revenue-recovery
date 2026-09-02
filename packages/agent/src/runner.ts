import { randomUUID } from "node:crypto";
import { Command, MemorySaver } from "@langchain/langgraph";
import { db } from "@recovery/db";
import { buildRecoveryGraph } from "./graph.js";
import { type Reasoner } from "./reasoner.js";
import { loadReasonerFromEnv } from "./reasoner-factory.js";
import { decisionService, type DecisionService } from "./decision-service.js";
import type { AgentDecisionRow } from "@recovery/db/schema";
import type { AgentStateType } from "./state.js";
import { CaseNotFoundError } from "@recovery/case-lifecycle";
import { caseLifecycle } from "@recovery/case-lifecycle";
import { registerDefaultAgentTools } from "./tools/register-default-tools.js";
import { TRACING_CONFIG, tracingMetadata, tracingTags } from "./tracing.js";
import { agentJobTracker } from "./job-tracker.js";

registerDefaultAgentTools();

type TraceableFn = <T extends (...args: any[]) => any>(fn: T, opts: any) => T;

let traceable: TraceableFn | undefined;
try {
  const mod = require("langsmith/traceable") as
    | { traceable: TraceableFn }
    | undefined;
  traceable = mod?.traceable;
} catch {
  traceable = undefined;
}

export type RunMode = "AGENT_CONTROLLED" | "MANUAL";

export interface RunAnalysisInput {
  caseId: string;
  mode?: RunMode;
  actor?: string;
}

export interface ResumeDecisionInput {
  decisionId: string;
  approved: boolean;
  actor: string;
  reason?: string;
}

export class AgentRunner {
  private readonly checkpointer = new MemorySaver();

  constructor(
    private readonly _db: typeof db,
    private readonly _decisionService: DecisionService = decisionService,
    private readonly reasoner: Reasoner = loadReasonerFromEnv(),
  ) {}

  private async buildAndInvoke(
    caseId: string,
    runId: string,
  ): Promise<AgentStateType> {
    const graph = buildRecoveryGraph({
      db: this._db,
      reasoner: this.reasoner,
      decisionService: this._decisionService,
    }).compile({ checkpointer: this.checkpointer });

    const initial: Partial<AgentStateType> = {
      caseId,
      runId,
      phase: "context_loaded",
      observations: [],
    };

    const result = await graph.invoke(initial, {
      configurable: { thread_id: caseId },
    });
    return result as AgentStateType;
  }

  private async runAnalysisImpl(
    input: RunAnalysisInput,
  ): Promise<AgentDecisionRow> {
    try {
      await caseLifecycle.findById(input.caseId);
    } catch (err) {
      if (err instanceof CaseNotFoundError) {
        throw err;
      }
      throw err;
    }

    const runId = randomUUID();
    agentJobTracker.createJob(runId, input.caseId, "RECOVERY_ANALYSIS");
    agentJobTracker.addJobEvent(runId, "LOAD_CONTEXT", `Loading customer & payment context for case ${input.caseId}`);

    const state = await this.buildAndInvoke(input.caseId, runId);

    agentJobTracker.addJobEvent(runId, "POLICY_CHECK", `Checked recovery policy rules and stopping criteria`);
    agentJobTracker.addJobEvent(runId, "AI_REASONING", `AI agent reasoned next recovery action (Phase: ${state.phase})`);
    agentJobTracker.updateJobStatus(runId, "SUCCEEDED", 100);

    const decision = await this._decisionService.findByRunId(runId);

    if (!decision) {
      throw new Error(`Agent finished without decision for run ${runId}`);
    }

    if (decision.status === "pending") {
      if (state.phase === "outcome_recorded" || state.phase === "executed") {
        return this._decisionService.transition(decision.id, "executed", {
          outcomeReason: state.outcome?.reason ?? "[stub] executed",
          outcomeRecoveredMinor: state.outcome?.recoveredMinor ?? 0,
          outcomePromisedMinor: state.outcome?.promisedMinor ?? 0,
        });
      }
      if (state.phase === "failed") {
        return this._decisionService.transition(decision.id, "failed", {
          outcomeReason: state.error?.message ?? "Execution failed",
        });
      }
    }

    return decision;
  }

  private async resumeDecisionImpl(
    input: ResumeDecisionInput,
  ): Promise<AgentDecisionRow> {
    const decision = await this._decisionService.findById(input.decisionId);

    if (decision.status !== "awaiting_approval") {
      throw new Error(
        `Decision ${input.decisionId} is in status '${decision.status}', not 'awaiting_approval'.`,
      );
    }

    const graph = buildRecoveryGraph({
      db: this._db,
      reasoner: this.reasoner,
      decisionService: this._decisionService,
    }).compile({ checkpointer: this.checkpointer });

    const resumed = await graph.invoke(
      new Command({
        resume: {
          approved: input.approved,
          actor: input.actor,
          reason: input.reason,
        },
      }),
      {
        configurable: {
          thread_id: decision.caseId,
        },
      },
    );

    if (input.approved) {
      await this._decisionService.transition(decision.id, "approved", {
        approvedBy: input.actor,
      });

      const finalRecovered = Number(
        (resumed as AgentStateType | undefined)?.outcome?.recoveredMinor ?? 0,
      );

      const finalPromised = Number(
        (resumed as AgentStateType | undefined)?.outcome?.promisedMinor ?? 0,
      );

      await this._decisionService.transition(decision.id, "executed", {
        outcomeRecoveredMinor: finalRecovered,
        outcomePromisedMinor: finalPromised,
        outcomeReason:
          (resumed as AgentStateType | undefined)?.outcome?.reason ??
          input.reason ??
          "[stub] approved",
      });

      if (finalRecovered > 0) {
        await caseLifecycle.recordOutcome({
          caseId: decision.caseId,
          recoveredMinor: finalRecovered,
          promisedMinor: finalPromised,
          reason: input.reason,
          actor: "agent:runner",
        });
      }
    } else {
      await this._decisionService.transition(decision.id, "rejected", {
        rejectedReason: input.reason ?? "rejected",
      });

      await this._decisionService.transition(decision.id, "stopped", {
        outcomeReason: input.reason ?? "rejected",
      });

      await caseLifecycle.transition({
        caseId: decision.caseId,
        toState: "failed",
        reason: input.reason ?? "Decision rejected",
        actor: input.actor,
      });
    }

    return this._decisionService.findById(decision.id);
  }

  runAnalysis(input: RunAnalysisInput): Promise<AgentDecisionRow> {
    const fn = this.runAnalysisImpl.bind(this);
    if (!TRACING_CONFIG.enabled || !traceable) {
      return fn(input);
    }
    const traced = traceable(fn, {
      name: "agent.runAnalysis",
      run_type: "chain",
      tags: tracingTags({
        caseId: input.caseId,
        runId: "pending",
        actor: input.actor,
      }),
      metadata: tracingMetadata({ caseId: input.caseId, runId: "pending" }),
      processInputs: (i: RunAnalysisInput) => ({
        case_id: i.caseId,
        mode: i.mode ?? "AGENT_CONTROLLED",
        actor: i.actor ?? "system",
      }),
      processOutputs: (output: AgentDecisionRow) => ({
        decision_id: output.id,
        status: output.status,
        run_id: output.runId,
        policy_decision: (output.policyResult as any)?.decision ?? null,
      }),
    });
    return traced(input);
  }

  resumeDecision(input: ResumeDecisionInput): Promise<AgentDecisionRow> {
    const fn = this.resumeDecisionImpl.bind(this);
    if (!TRACING_CONFIG.enabled || !traceable) {
      return fn(input);
    }
    const traced = traceable(fn, {
      name: "agent.resumeDecision",
      run_type: "chain",
      tags: tracingTags({
        caseId: "pending",
        runId: "pending",
        actor: input.actor,
      }),
      processInputs: (i: ResumeDecisionInput) => ({
        decision_id: i.decisionId,
        approved: i.approved,
        actor: i.actor,
      }),
      processOutputs: (output: AgentDecisionRow) => ({
        decision_id: output.id,
        status: output.status,
        run_id: output.runId,
      }),
    });
    return traced(input);
  }

  findDecision(decisionId: string): Promise<AgentDecisionRow> {
    return this._decisionService.findById(decisionId);
  }

  listDecisionsByCaseId(
    caseId: string,
    limit: number,
    offset: number,
  ): Promise<AgentDecisionRow[]> {
    return this._decisionService.list({ caseId, limit, offset });
  }
}

export const agentRunner = new AgentRunner(db);
