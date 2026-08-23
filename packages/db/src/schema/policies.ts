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
import { recoveryDirectionEnum, type RecoveryDirection } from "./enums";

export const policies = pgTable(
  "policies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    applicableDirections: jsonb("applicable_directions").$type<RecoveryDirection[]>().notNull().default(sql`'[]'::jsonb`),
    enabled: boolean("enabled").notNull().default(true),
    // High-value approval threshold stored as money in minor units.
    highValueApprovalThresholdMinor: bigint("high_value_approval_threshold_minor",{ mode: "bigint" },).notNull().default(0n),
    currency: text("currency").notNull().default("INR"),
    limits: jsonb("limits").notNull(),
    updatedBy: text("updated_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("policies_name_idx").on(t.name),
    index("policies_enabled_idx").on(t.enabled),
    index("policies_updated_at_idx").on(t.updatedAt),
  ],
);

export type PolicyRow = typeof policies.$inferSelect;
export type NewPolicyRow = typeof policies.$inferInsert;

export { recoveryDirectionEnum };
