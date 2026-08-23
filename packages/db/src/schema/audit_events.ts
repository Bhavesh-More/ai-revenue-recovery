import { sql } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { auditActionEnum } from "./enums";
import { recoveryCases } from "./recovery_cases";

export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    caseId: uuid("case_id").notNull().references(() => recoveryCases.id, { onDelete: "cascade" }),
    action: auditActionEnum("action").notNull(),
    summary: text("summary").notNull(),
    detail: jsonb("detail").$type<Record<string, string | number | boolean | null>>().notNull().default(sql`'{}'::jsonb`),
    actor: text("actor").notNull(),
    decisionId: text("decision_id"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("audit_events_case_idx").on(t.caseId),
    index("audit_events_action_idx").on(t.action),
    index("audit_events_occurred_at_idx").on(t.occurredAt),
  ],
);

export type AuditEventRow = typeof auditEvents.$inferSelect;
export type NewAuditEventRow = typeof auditEvents.$inferInsert;