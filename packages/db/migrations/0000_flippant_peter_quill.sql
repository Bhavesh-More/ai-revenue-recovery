CREATE TYPE "public"."action_status" AS ENUM('pending', 'approved', 'rejected', 'in_progress', 'succeeded', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."audit_action" AS ENUM('event_detected', 'context_retrieved', 'decision_created', 'policy_checked', 'action_executed', 'outcome_received', 'escalation', 'recovery', 'stop');--> statement-breakpoint
CREATE TYPE "public"."batch_status" AS ENUM('created', 'running', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."case_state" AS ENUM('detected', 'investigating', 'action_selected', 'waiting', 'customer_action_required', 'recovering', 'escalated', 'recovered', 'stopped', 'failed');--> statement-breakpoint
CREATE TYPE "public"."checkout_last_step" AS ENUM('cart', 'address', 'payment', 'review');--> statement-breakpoint
CREATE TYPE "public"."communication_channel" AS ENUM('email', 'sms', 'whatsapp', 'voice');--> statement-breakpoint
CREATE TYPE "public"."customer_type" AS ENUM('individual', 'business');--> statement-breakpoint
CREATE TYPE "public"."failure_reason" AS ENUM('card_expired', 'insufficient_funds', 'bank_decline', 'authentication_required', 'network_error', 'mandate_inactive', 'provider_degradation', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."mandate_state" AS ENUM('active', 'paused', 'cancelled', 'expired', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."policy_decision" AS ENUM('allow', 'deny', 'require_approval');--> statement-breakpoint
CREATE TYPE "public"."promise_status" AS ENUM('pending', 'due', 'fulfilled', 'partial', 'broken', 'rescheduled');--> statement-breakpoint
CREATE TYPE "public"."promise_type" AS ENUM('firm', 'tentative', 'conditional', 'informational');--> statement-breakpoint
CREATE TYPE "public"."recovery_action_type" AS ENUM('retry_payment', 'send_payment_link', 'send_email', 'send_sms', 'send_whatsapp', 'start_voice_call', 'request_payment_method_update', 'record_promise', 'escalate_to_human', 'stop_case', 'schedule_retry');--> statement-breakpoint
CREATE TYPE "public"."recovery_direction" AS ENUM('01_payment_degradation', '02_checkout_dropoff', '03_failed_subscription', '04_b2b_receivables', '05_mandate_retry', '06_hinglish_voice', '07_promise_to_pay');--> statement-breakpoint
CREATE TYPE "public"."revenue_event_type" AS ENUM('payment.failed', 'payment.succeeded', 'checkout.abandoned', 'subscription.renewal_failed', 'invoice.overdue', 'mandate.failed', 'customer.responded', 'promise.created', 'promise.due', 'promise.broken', 'promise.fulfilled');--> statement-breakpoint
CREATE TYPE "public"."risk_tier" AS ENUM('low', 'medium', 'high', 'critical');--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "customer_type" DEFAULT 'individual' NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"preferred_channel" "communication_channel",
	"gstin" text,
	"account_manager_id" text,
	"history" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"risk" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"opted_out" boolean DEFAULT false NOT NULL,
	"external_ref" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "revenue_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"type" "revenue_event_type" NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"source" text NOT NULL,
	"external_id" text,
	"amount_at_risk_minor" bigint,
	"currency" text DEFAULT 'INR' NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recovery_cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"originating_event_id" uuid NOT NULL,
	"direction" "recovery_direction" NOT NULL,
	"current_state" "case_state" DEFAULT 'detected' NOT NULL,
	"amount_at_risk_minor" bigint DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"recovery_probability" numeric(4, 3) DEFAULT '0.000' NOT NULL,
	"risk_tier" "risk_tier" DEFAULT 'medium' NOT NULL,
	"attempt_count" bigint DEFAULT 0 NOT NULL,
	"escalated" boolean DEFAULT false NOT NULL,
	"batch_id" uuid,
	"latest_decision_summary" text,
	"outcome_state" "case_state",
	"outcome_recovered_minor" bigint DEFAULT 0 NOT NULL,
	"outcome_promised_minor" bigint DEFAULT 0 NOT NULL,
	"outcome_closed_at" timestamp with time zone,
	"outcome_reason" text,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recovery_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"type" "recovery_action_type" NOT NULL,
	"status" "action_status" DEFAULT 'pending' NOT NULL,
	"required_approval" boolean DEFAULT false NOT NULL,
	"approved_at" timestamp with time zone,
	"approved_by" text,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"amount_minor" bigint,
	"currency" text,
	"result_status" "action_status",
	"result_external_reference" text,
	"result_message" text,
	"result_observed_at" timestamp with time zone,
	"scheduled_for" timestamp with time zone,
	"executed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"applicable_directions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"high_value_approval_threshold_minor" bigint DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"limits" jsonb NOT NULL,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"action" "audit_action" NOT NULL,
	"summary" text NOT NULL,
	"detail" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"actor" text NOT NULL,
	"decision_id" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"directions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "batch_status" DEFAULT 'created' NOT NULL,
	"total_cases" bigint DEFAULT 0 NOT NULL,
	"recovered_cases" bigint DEFAULT 0 NOT NULL,
	"escalated_cases" bigint DEFAULT 0 NOT NULL,
	"stopped_cases" bigint DEFAULT 0 NOT NULL,
	"failed_cases" bigint DEFAULT 0 NOT NULL,
	"revenue_at_risk_minor" bigint DEFAULT 0 NOT NULL,
	"revenue_recovered_minor" bigint DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"recovery_rate" numeric(4, 3) DEFAULT '0.000' NOT NULL,
	"case_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "revenue_events" ADD CONSTRAINT "revenue_events_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recovery_cases" ADD CONSTRAINT "recovery_cases_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recovery_cases" ADD CONSTRAINT "recovery_cases_originating_event_id_revenue_events_id_fk" FOREIGN KEY ("originating_event_id") REFERENCES "public"."revenue_events"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recovery_actions" ADD CONSTRAINT "recovery_actions_case_id_recovery_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."recovery_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recovery_actions" ADD CONSTRAINT "recovery_actions_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_case_id_recovery_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."recovery_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "customers_email_idx" ON "customers" USING btree ("email");--> statement-breakpoint
CREATE INDEX "customers_phone_idx" ON "customers" USING btree ("phone");--> statement-breakpoint
CREATE UNIQUE INDEX "customers_external_ref_uq" ON "customers" USING btree ("external_ref");--> statement-breakpoint
CREATE INDEX "revenue_events_customer_idx" ON "revenue_events" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "revenue_events_type_idx" ON "revenue_events" USING btree ("type");--> statement-breakpoint
CREATE INDEX "revenue_events_occurred_at_idx" ON "revenue_events" USING btree ("occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "revenue_events_source_external_uq" ON "revenue_events" USING btree ("source","external_id");--> statement-breakpoint
CREATE INDEX "recovery_cases_customer_idx" ON "recovery_cases" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "recovery_cases_state_idx" ON "recovery_cases" USING btree ("current_state");--> statement-breakpoint
CREATE INDEX "recovery_cases_direction_idx" ON "recovery_cases" USING btree ("direction");--> statement-breakpoint
CREATE INDEX "recovery_cases_batch_idx" ON "recovery_cases" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "recovery_cases_opened_at_idx" ON "recovery_cases" USING btree ("opened_at");--> statement-breakpoint
CREATE INDEX "recovery_actions_case_idx" ON "recovery_actions" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "recovery_actions_customer_idx" ON "recovery_actions" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "recovery_actions_status_idx" ON "recovery_actions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "recovery_actions_type_idx" ON "recovery_actions" USING btree ("type");--> statement-breakpoint
CREATE INDEX "recovery_actions_scheduled_for_idx" ON "recovery_actions" USING btree ("scheduled_for");--> statement-breakpoint
CREATE INDEX "policies_name_idx" ON "policies" USING btree ("name");--> statement-breakpoint
CREATE INDEX "policies_enabled_idx" ON "policies" USING btree ("enabled");--> statement-breakpoint
CREATE INDEX "audit_events_case_idx" ON "audit_events" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "audit_events_action_idx" ON "audit_events" USING btree ("action");--> statement-breakpoint
CREATE INDEX "audit_events_occurred_at_idx" ON "audit_events" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "batches_status_idx" ON "batches" USING btree ("status");--> statement-breakpoint
CREATE INDEX "batches_created_at_idx" ON "batches" USING btree ("created_at");