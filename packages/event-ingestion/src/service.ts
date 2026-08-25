import { and, eq, type SQL } from "drizzle-orm";
import type { PgTransaction } from "drizzle-orm/pg-core";
import { auditEvents, recoveryCases, revenueEvents } from "@recovery/db/schema";
import {
  TRANSITION_AUDIT_ACTION,
} from "@recovery/case-lifecycle";
import type {
  RecoveryCaseRow,
  RevenueEventRow,
} from "@recovery/db/schema";
import type { IngestEventInput, RevenueEventPayload } from "./schemas.js";
import { directionForEvent } from "./routing.js";

export interface IngestEventResult {
  event: RevenueEventRow;
  case: RecoveryCaseRow;
  created: {
    event: boolean;
    case: boolean;
  };
}

interface NormalizedEvent {
  customerId: string;
  amountAtRiskMinor: number;
  currency: string;
  payload: Record<string, unknown>;
}

function normalizePayload(
  customerId: string,
  payload: RevenueEventPayload,
  amountOverride?: number,
): NormalizedEvent {
  const base = payload as { amountAtRiskMinor?: number; currency?: string };
  const amount = amountOverride ?? base.amountAtRiskMinor ?? 0;
  const currency = base.currency ?? "INR";
  return {
    customerId,
    amountAtRiskMinor: amount,
    currency,
    payload: payload as unknown as Record<string, unknown>,
  };
}

export class EventIngestionService {

  constructor(private readonly db: any) {}

  async ingest(input: IngestEventInput): Promise<IngestEventResult> {
    return this.db.transaction(async (tx: PgTransaction<any, any, any>) => {
      const eventType = input.payload.type;
      const direction = directionForEvent(eventType);

      const [existingEvent] = await tx
        .select()
        .from(revenueEvents)
        .where(and(
          eq(revenueEvents.source, input.source),
          eq(revenueEvents.externalId, input.externalId)
        ))
        .limit(1);

      let event: RevenueEventRow;
      let eventCreated = false;

      if (existingEvent) {
        event = existingEvent;
      } else {
        const normalized = normalizePayload(
          input.customerId,
          input.payload,
          input.amountAtRiskMinorOverride,
        );

        const [inserted] = await tx
          .insert(revenueEvents)
          .values({
            customerId: normalized.customerId,
            type: eventType,
            occurredAt: input.occurredAt
              ? new Date(input.occurredAt)
              : new Date(),
            source: input.source,
            externalId: input.externalId,
            amountAtRiskMinor: normalized.amountAtRiskMinor,
            currency: normalized.currency,
            payload: normalized.payload,
          })
          .returning();

        event = inserted;
        eventCreated = true;
      }

      const [existingCase] = await tx
        .select()
        .from(recoveryCases)
        .where(eq(recoveryCases.originatingEventId, event.id))
        .limit(1);

      let caseRow: RecoveryCaseRow;
      let caseCreated = false;

      if (existingCase) {
        caseRow = existingCase;
      } else {
        const [created] = await tx
          .insert(recoveryCases)
          .values({
            customerId: event.customerId,
            originatingEventId: event.id,
            direction,
            currentState: "detected",
            amountAtRiskMinor:
              event.amountAtRiskMinor && event.amountAtRiskMinor > 0
                ? event.amountAtRiskMinor
                : 0,
            currency: event.currency,
            recoveryProbability: "0.000",
            riskTier: input.riskTier ?? "medium",
          })
          .returning();

        caseRow = created;
        caseCreated = true;

        await this.recordAudit(
          {
            caseId: created.id,
            action: TRANSITION_AUDIT_ACTION.detected,
            summary: `Recovery case opened from event ${event.id} (${eventType}).`,
            detail: {
              source: input.source,
              externalId: input.externalId,
              revenueEventType: eventType,
              direction,
              amountAtRiskMinor: created.amountAtRiskMinor,
              currency: created.currency,
              riskTier: created.riskTier,
            },
            actor: input.actor ?? "system",
          },
          tx,
        );
      }

      return {
        event,
        case: caseRow,
        created: { event: eventCreated, case: caseCreated },
      };
    });
  }

  private async recordAudit(
    input: {
      caseId: string;
      action: string;
      summary: string;
      detail: Record<string, unknown>;
      actor: string;
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
    });
  }
}

import { db } from "@recovery/db";
export const eventIngestion = new EventIngestionService(db);
