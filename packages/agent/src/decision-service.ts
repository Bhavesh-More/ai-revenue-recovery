import { and, desc, eq, type SQL } from "drizzle-orm";
import {
  agentDecisions,
  type AgentDecisionRow,
  type NewAgentDecisionRow,
} from "@recovery/db/schema";
import {
  DecisionNotFoundError,
  InvalidApprovalTransitionError,
} from "./errors.js";
import type { AgentPolicyResult } from "./state.js";
import { db } from "@recovery/db";

export type AgentDecisionStatus =
  | "pending"
  | "awaiting_approval"
  | "approved"
  | "rejected"
  | "executed"
  | "failed"
  | "stopped";

export type AgentDecisionType = "analyze" | "recovery";

export interface CreateDecisionInput {
  caseId: string;
  runId: string;
  type: AgentDecisionType;
  observations: string[];
  rootCause: string;
  recommendation: Record<string, unknown>;
  policyResult: AgentPolicyResult;
}

export interface ListDecisionsFilter {
  caseId?: string;
  runId?: string;
  status?: AgentDecisionStatus;
  limit?: number;
  offset?: number;
}

const ALLOWED_TRANSITIONS: Readonly<Record<AgentDecisionStatus, AgentDecisionStatus[]>> = {
  pending: ["awaiting_approval", "executed", "failed", "stopped"],
  awaiting_approval: ["approved", "rejected", "stopped"],
  approved: ["executed", "failed", "stopped"],
  rejected: ["stopped"],
  executed: ["stopped"],
  failed: [],
  stopped: [],
};

export class DecisionService {
  constructor(private readonly db: any) {}

  async create(
    input: CreateDecisionInput,
    tx?: any,
  ): Promise<AgentDecisionRow> {
    const handle = tx ?? this.db;
    const status = this.initialStatus(input.policyResult);
    const row: NewAgentDecisionRow = {
      caseId: input.caseId,
      runId: input.runId,
      type: input.type,
      status,
      observations: input.observations,
      rootCause: input.rootCause,
      recommendation: input.recommendation,
      policyResult: input.policyResult,
      approvalRequired: status === "awaiting_approval",
    };
    const [created] = await handle
      .insert(agentDecisions)
      .values(row)
      .returning();
    return created;
  }

  async findById(decisionId: string): Promise<AgentDecisionRow> {
    const [row] = await this.db
      .select()
      .from(agentDecisions)
      .where(eq(agentDecisions.id, decisionId))
      .limit(1);
    if (!row) throw new DecisionNotFoundError(decisionId);
    return row;
  }

  async findByIdOrNull(decisionId: string): Promise<AgentDecisionRow | null> {
    const [row] = await this.db
      .select()
      .from(agentDecisions)
      .where(eq(agentDecisions.id, decisionId))
      .limit(1);
    return row ?? null;
  }

  async findByRunId(runId: string): Promise<AgentDecisionRow | null> {
    const [row] = await this.db
      .select()
      .from(agentDecisions)
      .where(eq(agentDecisions.runId, runId))
      .limit(1);
    return row ?? null;
  }

  async transition(
    decisionId: string,
    toStatus: AgentDecisionStatus,
    extras: {
      approvedBy?: string;
      rejectedReason?: string;
      outcomeRecoveredMinor?: number | bigint;
      outcomePromisedMinor?: number | bigint;
      outcomeReason?: string;
    } = {},
  ): Promise<AgentDecisionRow> {
    return this.db.transaction(async (tx: any) => {
      const [current] = await tx
        .select()
        .from(agentDecisions)
        .where(eq(agentDecisions.id, decisionId))
        .limit(1);
      if (!current) throw new DecisionNotFoundError(decisionId);
      if (current.status === toStatus) return current;
      if (!ALLOWED_TRANSITIONS[current.status as AgentDecisionStatus].includes(toStatus)) {
        throw new InvalidApprovalTransitionError(current.status, toStatus);
      }
      const update: Partial<NewAgentDecisionRow> = {
        status: toStatus,
        updatedAt: new Date(),
      };
      if (extras.approvedBy !== undefined) {
        update.approvedBy = extras.approvedBy;
        update.approvedAt = new Date();
      }
      if (extras.rejectedReason !== undefined) {
        update.rejectedReason = extras.rejectedReason;
      }
      if (extras.outcomeRecoveredMinor !== undefined) {
        update.outcomeRecoveredMinor = BigInt(extras.outcomeRecoveredMinor);
      }
      if (extras.outcomePromisedMinor !== undefined) {
        update.outcomePromisedMinor = BigInt(extras.outcomePromisedMinor);
      }
      if (extras.outcomeReason !== undefined) {
        update.outcomeReason = extras.outcomeReason;
      }
      const [updated] = await tx
        .update(agentDecisions)
        .set(update)
        .where(eq(agentDecisions.id, decisionId))
        .returning();
      return updated;
    });
  }

  async list(filter: ListDecisionsFilter = {}): Promise<AgentDecisionRow[]> {
    const limit = Math.min(Math.max(filter.limit ?? 50, 1), 200);
    const offset = Math.max(filter.offset ?? 0, 0);
    const conditions: SQL[] = [];
    if (filter.caseId) conditions.push(eq(agentDecisions.caseId, filter.caseId));
    if (filter.runId) conditions.push(eq(agentDecisions.runId, filter.runId));
    if (filter.status) {
      conditions.push(eq(agentDecisions.status, filter.status));
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;
    return this.db
      .select()
      .from(agentDecisions)
      .where(where)
      .orderBy(desc(agentDecisions.createdAt))
      .limit(limit)
      .offset(offset);
  }

  private initialStatus(policyResult: AgentPolicyResult): AgentDecisionStatus {
    if (policyResult.decision === "deny") return "stopped";
    if (policyResult.decision === "require_approval") return "awaiting_approval";
    return "pending";
  }
}

export const decisionService = new DecisionService(db);
