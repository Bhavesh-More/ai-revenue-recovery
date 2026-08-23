import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { communicationChannelEnum, customerTypeEnum } from "./enums";

export const customers = pgTable(
  "customers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: customerTypeEnum("type").notNull().default("individual"),
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    preferredChannel: communicationChannelEnum("preferred_channel"),
    gstin: text("gstin"),
    accountManagerId: text("account_manager_id"),
    // Customer history snapshot
    history: jsonb("history").$type<{
      lifetimeRevenueMinor: number;
      successfulPayments: number;
      failedPayments: number;
      tenureMonths: number;
      hasBrokenPromise: boolean;
      priorRecoveryCases: number;
    }>().notNull().default(sql`'{}'::jsonb`),
    risk: jsonb("risk").$type<{
      reliabilityScore: number;
      recoveryProbability: number;
      optedOut: boolean;
      lastContactedAt?: string;
    }>().notNull().default(sql`'{}'::jsonb`),
    // True if customer has opted out of all recovery channels.
    optedOut: boolean("opted_out").notNull().default(false),
    externalRef: text("external_ref"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("customers_email_idx").on(t.email),
    index("customers_phone_idx").on(t.phone),
    index("customers_account_manager_idx").on(t.accountManagerId),
    uniqueIndex("customers_external_ref_uq").on(t.externalRef),
  ],
);

export type CustomerRow = typeof customers.$inferSelect;
export type NewCustomerRow = typeof customers.$inferInsert;