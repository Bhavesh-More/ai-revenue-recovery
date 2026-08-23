import {
  bigint,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import {
  failureReasonEnum,
  mandateStateEnum,
  revenueEventTypeEnum,
} from "./enums";
import { customers } from "./customers";

export const revenueEvents = pgTable(
  "revenue_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id").notNull().references(() => customers.id, { onDelete: "restrict" }),
    type: revenueEventTypeEnum("type").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    source: text("source").notNull(),
    externalId: text("external_id"),
    // Money stored as minor units (BIGINT).
    amountAtRiskMinor: bigint("amount_at_risk_minor", { mode: "number" }),
    currency: text("currency").notNull().default("INR"),
    payload: jsonb("payload").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("revenue_events_customer_idx").on(t.customerId),
    index("revenue_events_type_idx").on(t.type),
    index("revenue_events_occurred_at_idx").on(t.occurredAt),
    uniqueIndex("revenue_events_source_external_uq").on(t.source, t.externalId),
  ],
);

export type RevenueEventRow = typeof revenueEvents.$inferSelect;
export type NewRevenueEventRow = typeof revenueEvents.$inferInsert;

export { failureReasonEnum, mandateStateEnum };
