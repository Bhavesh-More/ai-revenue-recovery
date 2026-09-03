DO $$ BEGIN
    CREATE TYPE "agent_decision_type" AS ENUM('analyze', 'recovery');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "agent_decision_status" AS ENUM('pending', 'approved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "agent_decisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL REFERENCES "recovery_cases"("id") ON DELETE CASCADE,
	"run_id" uuid NOT NULL,
	"type" "agent_decision_type" NOT NULL,
	"status" "agent_decision_status" DEFAULT 'pending' NOT NULL,
	"observations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"root_cause" text DEFAULT '' NOT NULL,
	"recommendation" jsonb NOT NULL,
	"policy_result" jsonb NOT NULL,
	"approval_required" boolean DEFAULT false NOT NULL,
	"approved_by" text,
	"approved_at" timestamp with time zone,
	"rejected_reason" text,
	"outcome_recovered_minor" bigint DEFAULT 0 NOT NULL,
	"outcome_promised_minor" bigint DEFAULT 0 NOT NULL,
	"outcome_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "agent_decisions_case_idx" ON "agent_decisions" ("case_id");
CREATE INDEX IF NOT EXISTS "agent_decisions_run_idx" ON "agent_decisions" ("run_id");
CREATE INDEX IF NOT EXISTS "agent_decisions_status_idx" ON "agent_decisions" ("status");

CREATE TABLE IF NOT EXISTS "promises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL REFERENCES "recovery_cases"("id") ON DELETE CASCADE,
	"customer_id" uuid NOT NULL REFERENCES "customers"("id") ON DELETE RESTRICT,
	"amount_minor" bigint DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"promised_date" timestamp with time zone NOT NULL,
	"promise_type" "promise_type" DEFAULT 'firm' NOT NULL,
	"status" "promise_status" DEFAULT 'pending' NOT NULL,
	"source" text DEFAULT 'MANUAL' NOT NULL,
	"confidence" numeric(4, 3) DEFAULT '0.850' NOT NULL,
	"conditions" text,
	"fulfilled_amount_minor" bigint DEFAULT 0 NOT NULL,
	"fulfilled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "promises_case_idx" ON "promises" ("case_id");
CREATE INDEX IF NOT EXISTS "promises_customer_idx" ON "promises" ("customer_id");
CREATE INDEX IF NOT EXISTS "promises_status_idx" ON "promises" ("status");
CREATE INDEX IF NOT EXISTS "promises_promised_date_idx" ON "promises" ("promised_date");
