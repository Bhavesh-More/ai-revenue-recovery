import { eq, desc, and, type SQL } from "drizzle-orm";
import type { PgTransaction } from "drizzle-orm/pg-core";
import {
  auditEvents,
  recoveryCases,
  type RecoveryCaseRow,
  type NewRecoveryCaseRow,
} from "@recovery/db/schema";
import type {
  CaseState,
  RiskTier,
  RecoveryDirectionCode,
} from "@recovery/types";
import {
  TRANSITION_AUDIT_ACTION,
  assertTransition,
  canTransition,
} from "./transitions.js";
import { CaseAlreadyTerminalError, CaseNotFoundError } from "./errors.js";

export interface CreateCaseInput {
  customerId: string;
  originatingEventId: string;
  direction: RecoveryDirectionCode;
  amountAtRiskMinor: number;
  currency: string;
  recoveryProbability?: number;
  riskTier?: RiskTier;
  batchId?: string;
  actor?: string;
}

export interface TransitionInput {
  caseId: string;
  toState: CaseState;
  reason?: string;
  actor: string;
  decisionId?: string;
}

export interface RecordOutcomeInput {
  caseId: string;
  recoveredMinor: number;
  promisedMinor?: number;
  reason?: string;
  actor: string;
}

export interface ListFilter {
  direction?: RecoveryDirectionCode;
  state?: CaseState;
  batchId?: string;
  customerId?: string;
  limit?: number;
  offset?: number;
}

export class CaseLifecycleService {
  constructor(private readonly db: any) {}

  async create(input: CreateCaseInput): Promise<RecoveryCaseRow> {
    const row: NewRecoveryCaseRow = {
      customerId: input.customerId,
      originatingEventId: input.originatingEventId,
      direction: input.direction,
      currentState: "detected",
      amountAtRiskMinor: input.amountAtRiskMinor,
      currency: input.currency,
      recoveryProbability: (input.recoveryProbability ?? 0).toFixed(3),
      riskTier: input.riskTier ?? "medium",
      batchId: input.batchId ?? null,
    };

    return this.db.transaction(async (tx: PgTransaction<any, any, any>) => {
      const [created] = await tx.insert(recoveryCases).values(row).returning();

      await this.recordAudit(
        {
          caseId: created.id,
          action: TRANSITION_AUDIT_ACTION.detected,
          summary: `Recovery case opened from event ${input.originatingEventId}.`,
          detail: {
            direction: input.direction,
            amountAtRiskMinor: input.amountAtRiskMinor,
            currency: input.currency,
            riskTier: input.riskTier ?? "medium",
          },
          actor: input.actor ?? "system",
        },
        tx,
      );

      return created;
    });
  }

  async findById(caseId: string): Promise<RecoveryCaseRow> {
    const [row] = await this.db
      .select()
      .from(recoveryCases)
      .where(eq(recoveryCases.id, caseId))
      .limit(1);
    if (!row) throw new CaseNotFoundError(caseId);
    return row;
  }

  async findByIdOrNull(caseId: string): Promise<RecoveryCaseRow | null> {
    const [row] = await this.db
      .select()
      .from(recoveryCases)
      .where(eq(recoveryCases.id, caseId))
      .limit(1);
    return row ?? null;
  }

  async list(filter: ListFilter = {}): Promise<RecoveryCaseRow[]> {
    const limit = Math.min(Math.max(filter.limit ?? 50, 1), 200);
    const offset = Math.max(filter.offset ?? 0, 0);

    const conditions: SQL[] = [];
    if (filter.direction) {
      conditions.push(eq(recoveryCases.direction, filter.direction));
    }
    if (filter.state) {
      conditions.push(eq(recoveryCases.currentState, filter.state));
    }
    if (filter.batchId) {
      conditions.push(eq(recoveryCases.batchId, filter.batchId));
    }
    if (filter.customerId) {
      conditions.push(eq(recoveryCases.customerId, filter.customerId));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    return this.db
      .select()
      .from(recoveryCases)
      .where(where)
      .orderBy(desc(recoveryCases.openedAt))
      .limit(limit)
      .offset(offset);
  }

  async transition(input: TransitionInput): Promise<RecoveryCaseRow> {
    return this.db.transaction(async (tx: PgTransaction<any, any, any>) => {
      const [current] = await tx
        .select()
        .from(recoveryCases)
        .where(eq(recoveryCases.id, input.caseId))
        .limit(1);

      if (!current) throw new CaseNotFoundError(input.caseId);

      if (current.currentState === input.toState) {
        return current;
      }

      assertTransition(current.currentState, input.toState);

      const [updated] = await tx
        .update(recoveryCases)
        .set({
          currentState: input.toState,
          updatedAt: new Date(),
          ...(input.toState === "escalated" ? { escalated: true } : {}),
          ...(input.toState === "recovered"
            ? {
                outcomeState: "recovered" satisfies CaseState,
                outcomeClosedAt: new Date(),
              }
            : {}),
          ...(input.toState === "stopped"
            ? {
                outcomeState: "stopped" satisfies CaseState,
                outcomeClosedAt: new Date(),
                outcomeReason: input.reason ?? null,
              }
            : {}),
          ...(input.toState === "failed"
            ? {
                outcomeState: "failed" satisfies CaseState,
                outcomeClosedAt: new Date(),
                outcomeReason: input.reason ?? null,
              }
            : {}),
        })
        .where(eq(recoveryCases.id, input.caseId))
        .returning();

      await this.recordAudit(
        {
          caseId: input.caseId,
          action: TRANSITION_AUDIT_ACTION[input.toState],
          summary:
            input.reason ??
            `Case transitioned ${current.currentState} → ${input.toState}.`,
          detail: {
            from: current.currentState,
            to: input.toState,
            reason: input.reason ?? null,
          },
          actor: input.actor,
          decisionId: input.decisionId,
        },
        tx,
      );

      return updated;
    });
  }

  async recordOutcome(input: RecordOutcomeInput): Promise<RecoveryCaseRow> {
    return this.db.transaction(async (tx: PgTransaction<any, any, any>) => {
      const [current] = await tx
        .select()
        .from(recoveryCases)
        .where(eq(recoveryCases.id, input.caseId))
        .limit(1);

      if (!current) throw new CaseNotFoundError(input.caseId);

      if (
        current.currentState === "recovered" ||
        current.currentState === "stopped"
      ) {
        return current;
      }

      if (input.recoveredMinor > 0) {
        const [updated] = await tx
          .update(recoveryCases)
          .set({
            currentState: "recovered",
            outcomeState: "recovered",
            outcomeRecoveredMinor: input.recoveredMinor,
            outcomePromisedMinor: input.promisedMinor ?? 0,
            outcomeClosedAt: new Date(),
            outcomeReason: input.reason ?? null,
            updatedAt: new Date(),
          })
          .where(eq(recoveryCases.id, input.caseId))
          .returning();

        await this.recordAudit(
          {
            caseId: input.caseId,
            action: "recovery",
            summary: `Recovered ${input.recoveredMinor} minor units from case.`,
            detail: {
              recoveredMinor: input.recoveredMinor,
              promisedMinor: input.promisedMinor ?? 0,
              reason: input.reason ?? null,
            },
            actor: input.actor,
          },
          tx,
        );

        return updated;
      }

      const [updated] = await tx
        .update(recoveryCases)
        .set({
          outcomePromisedMinor: input.promisedMinor ?? 0,
          updatedAt: new Date(),
        })
        .where(eq(recoveryCases.id, input.caseId))
        .returning();

      return updated;
    });
  }

  async stop(
    caseId: string,
    actor: string,
    reason: string,
  ): Promise<RecoveryCaseRow> {
    const current = await this.findById(caseId);
    if (!canTransition(current.currentState, "stopped")) {
      throw new CaseAlreadyTerminalError(caseId, current.currentState);
    }
    return this.transition({
      caseId,
      toState: "stopped",
      reason,
      actor,
    });
  }

  async attachBatch(caseId: string, batchId: string): Promise<RecoveryCaseRow> {
    const [updated] = await this.db
      .update(recoveryCases)
      .set({ batchId, updatedAt: new Date() })
      .where(eq(recoveryCases.id, caseId))
      .returning();
    if (!updated) throw new CaseNotFoundError(caseId);
    return updated;
  }

  private async recordAudit(
    input: {
      caseId: string;
      action: string;
      summary: string;
      detail: Record<string, unknown>;
      actor: string;
      decisionId?: string;
    },
    tx: any,
  ): Promise<void> {
    await tx.insert(auditEvents).values({
      caseId: input.caseId,
      action: input.action as
        | "event_detected"
        | "context_retrieved"
        | "decision_created"
        | "policy_checked"
        | "action_executed"
        | "outcome_received"
        | "escalation"
        | "recovery"
        | "stop",
      summary: input.summary,
      detail: input.detail,
      actor: input.actor,
      decisionId: input.decisionId,
    });
  }
}

import { db } from "@recovery/db";
export const caseLifecycle = new CaseLifecycleService(db);
