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
import { agentDecisionStatusEnum, agentDecisionTypeEnum } from "./enums";
import { recoveryCases } from "./recovery_cases";

export const agentDecisions = pgTable(
  "agent_decisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => recoveryCases.id, { onDelete: "cascade" }),
    runId: uuid("run_id").notNull(),
    type: agentDecisionTypeEnum("type").notNull(),
    status: agentDecisionStatusEnum("status").notNull().default("pending"),
    observations: jsonb("observations")
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    rootCause: text("root_cause").notNull().default(""),
    recommendation: jsonb("recommendation").notNull(),
    policyResult: jsonb("policy_result").notNull(),
    approvalRequired: boolean("approval_required").notNull().default(false),
    approvedBy: text("approved_by"),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    rejectedReason: text("rejected_reason"),
    outcomeRecoveredMinor: bigint("outcome_recovered_minor", {
      mode: "bigint",
    })
      .notNull()
      .default(0n),
    outcomePromisedMinor: bigint("outcome_promised_minor", { mode: "bigint" })
      .notNull()
      .default(0n),
    outcomeReason: text("outcome_reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("agent_decisions_case_idx").on(t.caseId),
    index("agent_decisions_run_idx").on(t.runId),
    index("agent_decisions_status_idx").on(t.status),
  ],
);

export type AgentDecisionRow = typeof agentDecisions.$inferSelect;
export type NewAgentDecisionRow = typeof agentDecisions.$inferInsert;
