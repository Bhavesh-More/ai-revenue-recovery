import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { actionStatusEnum, recoveryActionTypeEnum } from "./enums";
import { customers } from "./customers";
import { recoveryCases } from "./recovery_cases";

export const recoveryActions = pgTable(
  "recovery_actions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    caseId: uuid("case_id").notNull().references(() => recoveryCases.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id").notNull().references(() => customers.id, { onDelete: "restrict" }),
    type: recoveryActionTypeEnum("type").notNull(),
    status: actionStatusEnum("status").notNull().default("pending"),
    requiredApproval: boolean("required_approval").notNull().default(false),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    approvedBy: text("approved_by"),
    payload: jsonb("payload").notNull().default(sql`'{}'::jsonb`),
    // Money stored as minor units (BIGINT) + currency for safe display.
    amountMinor: bigint("amount_minor", { mode: "number" }),
    currency: text("currency"),
    resultStatus: actionStatusEnum("result_status"),
    resultExternalReference: text("result_external_reference"),
    resultMessage: text("result_message"),
    resultObservedAt: timestamp("result_observed_at", { withTimezone: true }),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
    executedAt: timestamp("executed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("recovery_actions_case_idx").on(t.caseId),
    index("recovery_actions_customer_idx").on(t.customerId),
    index("recovery_actions_status_idx").on(t.status),
    index("recovery_actions_type_idx").on(t.type),
    index("recovery_actions_scheduled_for_idx").on(t.scheduledFor),
  ],
);

export type RecoveryActionRow = typeof recoveryActions.$inferSelect;
export type NewRecoveryActionRow = typeof recoveryActions.$inferInsert;