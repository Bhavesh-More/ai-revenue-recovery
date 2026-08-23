import { sql } from "drizzle-orm";
import {
  bigint,
  index,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import {
  batchStatusEnum,
  type RecoveryDirection,
} from "./enums";

export const batches = pgTable(
  "batches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    directions: jsonb("directions").$type<RecoveryDirection[]>().notNull().default(sql`'[]'::jsonb`),
    status: batchStatusEnum("status").notNull().default("created"),
    totalCases: bigint("total_cases", { mode: "bigint" }).notNull().default(0n),
    recoveredCases: bigint("recovered_cases", { mode: "bigint" }).notNull().default(0n),
    escalatedCases: bigint("escalated_cases", { mode: "bigint" }).notNull().default(0n),
    stoppedCases: bigint("stopped_cases", { mode: "bigint" }).notNull().default(0n),
    failedCases: bigint("failed_cases", { mode: "bigint" }).notNull().default(0n),
    revenueAtRiskMinor: bigint("revenue_at_risk_minor", { mode: "bigint" }).notNull().default(0n),
    revenueRecoveredMinor: bigint("revenue_recovered_minor", { mode: "bigint" }).notNull().default(0n),
    currency: text("currency").notNull().default("INR"),
    recoveryRate: numeric("recovery_rate", {
      precision: 4,
      scale: 3,
    }).notNull().default("0.000"),
    // All case IDs in this batch for fast dashboard lookup.
    caseIds: jsonb("case_ids").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    createdAt: timestamp("created_at", {
      withTimezone: true,
    }).notNull().defaultNow(),
    startedAt: timestamp("started_at", {
      withTimezone: true,
    }),
    completedAt: timestamp("completed_at", {
      withTimezone: true,
    }),
  },
  (t) => [
    index("batches_status_idx").on(t.status),
    index("batches_created_at_idx").on(t.createdAt),
  ],
);

export type BatchRow = typeof batches.$inferSelect;
export type NewBatchRow = typeof batches.$inferInsert;