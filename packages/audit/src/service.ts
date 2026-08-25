import { and, desc, eq, gte, inArray, lte, type SQL } from "drizzle-orm";
import { auditEvents, type AuditEventRow } from "@recovery/db/schema";
import type { AuditAction } from "@recovery/types";

export interface RecordAuditInput {
  caseId: string;
  action: AuditAction;
  summary: string;
  detail?: Record<string, string | number | boolean | null>;
  actor: string;
  decisionId?: string;
}

export interface ListAuditFilter {
  caseId?: string;
  actions?: AuditAction[];
  actor?: string;
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
}

export class AuditService {
  constructor(private readonly db: any) {}

  async record(
    input: RecordAuditInput,
    tx?: any,
  ): Promise<AuditEventRow> {
    const handle = tx ?? this.db;
    const [row] = await handle
      .insert(auditEvents)
      .values({
        caseId: input.caseId,
        action: input.action,
        summary: input.summary,
        detail: input.detail ?? {},
        actor: input.actor,
        decisionId: input.decisionId ?? null,
      })
      .returning();
    return row;
  }

  async list(filter: ListAuditFilter = {}): Promise<AuditEventRow[]> {
    const limit = Math.min(Math.max(filter.limit ?? 50, 1), 200);
    const offset = Math.max(filter.offset ?? 0, 0);

    const conditions: SQL[] = [];
    if (filter.caseId) {
      conditions.push(eq(auditEvents.caseId, filter.caseId));
    }
    if (filter.actions && filter.actions.length > 0) {
      conditions.push(inArray(auditEvents.action, filter.actions));
    }
    if (filter.actor) {
      conditions.push(eq(auditEvents.actor, filter.actor));
    }
    if (filter.from) {
      conditions.push(gte(auditEvents.occurredAt, filter.from));
    }
    if (filter.to) {
      conditions.push(lte(auditEvents.occurredAt, filter.to));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    return this.db
      .select()
      .from(auditEvents)
      .where(where)
      .orderBy(desc(auditEvents.occurredAt))
      .limit(limit)
      .offset(offset);
  }
}

import { db } from "@recovery/db";
export const auditService = new AuditService(db);
