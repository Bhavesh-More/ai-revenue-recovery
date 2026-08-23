import {
  bigint,
  boolean,
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import {
  caseStateEnum,
  recoveryDirectionEnum,
  riskTierEnum,
} from "./enums";
import { customers } from "./customers";
import { revenueEvents } from "./revenue_events";

export const recoveryCases = pgTable(
  "recovery_cases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id").notNull().references(() => customers.id, { onDelete: "restrict" }),
    originatingEventId: uuid("originating_event_id").notNull().references(() => revenueEvents.id, { onDelete: "restrict" }),
    direction: recoveryDirectionEnum("direction").notNull(),
    currentState: caseStateEnum("current_state").notNull().default("detected"),
    amountAtRiskMinor: bigint("amount_at_risk_minor", { mode: "number" }).notNull().default(0),
    currency: text("currency").notNull().default("INR"),
    // 0..1 - gives 3 decimal precision without float drift.
    recoveryProbability: numeric("recovery_probability", {
      precision: 4,
      scale: 3,
    }).notNull().default("0.000"),
    riskTier: riskTierEnum("risk_tier").notNull().default("medium"),
    attemptCount: bigint("attempt_count", { mode: "number" }).notNull().default(0),
    escalated: boolean("escalated").notNull().default(false),
    batchId: uuid("batch_id"),
    latestDecisionSummary: text("latest_decision_summary"),
    outcomeState: caseStateEnum("outcome_state"),
    outcomeRecoveredMinor: bigint("outcome_recovered_minor", {
      mode: "number",
    }).notNull().default(0),
    outcomePromisedMinor: bigint("outcome_promised_minor", { mode: "number" }).notNull().default(0),
    outcomeClosedAt: timestamp("outcome_closed_at", { withTimezone: true }),
    outcomeReason: text("outcome_reason"),
    openedAt: timestamp("opened_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("recovery_cases_customer_idx").on(t.customerId),
    index("recovery_cases_state_idx").on(t.currentState),
    index("recovery_cases_direction_idx").on(t.direction),
    index("recovery_cases_batch_idx").on(t.batchId),
    index("recovery_cases_opened_at_idx").on(t.openedAt),
    index("recovery_cases_updated_at_idx").on(t.updatedAt),
  ],
);

export type RecoveryCaseRow = typeof recoveryCases.$inferSelect;
export type NewRecoveryCaseRow = typeof recoveryCases.$inferInsert;
export { caseStateEnum, recoveryDirectionEnum, riskTierEnum };