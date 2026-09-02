import {
  bigint,
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { promiseStatusEnum, promiseTypeEnum } from "./enums";
import { customers } from "./customers";
import { recoveryCases } from "./recovery_cases";

export const promises = pgTable(
  "promises",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    caseId: uuid("case_id").notNull().references(() => recoveryCases.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id").notNull().references(() => customers.id, { onDelete: "restrict" }),
    amountMinor: bigint("amount_minor", { mode: "number" }).notNull().default(0),
    currency: text("currency").notNull().default("INR"),
    promisedDate: timestamp("promised_date", { withTimezone: true }).notNull(),
    promiseType: promiseTypeEnum("promise_type").notNull().default("firm"),
    status: promiseStatusEnum("status").notNull().default("pending"),
    source: text("source").notNull().default("MANUAL"),
    confidence: numeric("confidence", { precision: 4, scale: 3 }).notNull().default("0.850"),
    conditions: text("conditions"),
    fulfilledAmountMinor: bigint("fulfilled_amount_minor", { mode: "number" }).notNull().default(0),
    fulfilledAt: timestamp("fulfilled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("promises_case_idx").on(t.caseId),
    index("promises_customer_idx").on(t.customerId),
    index("promises_status_idx").on(t.status),
    index("promises_promised_date_idx").on(t.promisedDate),
  ],
);

export type PromiseRow = typeof promises.$inferSelect;
export type NewPromiseRow = typeof promises.$inferInsert;
export { promiseStatusEnum, promiseTypeEnum };
