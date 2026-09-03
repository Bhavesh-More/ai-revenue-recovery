import { eq, inArray, desc } from "drizzle-orm";
import { db } from "@recovery/db";
import {
  customers,
  revenueEvents,
  recoveryCases,
  recoveryActions,
  agentDecisions,
  auditEvents,
  batches,
  type RecoveryCaseRow,
  type CustomerRow,
  type BatchRow,
} from "@recovery/db/schema";
import type { RecoveryDirectionCode, CaseState, RiskTier, RecoveryActionType } from "@recovery/types";
import { caseLifecycle } from "@recovery/case-lifecycle";
import { auditService } from "@recovery/audit";
import { agentRunner } from "./runner.js";

export interface SyntheticBatchConfig {
  batchName: string;
  generationMode?: "single" | "mixed";
  singleDirection?: string;
  numberOfCases: number;
  dateRangePreset?: "24h" | "7d" | "30d" | "custom";
  startDate?: string;
  endDate?: string;
  minAmount?: number; // In Rupees (e.g. 499)
  maxAmount?: number; // In Rupees (e.g. 14999)
  customerContext?: {
    behavioralHistory?: boolean;
    multiChannelTouchpoints?: boolean;
    riskTelemetry?: boolean;
  };
  edgeCases?: {
    hardshipClaims?: boolean;
    highExposureOverrides?: boolean;
    repeatedDegradationSurge?: boolean;
    disputedCharges?: boolean;
  };
  generateGroundTruth?: boolean;
  randomSeed?: number;
  enableSimulation?: boolean;
}

export interface BatchSimulationResult {
  batch: BatchRow;
  metrics: {
    totalCases: number;
    processedCases: number;
    recoveredCases: number;
    waitingCases: number;
    customerActionRequiredCases?: number;
    escalatedCases: number;
    stoppedCases: number;
    failedCases: number;
    revenueAtRiskMinor: number;
    actualRecoveredMinor: number;
    recoveryRate: number;
    byIntervention: {
      paymentLink: number;
      systemRetry: number;
      reminder: number;
      customerAction: number;
      humanEscalation: number;
    };
  };
  caseResults?: Array<{
    id: string;
    caseNumber: string;
    direction: string;
    amountRs: number;
    recoveredRs: number;
    state: string;
    actionType: string;
    decisionSummary: string;
    activityEvent: {
      id: string;
      caseNumber: string;
      tag: string;
      time: string;
      description: string;
      highlightText?: string;
      highlightColor?: "green" | "red" | "orange" | "blue" | "normal";
      icon: string;
      iconBgClass: string;
      iconTextClass: string;
    };
  }>;
  activity: Array<{
    id: string;
    caseNumber: string;
    tag: string;
    time: string;
    description: string;
    highlightText?: string;
    highlightColor?: "green" | "red" | "orange" | "blue" | "normal";
    icon: string;
    iconBgClass: string;
    iconTextClass: string;
  }>;
}

const ALL_DIRECTIONS: RecoveryDirectionCode[] = [
  "01_payment_degradation",
  "02_checkout_dropoff",
  "03_failed_subscription",
  "04_b2b_receivables",
  "05_mandate_retry",
  "06_hinglish_voice",
  "07_promise_to_pay",
];

const DIRECTION_NAME_MAP: Record<string, RecoveryDirectionCode> = {
  "Payment Gateway Degradation": "01_payment_degradation",
  "Payment Degradation": "01_payment_degradation",
  "01_payment_degradation": "01_payment_degradation",
  "Checkout Abandonment": "02_checkout_dropoff",
  "Checkout Dropoff": "02_checkout_dropoff",
  "02_checkout_dropoff": "02_checkout_dropoff",
  "Subscription Inactive / Expiry": "03_failed_subscription",
  "Subscription Recovery": "03_failed_subscription",
  "03_failed_subscription": "03_failed_subscription",
  "B2B Overdue Receivables": "04_b2b_receivables",
  "B2B Receivables": "04_b2b_receivables",
  "04_b2b_receivables": "04_b2b_receivables",
  "Mandate Retry Drops": "05_mandate_retry",
  "Mandate Retry": "05_mandate_retry",
  "05_mandate_retry": "05_mandate_retry",
  "Hinglish Voice": "06_hinglish_voice",
  "06_hinglish_voice": "06_hinglish_voice",
  "Promise-to-Pay": "07_promise_to_pay",
  "07_promise_to_pay": "07_promise_to_pay",
};

class SeededRandom {
  private state: number;

  constructor(seed: number = 42) {
    this.state = Math.abs(seed) || 42;
  }

  next(): number {
    this.state = (this.state * 9301 + 49297) % 233280;
    return this.state / 233280;
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  intRange(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  choice<T>(items: readonly T[]): T {
    const idx = this.intRange(0, items.length - 1);
    return items[idx];
  }

  chance(probability: number): boolean {
    return this.next() < probability;
  }
}

const INDIVIDUAL_NAMES = [
  "Aarav Sharma", "Priya Patel", "Rohan Mehta", "Ananya Iyer", "Vikram Malhotra",
  "Sneha Reddy", "Rahul Verma", "Divya Nair", "Aditya Joshi", "Pooja Kapoor",
  "Kunal Shah", "Neha Gupta", "Siddharth Rao", "Ishaan Roy", "Tanvi Deshmukh",
  "Varun Saxena", "Rhea Singhal", "Manoj Kulkarni", "Deepa Nambiar", "Arjun Bhatia",
];

const ENTERPRISE_COMPANIES = [
  "TechCorp Solutions Pvt Ltd", "Flipkart Seller Merchant #8412", "Reliance Retail Logistics",
  "Zeta Commerce India", "Nexa Cloud Services", "Bharat Logistics LLP", "Omni Retailers Ltd",
  "FinEdge Technologies", "Apex Global Exports", "Indus Pharma Distributors",
];

export class BatchSimulationService {
  constructor(private readonly _db: typeof db = db) {}

  /**
   * Main entry point executing the full pipeline:
   * 1. Generate Synthetic Inputs (Customers, Events, Detected Cases)
   * 2. Process each Case through AI Decision Reasoner + Policy Check + Action Execution
   * 3. Simulate Customer Payment Outcome based on customer reliability
   * 4. Aggregate Batch Metrics from persisted database records
   */
  public async generateAndSimulateBatch(config: SyntheticBatchConfig): Promise<BatchSimulationResult> {
    const rng = new SeededRandom(config.randomSeed ?? 42);
    const count = Math.min(Math.max(Number(config.numberOfCases || 100), 1), 2000);
    const minRs = Math.max(Number(config.minAmount || 499), 1);
    const maxRs = Math.max(Number(config.maxAmount || 14999), minRs);

    let selectedDirections: RecoveryDirectionCode[] = ALL_DIRECTIONS;
    if (config.generationMode === "single" && config.singleDirection) {
      const resolved = DIRECTION_NAME_MAP[config.singleDirection];
      if (resolved) {
        selectedDirections = [resolved];
      }
    }

    const batchName = config.batchName || `SYNTH-BATCH-${Date.now().toString().slice(-6)}`;

    // 1. Create Batch Record
    const [batchRow] = await this._db
      .insert(batches)
      .values({
        name: batchName,
        directions: selectedDirections,
        status: "running",
        totalCases: BigInt(count),
        startedAt: new Date(),
      })
      .returning();

    const createdCases: Array<{ caseRow: RecoveryCaseRow; customer: CustomerRow; amountRs: number }> = [];

    // 2. PHASE 1: GENERATE SYNTHETIC INPUTS ONLY (Customers, Events, Initial Cases in 'detected' state)
    for (let i = 1; i <= count; i++) {
      const direction = rng.choice(selectedDirections);
      const isBusiness = direction === "04_b2b_receivables" || (direction === "01_payment_degradation" && rng.chance(0.3));

      const isHardshipClaim = Boolean(config.edgeCases?.hardshipClaims && rng.chance(0.04));
      const isHighExposureOverride = Boolean(config.edgeCases?.highExposureOverrides && rng.chance(0.04));
      const isRepeatedDegradation = Boolean(config.edgeCases?.repeatedDegradationSurge && rng.chance(0.05));
      const isDisputed = Boolean(config.edgeCases?.disputedCharges && rng.chance(0.03));

      let amountRs = isHighExposureOverride
        ? rng.intRange(500000, 1250000) // ₹5L - ₹12.5L for High Exposure Escalation test
        : isBusiness && direction === "04_b2b_receivables"
        ? rng.intRange(50000, 450000)
        : rng.intRange(minRs, maxRs);

      const amountMinor = amountRs * 100;
      const custName = isBusiness ? rng.choice(ENTERPRISE_COMPANIES) : rng.choice(INDIVIDUAL_NAMES);
      const emailDomain = isBusiness ? "corp-enterprise.in" : "example.com";
      const cleanName = custName.toLowerCase().replace(/[^a-z0-9]/g, "");
      const email = `${cleanName}.${i}.${Date.now().toString(36)}@${emailDomain}`;
      const phone = `+91${rng.intRange(9800000000, 9899999999)}`;

      const tenureMonths = rng.intRange(1, 48);
      const successfulPayments = rng.intRange(1, 36);
      const failedPayments = isRepeatedDegradation ? rng.intRange(3, 6) : rng.intRange(0, 2);
      const reliabilityScore = isHardshipClaim
        ? 0.15
        : Math.min(0.98, Math.max(0.2, successfulPayments / (successfulPayments + failedPayments + 1)));

      // Insert Customer
      const [cust] = await this._db
        .insert(customers)
        .values({
          type: isBusiness ? "business" : "individual",
          name: custName,
          email,
          phone,
          preferredChannel: rng.choice(["whatsapp", "email", "sms"]),
          history: {
            lifetimeRevenueMinor: amountMinor * successfulPayments,
            successfulPayments,
            failedPayments,
            tenureMonths,
            hasBrokenPromise: isDisputed,
            priorRecoveryCases: failedPayments,
          },
          risk: {
            reliabilityScore: Number(reliabilityScore.toFixed(2)),
            recoveryProbability: Number(reliabilityScore.toFixed(2)),
            optedOut: isHardshipClaim,
          },
          optedOut: isHardshipClaim,
        })
        .returning();

      // Insert Revenue Event with rich factual payload for AI reasoner
      const eventPayload = this.buildEventPayload(direction, cust, amountMinor, rng, {
        isRepeatedDegradation,
        isDisputed,
      });

      const [revEvent] = await this._db
        .insert(revenueEvents)
        .values({
          customerId: cust.id,
          type: eventPayload.eventType as any,
          source: "batch_simulation_generator",
          externalId: `sim_evt_${Date.now().toString(36)}_${i}_${rng.intRange(100, 999)}`,
          amountAtRiskMinor: amountMinor,
          currency: "INR",
          payload: eventPayload.payload,
        })
        .returning();


      // Insert Recovery Case in 'detected' state
      const [recCase] = await this._db
        .insert(recoveryCases)
        .values({
          customerId: cust.id,
          originatingEventId: revEvent.id,
          direction,
          currentState: "detected",
          amountAtRiskMinor: amountMinor,
          currency: "INR",
          recoveryProbability: reliabilityScore.toFixed(3),
          riskTier: isHighExposureOverride ? "critical" : reliabilityScore > 0.7 ? "low" : "medium",
          attemptCount: isRepeatedDegradation ? 3 : 1,
          batchId: batchRow.id,
        })
        .returning();

      createdCases.push({ caseRow: recCase, customer: cust, amountRs });

      await auditService.record({
        caseId: recCase.id,
        action: "event_detected",
        summary: `[SIMULATION] Synthetic case generated for customer ${cust.name} (${cust.id.slice(0, 8)}).`,
        actor: "simulation:generator",
        detail: {
          lifecycleEvent: "CASE_CREATED",
          direction,
          amountMinor,
        },
      });

      await auditService.record({
        caseId: recCase.id,
        action: "event_detected",
        summary: `[SIMULATION] Case ingested into recovery pipeline.`,
        actor: "simulation:ingestor",
        detail: {
          lifecycleEvent: "CASE_INGESTED",
          direction,
          amountMinor,
        },
      });
    }

    const caseResults: NonNullable<BatchSimulationResult["caseResults"]> = [];
    const createdCaseIds: string[] = [];

    // 3. PHASE 2 & 3: PROCESS EACH CASE THROUGH AI REASONER + POLICY CHECK + SIMULATED OUTCOME
    for (const item of createdCases) {
      const caseId = item.caseRow.id;
      createdCaseIds.push(caseId);

      // 3.1 Run Real AI Decision & Policy Engine via agentRunner
      try {
        await agentRunner.runAnalysis({ caseId, mode: "AGENT_CONTROLLED" });
      } catch (err) {
        // Fallback safety if Ollama/network unavailable: agent fallback logic is recorded
      }

      // 3.2 Inspect the post-engine state in database
      const [updatedCase] = await this._db
        .select()
        .from(recoveryCases)
        .where(eq(recoveryCases.id, caseId))
        .limit(1);

      const [latestDecision] = await this._db
        .select()
        .from(agentDecisions)
        .where(eq(agentDecisions.caseId, caseId))
        .orderBy(desc(agentDecisions.createdAt))
        .limit(1);

      const [latestAction] = await this._db
        .select()
        .from(recoveryActions)
        .where(eq(recoveryActions.caseId, caseId))
        .orderBy(desc(recoveryActions.createdAt))
        .limit(1);

      const rec = (latestDecision?.recommendation as any) || {};
      const actionType = latestAction?.type || rec?.actionType || "send_payment_link";
      const decisionSummary = latestDecision?.rootCause || updatedCase?.latestDecisionSummary || rec?.rationale || "Case processed";

      // 3.3 POLICY ENFORCEMENT BRANCH & SIMULATION MODE
      let finalState: CaseState = updatedCase?.currentState || "detected";
      let recoveredMinor = 0;

      const policyResult = (latestDecision?.policyResult as any) || {};
      const policyDecision = policyResult?.decision;

      if (policyDecision === "deny" || actionType === "stop_case" || item.customer.optedOut) {
        // Branch 1: STOPPED -> END
        if (finalState !== "stopped") {
          try {
            await caseLifecycle.transition({
              caseId,
              toState: "stopped",
              reason: policyResult?.reasons?.join("; ") || "Policy enforcement: recovery stopped",
              actor: "agent:policy",
            });
          } catch {}
          finalState = "stopped";
        }
        await auditService.record({
          caseId,
          action: "stop",
          summary: `[SIMULATION] Case stopped per policy: ${policyResult?.reasons?.join("; ") || "Hardship / limit reached"}`,
          detail: {
            lifecycleEvent: "CASE_STOPPED",
            policyReasons: policyResult?.reasons?.join("; ") || "policy stop",
            recoveredMinor: 0,
          },
          actor: "agent:policy",
        });
      } else if (policyDecision === "require_approval" || actionType === "escalate_to_human") {
        // Branch 2: ESCALATED -> waits for human authorization at /approvals
        if (finalState !== "escalated") {
          try {
            await caseLifecycle.transition({
              caseId,
              toState: "escalated",
              reason: policyResult?.reasons?.join("; ") || "High value exposure requires human approval",
              actor: "agent:policy",
              decisionId: latestDecision?.id,
            });
          } catch {}
          finalState = "escalated";
        }
        await auditService.record({
          caseId,
          action: "escalation",
          summary: `[SIMULATION] Case escalated for supervisor review: ${policyResult?.reasons?.join("; ") || "High value exposure"}`,
          detail: {
            lifecycleEvent: "APPROVAL_REQUESTED",
            decisionId: latestDecision?.id,
            policyReasons: policyResult?.reasons?.join("; ") || "High value exposure",
            recoveredMinor: 0,
          },
          actor: "agent:policy",
        });
      } else {
        // Branch 3: ACTION -> SIMULATION MODE -> CUSTOMER OUTCOME
        if (finalState === "detected") {
          try {
            await caseLifecycle.transition({
              caseId,
              toState: "investigating",
              reason: "Agent analysis initiated",
              actor: "agent:runner",
            });
            await caseLifecycle.transition({
              caseId,
              toState: "action_selected",
              reason: `Action ${actionType} selected`,
              actor: "agent:runner",
            });
            await caseLifecycle.transition({
              caseId,
              toState: "recovering",
              reason: `Executing simulated ${actionType}`,
              actor: "simulation:engine",
            });
            finalState = "recovering";
          } catch {}
        }

        // Record ACTION_EXECUTED_SIMULATION audit event
        await auditService.record({
          caseId,
          action: "action_executed",
          summary: `[SIMULATION] Executed ${actionType} in simulation mode.`,
          detail: {
            lifecycleEvent: "ACTION_EXECUTED_SIMULATION",
            actionType,
            decisionId: latestDecision?.id,
          },
          actor: "simulation:engine",
        });

        // Determine CUSTOMER OUTCOME
        const outcome = this.evaluateCustomerOutcome(
          actionType,
          item.customer,
          item.caseRow.direction as any,
          item.amountRs,
          rng,
        );

        if (outcome.state === "recovered") {
          recoveredMinor = outcome.recoveredMinor;
          await caseLifecycle.recordOutcome({
            caseId,
            recoveredMinor,
            promisedMinor: 0,
            reason: outcome.reason,
            actor: "simulation:customer",
          });
          await auditService.record({
            caseId,
            action: "recovery",
            summary: `[SIMULATION] Customer outcome resolved to RECOVERED: ₹${Math.round(recoveredMinor / 100).toLocaleString("en-IN")}.`,
            detail: {
              lifecycleEvent: "CASE_RECOVERED",
              recoveredMinor,
              actionType,
            },
            actor: "simulation:customer",
          });
          finalState = "recovered";
        } else if (outcome.state === "waiting") {
          try {
            await caseLifecycle.transition({
              caseId,
              toState: "waiting",
              reason: outcome.reason,
              actor: "simulation:engine",
            });
          } catch {}
          await auditService.record({
            caseId,
            action: "outcome_received",
            summary: `[SIMULATION] Customer outcome resolved to WAITING: ${outcome.reason}`,
            detail: {
              lifecycleEvent: "CASE_WAITING",
              recoveredMinor: 0,
              actionType,
            },
            actor: "simulation:engine",
          });
          finalState = "waiting";
          recoveredMinor = 0;
        } else if (outcome.state === "customer_action_required") {
          try {
            await caseLifecycle.transition({
              caseId,
              toState: "customer_action_required",
              reason: outcome.reason,
              actor: "simulation:engine",
            });
          } catch {}
          await auditService.record({
            caseId,
            action: "communication_sent",
            summary: `[SIMULATION] Customer outcome resolved to CUSTOMER_ACTION_REQUIRED: ${outcome.reason}`,
            detail: {
              lifecycleEvent: "CUSTOMER_ACTION_REQUIRED",
              recoveredMinor: 0,
              actionType,
            },
            actor: "simulation:engine",
          });
          finalState = "customer_action_required";
          recoveredMinor = 0;
        } else {
          try {
            await caseLifecycle.transition({
              caseId,
              toState: "stopped",
              reason: outcome.reason,
              actor: "simulation:engine",
            });
          } catch {}
          await auditService.record({
            caseId,
            action: "stop",
            summary: `[SIMULATION] Customer outcome resolved to STOPPED: ${outcome.reason}`,
            detail: {
              lifecycleEvent: "CASE_STOPPED",
              recoveredMinor: 0,
              actionType,
            },
            actor: "simulation:engine",
          });
          finalState = "stopped";
          recoveredMinor = 0;
        }
      }

      // Build timeline event
      const isRecovered = finalState === "recovered";
      const isEscalated = finalState === "escalated" || updatedCase?.escalated;
      const isStopped = finalState === "stopped";
      const isWaiting = finalState === "waiting";
      const isCustomerAction = finalState === "customer_action_required";

      const activityEvent = {
        id: `evt-${caseId.slice(0, 8)}`,
        caseNumber: `Case #${caseId.slice(0, 8)}`,
        tag: isRecovered
          ? "Payment successful"
          : isEscalated
          ? "High-value customer"
          : isStopped
          ? "Policy stopped"
          : isWaiting
          ? "Retry scheduled"
          : "Action in-flight",
        time: "Just now",
        description: isRecovered
          ? `AI Recovery Action (${actionType}) succeeded:`
          : isEscalated
          ? "Escalated for supervisor review:"
          : isStopped
          ? "Stopped per policy limits:"
          : isWaiting
          ? "Retry scheduled for optimal window:"
          : `Dispatched ${actionType}:`,
        highlightText: isRecovered
          ? `₹${item.amountRs.toLocaleString("en-IN")}`
          : isEscalated
          ? "Human approval required"
          : isStopped
          ? "stopped"
          : isWaiting
          ? "waiting"
          : `₹${item.amountRs.toLocaleString("en-IN")}`,
        highlightColor: isRecovered
          ? ("green" as const)
          : isEscalated
          ? ("orange" as const)
          : isStopped
          ? ("normal" as const)
          : ("blue" as const),
        icon: isRecovered
          ? "lucide:check"
          : isEscalated
          ? "lucide:user-cog"
          : isStopped
          ? "lucide:stop-circle"
          : isWaiting
          ? "lucide:clock"
          : "lucide:link",
        iconBgClass: isRecovered
          ? "bg-[#00B074]/10 dark:bg-[#00B074]/20 border border-[#00B074]/30"
          : isEscalated
          ? "bg-[#F59E0B]/10 dark:bg-[#F59E0B]/20 border border-[#F59E0B]/30"
          : isStopped
          ? "bg-[#F0F2F5] dark:bg-[#131416]"
          : "bg-[#3B82F6]/10 dark:bg-[#3B82F6]/20 border border-[#3B82F6]/30",
        iconTextClass: isRecovered
          ? "text-[#00B074]"
          : isEscalated
          ? "text-[#F59E0B]"
          : isStopped
          ? "text-[#8C8C8C] dark:text-[#6B7280]"
          : "text-[#3B82F6]",
      };

      caseResults.push({
        id: caseId,
        caseNumber: `Case #${caseId.slice(0, 8)}`,
        direction: item.caseRow.direction,
        amountRs: item.amountRs,
        recoveredRs: Math.round(recoveredMinor / 100),
        state: finalState,
        actionType,
        decisionSummary,
        activityEvent,
      });
    }

    // 4. PHASE 4: AGGREGATE BATCH METRICS DIRECTLY FROM PERSISTED CASE ROWS IN DATABASE
    const batchCases: RecoveryCaseRow[] = await this._db
      .select()
      .from(recoveryCases)
      .where(eq(recoveryCases.batchId, batchRow.id));

    let totalRiskMinor = 0;
    let totalRecoveredMinor = 0;
    let recoveredCount = 0;
    let escalatedCount = 0;
    let stoppedCount = 0;
    let failedCount = 0;
    let waitingCount = 0;
    let customerActionCount = 0;

    const interventionSums = {
      paymentLink: 0,
      systemRetry: 0,
      reminder: 0,
      customerAction: 0,
      humanEscalation: 0,
    };

    for (const c of batchCases) {
      const risk = Number(c.amountAtRiskMinor || 0);
      const rec = Number(c.outcomeRecoveredMinor || 0);
      totalRiskMinor += risk;

      if (c.currentState === "recovered") {
        recoveredCount++;
        totalRecoveredMinor += rec;
        if (c.direction.includes("subscription") || c.direction.includes("checkout")) {
          interventionSums.paymentLink += rec;
        } else if (c.direction.includes("degradation") || c.direction.includes("mandate")) {
          interventionSums.systemRetry += rec;
        } else if (c.direction.includes("receivables") || c.direction.includes("promise")) {
          interventionSums.reminder += rec;
        } else {
          interventionSums.customerAction += rec;
        }
      } else if (c.currentState === "escalated" || c.escalated) {
        escalatedCount++;
      } else if (c.currentState === "stopped") {
        stoppedCount++;
      } else if (c.currentState === "failed") {
        failedCount++;
      } else if (c.currentState === "customer_action_required") {
        customerActionCount++;
        waitingCount++;
      } else {
        waitingCount++;
      }
    }

    const recoveryRateDecimal = totalRiskMinor > 0 ? totalRecoveredMinor / totalRiskMinor : 0;
    const recoveryRateFormatted = (recoveryRateDecimal * 100).toFixed(1);

    // Finalize Batch row in database
    const [updatedBatch] = await this._db
      .update(batches)
      .set({
        status: "completed",
        caseIds: createdCaseIds,
        totalCases: BigInt(batchCases.length),
        recoveredCases: BigInt(recoveredCount),
        escalatedCases: BigInt(escalatedCount),
        stoppedCases: BigInt(stoppedCount),
        failedCases: BigInt(failedCount),
        revenueAtRiskMinor: BigInt(totalRiskMinor),
        revenueRecoveredMinor: BigInt(totalRecoveredMinor),
        recoveryRate: recoveryRateDecimal.toFixed(3),
        completedAt: new Date(),
      })
      .where(eq(batches.id, batchRow.id))
      .returning();

    // Record BATCH_COMPLETED audit event
    if (batchCases.length > 0) {
      await auditService.record({
        caseId: batchCases[0].id,
        action: "outcome_received",
        summary: `[SIMULATION] Batch ${batchName} completed: ${recoveredCount} recovered, ${waitingCount} waiting, ${escalatedCount} escalated, ${stoppedCount} stopped.`,
        actor: "simulation:batch",
        detail: {
          lifecycleEvent: "BATCH_COMPLETED",
          batchId: batchRow.id,
          totalCases: batchCases.length,
          recoveredCases: recoveredCount,
          waitingCases: waitingCount,
          customerActionRequiredCases: customerActionCount,
          escalatedCases: escalatedCount,
          stoppedCases: stoppedCount,
          revenueAtRiskMinor: totalRiskMinor,
          revenueRecoveredMinor: totalRecoveredMinor,
          recoveryRate: recoveryRateDecimal.toFixed(3),
        },
      });
    }

    return {
      batch: updatedBatch,
      metrics: {
        totalCases: batchCases.length,
        processedCases: batchCases.length,
        recoveredCases: recoveredCount,
        waitingCases: waitingCount,
        customerActionRequiredCases: customerActionCount,
        escalatedCases: escalatedCount,
        stoppedCases: stoppedCount,
        failedCases: failedCount,
        revenueAtRiskMinor: totalRiskMinor,
        actualRecoveredMinor: totalRecoveredMinor,
        recoveryRate: Number(recoveryRateFormatted),
        byIntervention: {
          paymentLink: Math.round(interventionSums.paymentLink / 100),
          systemRetry: Math.round(interventionSums.systemRetry / 100),
          reminder: Math.round(interventionSums.reminder / 100),
          customerAction: Math.round(interventionSums.customerAction / 100),
          humanEscalation: Math.round(interventionSums.humanEscalation / 100),
        },
      },
      caseResults,
      activity: caseResults.map((c) => c.activityEvent).slice(0, 30),
    };
  }

  /**
   * Evaluate customer outcome in simulation mode.
   * NEVER marks case recovered automatically upon action execution.
   */
  public evaluateCustomerOutcome(
    actionType: string,
    customer: CustomerRow,
    direction: RecoveryDirectionCode,
    amountRs: number,
    rng: SeededRandom,
  ): {
    state: "recovered" | "waiting" | "customer_action_required" | "stopped";
    recoveredMinor: number;
    reason: string;
  } {
    const reliability = Number((customer?.risk as any)?.reliabilityScore ?? 0.65);
    const amountMinor = amountRs * 100;

    if (actionType === "stop_case") {
      return {
        state: "stopped",
        recoveredMinor: 0,
        reason: "[SIMULATION] Case stopped per policy rule.",
      };
    }

    if (actionType === "schedule_retry") {
      const successChance = Math.min(0.85, Math.max(0.35, reliability * 0.6 + 0.30));
      if (rng.chance(successChance)) {
        return {
          state: "recovered",
          recoveredMinor: amountMinor,
          reason: `[SIMULATION] Scheduled retry executed at optimal recovery window; payment captured.`,
        };
      }
      if (rng.chance(0.50)) {
        return {
          state: "waiting",
          recoveredMinor: 0,
          reason: `[SIMULATION] Scheduled retry received transient bank decline; queued for secondary window.`,
        };
      }
      return {
        state: "stopped",
        recoveredMinor: 0,
        reason: `[SIMULATION] Scheduled retry failed: card permanently expired or mandate cancelled.`,
      };
    }

    if (actionType === "retry_payment") {
      const successChance = Math.min(0.75, Math.max(0.20, reliability * 0.6 + 0.20));
      if (rng.chance(successChance)) {
        return {
          state: "recovered",
          recoveredMinor: amountMinor,
          reason: `[SIMULATION] Automated payment retry captured successfully on secondary PSP route.`,
        };
      }
      if (rng.chance(0.65)) {
        return {
          state: "waiting",
          recoveredMinor: 0,
          reason: `[SIMULATION] Payment retry received transient bank decline; queued for optimal window.`,
        };
      }
      return {
        state: "stopped",
        recoveredMinor: 0,
        reason: `[SIMULATION] Payment retry failed: permanent bank decline / card invalid.`,
      };
    }

    if (actionType === "send_payment_link" || actionType === "send_resume_checkout_link") {
      const payChance = Math.min(0.60, Math.max(0.20, reliability * 0.5 + 0.10));
      if (rng.chance(payChance)) {
        return {
          state: "recovered",
          recoveredMinor: amountMinor,
          reason: `[SIMULATION] Customer opened link and completed simulated payment.`,
        };
      }
      if (rng.chance(0.70)) {
        return {
          state: "customer_action_required",
          recoveredMinor: 0,
          reason: `[SIMULATION] Recovery link delivered via customer channel; awaiting customer payment.`,
        };
      }
      return {
        state: "stopped",
        recoveredMinor: 0,
        reason: `[SIMULATION] Customer abandoned checkout session without payment.`,
      };
    }

    if (
      actionType === "send_whatsapp" ||
      actionType === "send_email" ||
      actionType === "send_sms" ||
      actionType === "request_payment_method_update"
    ) {
      const payChance = Math.min(0.50, Math.max(0.15, reliability * 0.45 + 0.08));
      if (rng.chance(payChance)) {
        return {
          state: "recovered",
          recoveredMinor: amountMinor,
          reason: `[SIMULATION] Customer responded to reminder and settled outstanding invoice.`,
        };
      }
      if (rng.chance(0.75)) {
        return {
          state: "customer_action_required",
          recoveredMinor: 0,
          reason: `[SIMULATION] Reminder delivered; awaiting customer response or payment method update.`,
        };
      }
      return {
        state: "stopped",
        recoveredMinor: 0,
        reason: `[SIMULATION] Communication undeliverable or customer opted out.`,
      };
    }

    if (actionType === "start_voice_call") {
      const payChance = Math.min(0.55, Math.max(0.20, reliability * 0.5 + 0.10));
      if (rng.chance(payChance)) {
        return {
          state: "recovered",
          recoveredMinor: amountMinor,
          reason: `[SIMULATION] Interactive voice agent completed payment agreement.`,
        };
      }
      if (rng.chance(0.50)) {
        return {
          state: "waiting",
          recoveredMinor: 0,
          reason: `[SIMULATION] Voice call completed: customer promised to pay on upcoming scheduled date.`,
        };
      }
      return {
        state: "stopped",
        recoveredMinor: 0,
        reason: `[SIMULATION] Call completed: customer declined recovery offer.`,
      };
    }

    if (actionType === "record_promise") {
      const payChance = Math.min(0.40, Math.max(0.15, reliability * 0.4));
      if (rng.chance(payChance)) {
        return {
          state: "recovered",
          recoveredMinor: amountMinor,
          reason: `[SIMULATION] Promised payment fulfilled by customer.`,
        };
      }
      return {
        state: "waiting",
        recoveredMinor: 0,
        reason: `[SIMULATION] Promise to pay active; awaiting fulfillment date.`,
      };
    }

    const fallbackPay = rng.chance(0.35);
    if (fallbackPay) {
      return {
        state: "recovered",
        recoveredMinor: amountMinor,
        reason: `[SIMULATION] Payment successfully captured via ${actionType}.`,
      };
    }
    return {
      state: "customer_action_required",
      recoveredMinor: 0,
      reason: `[SIMULATION] Action ${actionType} delivered; awaiting customer resolution.`,
    };
  }

  /**
   * Authoritative Human Approval Flow:
   * ESCALATED -> APPROVED -> ACTION -> SIMULATION MODE -> CUSTOMER OUTCOME
   * Approval grants human authorization only; it NEVER directly settles a case.
   */
  public async approveAndSimulateCase(
    caseId: string,
    actor: string = "operator",
  ): Promise<RecoveryCaseRow> {
    const [current] = await this._db
      .select()
      .from(recoveryCases)
      .where(eq(recoveryCases.id, caseId))
      .limit(1);

    if (!current) {
      throw new Error(`Case ${caseId} not found.`);
    }

    const [decision] = await this._db
      .select()
      .from(agentDecisions)
      .where(eq(agentDecisions.caseId, caseId))
      .orderBy(desc(agentDecisions.createdAt))
      .limit(1);

    const [customer] = await this._db
      .select()
      .from(customers)
      .where(eq(customers.id, current.customerId))
      .limit(1);

    const rec = (decision?.recommendation as any) || {};
    const actionType = rec?.actionType || "retry_payment";

    // 1. Mark decision as approved
    if (decision) {
      await this._db
        .update(agentDecisions)
        .set({
          status: "approved",
          approvedBy: actor,
          approvedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(agentDecisions.id, decision.id));
    }

    // 2. Record APPROVAL_GRANTED audit event
    await auditService.record({
      caseId,
      action: "action_executed",
      summary: `[SIMULATION] Human authorization granted by ${actor} to execute recovery action: ${actionType}.`,
      detail: {
        lifecycleEvent: "APPROVAL_GRANTED",
        actor,
        actionType,
      },
      actor: `simulation:${actor}`,
    });

    // 3. Transition case from escalated to recovering (ACTION execution)
    if (current.currentState === "escalated" || current.currentState === "detected") {
      try {
        await caseLifecycle.transition({
          caseId,
          toState: "recovering",
          reason: `Supervisor ${actor} granted authorization to execute ${actionType}.`,
          actor: `simulation:${actor}`,
          decisionId: decision?.id,
        });
      } catch {}
    }

    // 4. Record simulated external action execution in recoveryActions table
    try {
      await this._db.insert(recoveryActions).values({
        caseId,
        customerId: current.customerId,
        type: actionType as any,
        status: "succeeded",
        requiredApproval: true,
        approvedAt: new Date(),
        approvedBy: actor,
        payload: rec.parameters || {},
        amountMinor: current.amountAtRiskMinor ? Number(current.amountAtRiskMinor) : null,
        currency: current.currency || "INR",
        resultStatus: "succeeded",
        resultMessage: `[SIMULATION] Simulated execution of ${actionType} following supervisor approval`,
        executedAt: new Date(),
      });
    } catch {}

    // Record ACTION_EXECUTED_SIMULATION audit event
    await auditService.record({
      caseId,
      action: "action_executed",
      summary: `[SIMULATION] Executed ${actionType} in simulation mode following approval.`,
      detail: {
        lifecycleEvent: "ACTION_EXECUTED_SIMULATION",
        actionType,
        approvedBy: actor,
      },
      actor: "simulation:engine",
    });

    // 5. Evaluate CUSTOMER OUTCOME
    const amountRs = Math.round(Number(current.amountAtRiskMinor || 0) / 100);
    const rng = new SeededRandom(Date.now() ^ (parseInt(caseId.replace(/[^0-9]/g, "").slice(-4)) || 1234));
    const outcome = this.evaluateCustomerOutcome(
      actionType,
      customer,
      current.direction as any,
      amountRs,
      rng,
    );

    let updatedRow: RecoveryCaseRow = current;

    if (outcome.state === "recovered") {
      updatedRow = await caseLifecycle.recordOutcome({
        caseId,
        recoveredMinor: outcome.recoveredMinor,
        promisedMinor: 0,
        reason: outcome.reason,
        actor: "simulation:customer",
      });
      await auditService.record({
        caseId,
        action: "recovery",
        summary: `[SIMULATION] Customer outcome resolved to RECOVERED: ₹${Math.round(outcome.recoveredMinor / 100).toLocaleString("en-IN")}.`,
        detail: {
          lifecycleEvent: "CASE_RECOVERED",
          recoveredMinor: outcome.recoveredMinor,
        },
        actor: "simulation:customer",
      });
    } else if (outcome.state === "waiting") {
      updatedRow = await caseLifecycle.transition({
        caseId,
        toState: "waiting",
        reason: outcome.reason,
        actor: "simulation:engine",
      });
      await auditService.record({
        caseId,
        action: "outcome_received",
        summary: `[SIMULATION] Customer outcome resolved to WAITING: ${outcome.reason}`,
        detail: {
          lifecycleEvent: "CASE_WAITING",
          recoveredMinor: 0,
        },
        actor: "simulation:engine",
      });
    } else if (outcome.state === "customer_action_required") {
      updatedRow = await caseLifecycle.transition({
        caseId,
        toState: "customer_action_required",
        reason: outcome.reason,
        actor: "simulation:engine",
      });
      await auditService.record({
        caseId,
        action: "communication_sent",
        summary: `[SIMULATION] Customer outcome resolved to CUSTOMER_ACTION_REQUIRED: ${outcome.reason}`,
        detail: {
          lifecycleEvent: "CUSTOMER_ACTION_REQUIRED",
          recoveredMinor: 0,
        },
        actor: "simulation:engine",
      });
    } else {
      updatedRow = await caseLifecycle.transition({
        caseId,
        toState: "stopped",
        reason: outcome.reason,
        actor: "simulation:engine",
      });
      await auditService.record({
        caseId,
        action: "stop",
        summary: `[SIMULATION] Customer outcome resolved to STOPPED: ${outcome.reason}`,
        detail: {
          lifecycleEvent: "CASE_STOPPED",
          recoveredMinor: 0,
        },
        actor: "simulation:engine",
      });
    }

    // 6. If case belongs to a batch, update batch aggregation strictly from persisted rows in DB
    if (current.batchId) {
      await this.refreshBatchRow(current.batchId);
    }

    return updatedRow;
  }

  /**
   * Rejection Flow:
   * ESCALATED -> REJECTED -> STOPPED -> END
   */
  public async rejectCaseSimulation(
    caseId: string,
    actor: string = "operator",
    reason: string = "Declined by supervisor",
  ): Promise<RecoveryCaseRow> {
    const [current] = await this._db
      .select()
      .from(recoveryCases)
      .where(eq(recoveryCases.id, caseId))
      .limit(1);

    if (!current) {
      throw new Error(`Case ${caseId} not found.`);
    }

    const [decision] = await this._db
      .select()
      .from(agentDecisions)
      .where(eq(agentDecisions.caseId, caseId))
      .orderBy(desc(agentDecisions.createdAt))
      .limit(1);

    if (decision) {
      await this._db
        .update(agentDecisions)
        .set({
          status: "rejected",
          rejectedReason: reason,
          updatedAt: new Date(),
        })
        .where(eq(agentDecisions.id, decision.id));
    }

    const updatedRow = await caseLifecycle.transition({
      caseId,
      toState: "stopped",
      reason: `Declined by supervisor: ${reason}`,
      actor: `simulation:${actor}`,
    });

    await auditService.record({
      caseId,
      action: "stop",
      summary: `[SIMULATION] Supervisor rejected recovery action: ${reason}`,
      detail: {
        lifecycleEvent: "APPROVAL_REJECTED",
        actor,
        reason,
        recoveredMinor: 0,
      },
      actor: `simulation:${actor}`,
    });

    if (current.batchId) {
      await this.refreshBatchRow(current.batchId);
    }

    return updatedRow;
  }

  /**
   * Recalculate batch metrics strictly from persisted case rows in DB.
   */
  public async refreshBatchRow(batchId: string): Promise<void> {
    try {
      const batchCases = await this._db
        .select()
        .from(recoveryCases)
        .where(eq(recoveryCases.batchId, batchId));

      let totalRisk = 0;
      let totalRec = 0;
      let recCount = 0;
      let escCount = 0;
      let stopCount = 0;
      let failCount = 0;

      for (const bc of batchCases) {
        totalRisk += Number(bc.amountAtRiskMinor || 0);
        if (bc.currentState === "recovered") {
          recCount++;
          totalRec += Number(bc.outcomeRecoveredMinor || 0);
        } else if (bc.currentState === "escalated" || bc.escalated) {
          escCount++;
        } else if (bc.currentState === "stopped") {
          stopCount++;
        } else if (bc.currentState === "failed") {
          failCount++;
        }
      }

      const rate = totalRisk > 0 ? (totalRec / totalRisk).toFixed(3) : "0.000";

      await this._db
        .update(batches)
        .set({
          recoveredCases: BigInt(recCount),
          escalatedCases: BigInt(escCount),
          stoppedCases: BigInt(stopCount),
          failedCases: BigInt(failCount),
          revenueRecoveredMinor: BigInt(totalRec),
          recoveryRate: rate,
        })
        .where(eq(batches.id, batchId));
    } catch {}
  }

  /**
   * Settle an escalated case upon supervisor action (legacy alias for approveAndSimulateCase).
   * Now delegates to authoritative approval + simulation + customer outcome flow.
   */
  public async settleCaseSimulation(caseId: string, actor: string = "operator"): Promise<RecoveryCaseRow> {
    return this.approveAndSimulateCase(caseId, actor);
  }

  /**
   * Advance an active case that is in 'waiting' or 'customer_action_required' state.
   * Allows operators to execute scheduled retries or simulate customer payment responses.
   */
  public async advanceCaseSimulation(
    caseId: string,
    actor: string = "operator",
  ): Promise<RecoveryCaseRow> {
    const [current] = await this._db
      .select()
      .from(recoveryCases)
      .where(eq(recoveryCases.id, caseId))
      .limit(1);

    if (!current) {
      throw new Error(`Case ${caseId} not found.`);
    }

    if (current.currentState === "recovered" || current.currentState === "stopped") {
      return current; // Terminal state already
    }

    if (current.currentState === "escalated") {
      return this.approveAndSimulateCase(caseId, actor);
    }

    const [customer] = await this._db
      .select()
      .from(customers)
      .where(eq(customers.id, current.customerId))
      .limit(1);

    const [latestAction] = await this._db
      .select()
      .from(recoveryActions)
      .where(eq(recoveryActions.caseId, caseId))
      .orderBy(desc(recoveryActions.createdAt))
      .limit(1);

    const actionType = latestAction?.type || "retry_payment";
    const amountMinor = Number(current.amountAtRiskMinor || 0);
    const reliability = Number((customer?.risk as any)?.reliabilityScore ?? 0.85);
    const rng = new SeededRandom(Date.now() ^ (parseInt(caseId.replace(/[^0-9]/g, "").slice(-4)) || 5678));

    // Transition temporarily to recovering
    try {
      await caseLifecycle.transition({
        caseId,
        toState: "recovering",
        reason: current.currentState === "waiting"
          ? `Executing scheduled retry at optimal window (${actor}).`
          : `Simulating customer response to payment link / reminder (${actor}).`,
        actor: `simulation:${actor}`,
      });
    } catch {}

    // Record action execution
    await auditService.record({
      caseId,
      action: "action_executed",
      summary: current.currentState === "waiting"
        ? `[SIMULATION] Executing scheduled retry at recovery window.`
        : `[SIMULATION] Customer opened payment link / response received.`,
      detail: {
        lifecycleEvent: "ACTION_EXECUTED_SIMULATION",
        actionType,
        actor,
      },
      actor: `simulation:${actor}`,
    });

    // High success probability when explicitly triggered by operator
    const successChance = Math.min(0.92, Math.max(0.65, reliability * 0.5 + 0.45));
    let updatedRow: RecoveryCaseRow;

    if (rng.chance(successChance)) {
      updatedRow = await caseLifecycle.recordOutcome({
        caseId,
        recoveredMinor: amountMinor,
        promisedMinor: 0,
        reason: current.currentState === "waiting"
          ? `[SIMULATION] Scheduled retry captured successfully on secondary PSP route.`
          : `[SIMULATION] Customer settled outstanding amount via payment link.`,
        actor: "simulation:customer",
      });
      await auditService.record({
        caseId,
        action: "recovery",
        summary: `[SIMULATION] Payment captured: ₹${Math.round(amountMinor / 100).toLocaleString("en-IN")} recovered.`,
        detail: {
          lifecycleEvent: "CASE_RECOVERED",
          recoveredMinor: amountMinor,
        },
        actor: "simulation:customer",
      });
    } else {
      updatedRow = await caseLifecycle.transition({
        caseId,
        toState: "stopped",
        reason: `[SIMULATION] Recovery attempt failed: permanent decline or customer opted out.`,
        actor: "simulation:engine",
      });
      await auditService.record({
        caseId,
        action: "stop",
        summary: `[SIMULATION] Case stopped: permanent decline or customer opted out.`,
        detail: {
          lifecycleEvent: "CASE_STOPPED",
          recoveredMinor: 0,
        },
        actor: "simulation:engine",
      });
    }

    if (current.batchId) {
      await this.refreshBatchRow(current.batchId);
    }

    return updatedRow;
  }


  /**
   * Evaluate an existing batch by ID from DB records.
   */
  public async getBatchEvaluation(batchId: string): Promise<BatchSimulationResult> {
    const [batchRow] = await this._db
      .select()
      .from(batches)
      .where(eq(batches.id, batchId))
      .limit(1);

    if (!batchRow) {
      throw new Error(`Batch ${batchId} not found.`);
    }

    const casesInBatch: RecoveryCaseRow[] = await this._db
      .select()
      .from(recoveryCases)
      .where(eq(recoveryCases.batchId, batchId));

    let totalRiskMinor = 0;
    let totalRecoveredMinor = 0;
    let recoveredCount = 0;
    let escalatedCount = 0;
    let stoppedCount = 0;
    let failedCount = 0;
    let waitingCount = 0;
    let customerActionCount = 0;

    const interventionSums = {
      paymentLink: 0,
      systemRetry: 0,
      reminder: 0,
      customerAction: 0,
      humanEscalation: 0,
    };

    for (const c of casesInBatch) {
      const risk = Number(c.amountAtRiskMinor || 0);
      const rec = Number(c.outcomeRecoveredMinor || 0);
      totalRiskMinor += risk;

      if (c.currentState === "recovered") {
        recoveredCount++;
        totalRecoveredMinor += rec;
        if (c.direction.includes("subscription") || c.direction.includes("checkout")) {
          interventionSums.paymentLink += rec;
        } else if (c.direction.includes("degradation") || c.direction.includes("mandate")) {
          interventionSums.systemRetry += rec;
        } else if (c.direction.includes("receivables") || c.direction.includes("promise")) {
          interventionSums.reminder += rec;
        } else {
          interventionSums.customerAction += rec;
        }
      } else if (c.currentState === "escalated" || c.escalated) {
        escalatedCount++;
      } else if (c.currentState === "stopped") {
        stoppedCount++;
      } else if (c.currentState === "failed") {
        failedCount++;
      } else if (c.currentState === "customer_action_required") {
        customerActionCount++;
        waitingCount++;
      } else {
        waitingCount++;
      }
    }

    const caseIds = casesInBatch.map((c) => c.id).slice(0, 50);
    const auditLogs = caseIds.length > 0
      ? await this._db
          .select()
          .from(auditEvents)
          .where(inArray(auditEvents.caseId, caseIds))
          .orderBy(desc(auditEvents.occurredAt))
          .limit(10)
      : [];

    const activityTimeline: BatchSimulationResult["activity"] = auditLogs.map((l: any) => ({
      id: l.id,
      caseNumber: l.caseId ? `Case #${l.caseId.slice(0, 8)}` : "System",
      tag: l.actor || "AI Agent",
      time: new Date(l.occurredAt || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      description: l.summary,
      highlightText: l.action.replace(/_/g, " "),
      highlightColor: l.action.includes("recovery") ? "green" : l.action.includes("escalat") ? "orange" : "blue",
      icon: l.action.includes("recovery") ? "lucide:check-circle" : l.action.includes("escalat") ? "lucide:user-cog" : "lucide:activity",
      iconBgClass: l.action.includes("recovery")
        ? "bg-[#00B074]/10 dark:bg-[#00B074]/20 border border-[#00B074]/30"
        : "bg-[#3B82F6]/10 dark:bg-[#3B82F6]/20 border border-[#3B82F6]/30",
      iconTextClass: l.action.includes("recovery") ? "text-[#00B074]" : "text-[#3B82F6]",
    }));

    const recoveryRateDecimal = totalRiskMinor > 0 ? totalRecoveredMinor / totalRiskMinor : 0;

    return {
      batch: batchRow,
      metrics: {
        totalCases: casesInBatch.length,
        processedCases: casesInBatch.length,
        recoveredCases: recoveredCount,
        waitingCases: waitingCount,
        customerActionRequiredCases: customerActionCount,
        escalatedCases: escalatedCount,
        stoppedCases: stoppedCount,
        failedCases: failedCount,
        revenueAtRiskMinor: totalRiskMinor,
        actualRecoveredMinor: totalRecoveredMinor,
        recoveryRate: Number((recoveryRateDecimal * 100).toFixed(1)),
        byIntervention: {
          paymentLink: Math.round(interventionSums.paymentLink / 100),
          systemRetry: Math.round(interventionSums.systemRetry / 100),
          reminder: Math.round(interventionSums.reminder / 100),
          customerAction: Math.round(interventionSums.customerAction / 100),
          humanEscalation: Math.round(interventionSums.humanEscalation / 100),
        },
      },
      activity: activityTimeline,
    };
  }

  private buildEventPayload(
    direction: RecoveryDirectionCode,
    customer: CustomerRow,
    amountMinor: number,
    rng: SeededRandom,
    flags: { isRepeatedDegradation?: boolean; isDisputed?: boolean },
  ): { eventType: string; payload: Record<string, any> } {
    switch (direction) {
      case "01_payment_degradation":
        return {
          eventType: "payment.failed",
          payload: {
            paymentId: `pay_degrade_${rng.intRange(10000, 99999)}`,
            gateway: rng.choice(["HDFC_NETBANKING", "ICICI_UPI", "AXIS_CARDS", "RAZORPAY_PG"]),
            failureCode: flags.isRepeatedDegradation ? "GATEWAY_DEGRADATION_CRITICAL" : "NETWORK_TIMEOUT",
            failureReason: flags.isRepeatedDegradation ? "provider_degradation" : "network_error",
            provider: "HDFC",
            providerCode: "HDFC_NETBANKING",
            paymentMethod: "upi",
            bank: "HDFC",
            baselineSuccessRate: 0.88,
            currentSuccessRate: flags.isRepeatedDegradation ? 0.12 : 0.38,
            similarFailureCount: flags.isRepeatedDegradation ? 45 : 12,
            affectedCustomerCount: flags.isRepeatedDegradation ? 30 : 8,
            attemptCount: flags.isRepeatedDegradation ? 3 : 1,
          },
        };

      case "02_checkout_dropoff":
        return {
          eventType: "checkout.abandoned",
          payload: {
            checkoutSessionId: `chk_${rng.intRange(10000, 99999)}`,
            lastStep: rng.choice(["cart", "payment", "review"]),
            cartValueMinor: amountMinor,
            intentScore: Number(rng.range(0.70, 0.95).toFixed(2)),
            abandonmentDurationMinutes: rng.intRange(5, 30),
            previousAbandonedCount: 0,
          },
        };

      case "03_failed_subscription":
        return {
          eventType: "subscription.renewal_failed",
          payload: {
            subscriptionId: `sub_${rng.intRange(10000, 99999)}`,
            planId: rng.choice(["plan_enterprise_pro", "plan_growth_tier", "plan_starter"]),
            billingCycle: "monthly",
            failureReason: rng.choice(["card_expired", "insufficient_funds", "bank_decline"]),
            tenureMonths: rng.intRange(6, 36),
            previousSuccessfulRenewals: rng.intRange(5, 30),
            failedRenewalCount: flags.isRepeatedDegradation ? 3 : 1,
            gracePeriodDaysRemaining: rng.intRange(1, 5),
            mrrMinor: amountMinor,
          },
        };

      case "04_b2b_receivables":
        return {
          eventType: "invoice.overdue",
          payload: {
            invoiceId: `inv_${rng.intRange(10000, 99999)}`,
            invoiceNumber: `INV-2026-${rng.intRange(1000, 9999)}`,
            dueDate: new Date(Date.now() - rng.intRange(15, 60) * 86400000).toISOString(),
            daysOverdue: rng.intRange(15, 45),
            paymentTerms: rng.choice(["NET_30", "NET_45", "NET_60"]),
            companyName: customer.name,
            contactEmail: customer.email,
            disputeStatus: flags.isDisputed ? "active" : "none",
          },
        };

      case "05_mandate_retry":
        return {
          eventType: "mandate.failed",
          payload: {
            mandateId: `umn_upi_${rng.intRange(100000, 999999)}`,
            mandateState: "active",
            bankCode: rng.choice(["SBIN", "HDFC", "ICIC", "UTIB"]),
            consecutiveFailures: flags.isRepeatedDegradation ? 3 : 1,
            successfulDebitsCount: rng.intRange(6, 24),
            bankDegradationHint: "temporary_bank_downtime",
          },
        };

      case "06_hinglish_voice":
        return {
          eventType: "voice.call_completed",
          payload: {
            interactionId: `call_${rng.intRange(10000, 99999)}`,
            callDurationSeconds: rng.intRange(45, 120),
            transcriptText: "Haanji main Friday tak EMI pay kar dunga UPI payment link WhatsApp par bhej dijiye.",
            detectedLanguage: "hinglish",
            sentiment: "positive",
            voiceIntent: "promise_to_pay",
            promisedDate: new Date(Date.now() + 3 * 86400000).toISOString(),
          },
        };

      case "07_promise_to_pay":
      default:
        return {
          eventType: "promise.created",
          payload: {
            promiseId: `ptp_${rng.intRange(10000, 99999)}`,
            promisedMinor: amountMinor,
            promisedDate: new Date(Date.now() + 2 * 86400000).toISOString(),
            promiseType: "firm",
            promiseStatus: "pending",
            source: "CUSTOMER_SELF_SERVE",
            customerReliabilityScore: Number(customer.risk?.reliabilityScore ?? 0.85),
          },
        };
    }
  }
}


export const batchSimulator = new BatchSimulationService(db);
