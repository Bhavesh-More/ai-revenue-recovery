import { eq } from "drizzle-orm";
import {
  customers,
  revenueEvents,
  recoveryCases,
  agentDecisions,
  promises,
  batches,
  type RecoveryCaseRow,
  type CustomerRow,
} from "@recovery/db/schema";
import type { RecoveryDirectionCode, CaseState, RiskTier } from "@recovery/types";
import { auditService } from "@recovery/audit";

export interface DemoScenarioDefinition {
  key: string;
  name: string;
  description: string;
  direction: RecoveryDirectionCode;
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  event: {
    eventType: string;
    amountMinor: number;
    currency: string;
    payload: Record<string, any>;
  };
  caseData: {
    amountAtRiskMinor: number;
    recoveryProbability: number;
    riskTier: RiskTier;
    currentState: CaseState;
    decisionSummary: string;
    attemptCount: number;
    escalated: boolean;
    outcomeState?: CaseState;
    outcomeRecoveredMinor?: number;
    outcomePromisedMinor?: number;
  };
  promiseData?: {
    promisedMinor: number;
    promiseDateISO: string;
    notes: string;
  };
}

export const DEMO_SCENARIOS: DemoScenarioDefinition[] = [
  {
    key: "payment_degradation",
    name: "Payment Provider Degradation Spike",
    description: "HDFC Netbanking gateway success rate collapses to 12%, triggering automated AI smart gateway routing to ICICI fallback.",
    direction: "01_payment_degradation",
    customer: {
      name: "Flipkart Seller Merchant #8412",
      email: "finance@flipkartseller8412.com",
      phone: "+919876543210",
    },
    event: {
      eventType: "payment.failed",
      amountMinor: 45000000, // ₹4,50,000
      currency: "INR",
      payload: {
        gateway: "HDFC_NETBANKING",
        failureCode: "GATEWAY_TIMEOUT_DEGRADATION",
        healthScore: 0.12,
        merchantId: "merch_8412",
      },
    },
    caseData: {
      amountAtRiskMinor: 45000000,
      recoveryProbability: 0.85,
      riskTier: "high",
      currentState: "recovering",
      decisionSummary: "Detected 42% success rate drop on HDFC Netbanking. Initiated smart gateway failover to ICICI PG route.",
      attemptCount: 2,
      escalated: false,
    },
  },
  {
    key: "checkout_dropoff",
    name: "Flash Sale Checkout Dropoff",
    description: "High-intent customer abandons ₹18,500 cart at OTP entry. AI offers 5% instant cashback recovery link.",
    direction: "02_checkout_dropoff",
    customer: {
      name: "Aarav Sharma",
      email: "aarav.sharma@example.com",
      phone: "+919812345678",
    },
    event: {
      eventType: "checkout.abandoned",
      amountMinor: 1850000, // ₹18,500
      currency: "INR",
      payload: {
        checkoutSessionId: "chk_9941a",
        step: "OTP_VERIFICATION",
        device: "mobile_android",
        itemCount: 3,
      },
    },
    caseData: {
      amountAtRiskMinor: 1850000,
      recoveryProbability: 0.75,
      riskTier: "medium",
      currentState: "customer_action_required",
      decisionSummary: "User abandoned cart at OTP stage during flash sale. Generated 5% instant discount link via WhatsApp.",
      attemptCount: 1,
      escalated: false,
    },
  },
  {
    key: "subscription_failure",
    name: "SaaS Subscription Renewal Card Expiry",
    description: "Annual SaaS subscription renewal failed due to expired credit card. Grace period and update portal link dispatched.",
    direction: "03_failed_subscription",
    customer: {
      name: "TechCorp Solutions Pvt Ltd",
      email: "billing@techcorp.in",
      phone: "+919900112233",
    },
    event: {
      eventType: "subscription.renewal_failed",
      amountMinor: 2499900, // ₹24,999
      currency: "INR",
      payload: {
        subscriptionId: "sub_techcorp_annual",
        plan: "Enterprise Pro Annual",
        failureReason: "CARD_EXPIRED",
        nextRetryAt: "2026-09-05T00:00:00Z",
      },
    },
    caseData: {
      amountAtRiskMinor: 2499900,
      recoveryProbability: 0.90,
      riskTier: "medium",
      currentState: "recovering",
      decisionSummary: "Card expiry detected on Enterprise Pro subscription. Granted 3-day grace period and sent card update portal.",
      attemptCount: 1,
      escalated: false,
    },
  },
  {
    key: "b2b_receivables",
    name: "B2B Overdue Invoice Escalation",
    description: "Enterprise invoice ₹12.5L overdue by 45 days. Automated multi-channel chasers failed; escalated to CFO for payment plan.",
    direction: "04_b2b_receivables",
    customer: {
      name: "Reliance Retail Logistics",
      email: "ap@relianceretail-logistics.com",
      phone: "+919700011122",
    },
    event: {
      eventType: "invoice.overdue",
      amountMinor: 125000000, // ₹12,50,000
      currency: "INR",
      payload: {
        invoiceNumber: "INV-2026-9041",
        dueDate: "2026-07-15T00:00:00Z",
        daysOverdue: 45,
        creditLimitMinor: 500000000,
      },
    },
    caseData: {
      amountAtRiskMinor: 125000000,
      recoveryProbability: 0.65,
      riskTier: "critical",
      currentState: "escalated",
      decisionSummary: "Invoice overdue 45 days exceeds tolerance limit. Escalated case to Account Executive & CFO for custom structured payment plan.",
      attemptCount: 4,
      escalated: true,
    },
  },
  {
    key: "mandate_retry",
    name: "UPI AutoPay Mandate Debit Failure",
    description: "E-mandate debit failed due to bank downtime on 1st of month. Re-presentment scheduled for next-day optimal window.",
    direction: "05_mandate_retry",
    customer: {
      name: "Priya Patel",
      email: "priya.patel@example.com",
      phone: "+919822233344",
    },
    event: {
      eventType: "mandate.debit_failed",
      amountMinor: 500000, // ₹5,000
      currency: "INR",
      payload: {
        mandateId: "umn_upi_887192",
        bankCode: "SBIN",
        failureCode: "BANK_SERVER_UNAVAILABLE",
      },
    },
    caseData: {
      amountAtRiskMinor: 500000,
      recoveryProbability: 0.95,
      riskTier: "low",
      currentState: "waiting",
      decisionSummary: "SBI server unavailable during morning batch. Mandate re-presentment scheduled for 06:00 AM tomorrow.",
      attemptCount: 1,
      escalated: false,
    },
  },
  {
    key: "hinglish_voice",
    name: "Conversational AI Hinglish Voice Call",
    description: "High-value consumer loan EMI overdue. Interactive AI voice call in Hinglish secured verbal PTP commitment.",
    direction: "06_hinglish_voice",
    customer: {
      name: "Rajesh Kumar",
      email: "rajesh.k@example.com",
      phone: "+919833344455",
    },
    event: {
      eventType: "loan_emi.overdue",
      amountMinor: 3500000, // ₹35,000
      currency: "INR",
      payload: {
        loanAccountId: "LA-99210",
        emiNumber: 4,
        preferredLanguage: "hinglish",
      },
    },
    caseData: {
      amountAtRiskMinor: 3500000,
      recoveryProbability: 0.70,
      riskTier: "high",
      currentState: "customer_action_required",
      decisionSummary: "Completed 2-min Hinglish Voice Call. Customer acknowledged overdue EMI and promised payment by Friday via UPI link.",
      attemptCount: 1,
      escalated: false,
      outcomePromisedMinor: 3500000,
    },
    promiseData: {
      promisedMinor: 3500000,
      promiseDateISO: new Date(Date.now() + 3 * 86400000).toISOString(),
      notes: "Agreed to pay full EMI ₹35,000 by Friday evening via UPI link sent on SMS.",
    },
  },
  {
    key: "promise_to_pay_batch",
    name: "Salary Day Promise-to-Pay Reminder",
    description: "Customer promised to settle ₹75,000 invoice on salary day (5th of month). Pre-due automated SMS reminder queued.",
    direction: "07_promise_to_pay",
    customer: {
      name: "Vikram Malhotra",
      email: "vikram.m@example.com",
      phone: "+919844455566",
    },
    event: {
      eventType: "payment.commitment_made",
      amountMinor: 7500000, // ₹75,000
      currency: "INR",
      payload: {
        commitmentChannel: "CUSTOMER_PORTAL",
        targetPayDate: "2026-09-05T00:00:00Z",
      },
    },
    caseData: {
      amountAtRiskMinor: 7500000,
      recoveryProbability: 0.80,
      riskTier: "medium",
      currentState: "waiting",
      decisionSummary: "Promise-to-Pay registered for salary day settlement. Queued automated 24h pre-due SMS & WhatsApp reminder.",
      attemptCount: 1,
      escalated: false,
      outcomePromisedMinor: 7500000,
    },
    promiseData: {
      promisedMinor: 7500000,
      promiseDateISO: "2026-09-05T00:00:00Z",
      notes: "Customer confirmed salary credit expected on 5th.",
    },
  },
];

export class DemoScenarioGenerator {
  constructor(private readonly db: any) {}

  public getScenarios(): DemoScenarioDefinition[] {
    return DEMO_SCENARIOS;
  }

  public async seedScenario(key: string): Promise<{ customer: CustomerRow; case: RecoveryCaseRow }> {
    const spec = DEMO_SCENARIOS.find((s) => s.key === key);
    if (!spec) {
      throw new Error(`Demo scenario '${key}' not found.`);
    }

    // 1. Create Customer
    const [cust] = await this.db
      .insert(customers)
      .values({
        name: spec.customer.name,
        email: spec.customer.email,
        phone: spec.customer.phone,
      })
      .returning();

    // 2. Create Revenue Event
    const [revEvent] = await this.db
      .insert(revenueEvents)
      .values({
        customerId: cust.id,
        eventType: spec.event.eventType,
        direction: spec.direction,
        amountMinor: BigInt(spec.event.amountMinor),
        currency: spec.event.currency,
        payload: spec.event.payload,
      })
      .returning();

    // 3. Create Recovery Case
    const [recCase] = await this.db
      .insert(recoveryCases)
      .values({
        customerId: cust.id,
        originatingEventId: revEvent.id,
        direction: spec.direction,
        currentState: spec.caseData.currentState,
        amountAtRiskMinor: spec.caseData.amountAtRiskMinor,
        currency: spec.event.currency,
        recoveryProbability: spec.caseData.recoveryProbability.toFixed(3),
        riskTier: spec.caseData.riskTier,
        attemptCount: spec.caseData.attemptCount,
        escalated: spec.caseData.escalated,
        latestDecisionSummary: spec.caseData.decisionSummary,
        outcomeState: spec.caseData.outcomeState ?? null,
        outcomeRecoveredMinor: spec.caseData.outcomeRecoveredMinor ?? 0,
        outcomePromisedMinor: spec.caseData.outcomePromisedMinor ?? 0,
      })
      .returning();

    // 4. Create Agent Decision record
    await this.db.insert(agentDecisions).values({
      caseId: recCase.id,
      selectedAction: "ACTION_PROPOSED",
      rationale: spec.caseData.decisionSummary,
      confidenceScore: spec.caseData.recoveryProbability.toFixed(3),
      riskScore: "0.250",
      status: "approved",
    });

    // 5. Create Audit Event
    await auditService.record(
      {
        caseId: recCase.id,
        action: "event_detected",
        summary: `[DEMO SCENARIO] Initialized ${spec.name}`,
        detail: {
          scenarioKey: spec.key,
          decision: spec.caseData.decisionSummary,
        },
        actor: "demo-scenario-generator",
      },
      this.db,
    );

    // 6. Create Promise record if applicable
    if (spec.promiseData) {
      await this.db.insert(promises).values({
        caseId: recCase.id,
        customerId: cust.id,
        promisedAmountMinor: BigInt(spec.promiseData.promisedMinor),
        currency: spec.event.currency,
        promisedDate: new Date(spec.promiseData.promiseDateISO),
        status: "active",
        notes: spec.promiseData.notes,
      });
    }

    return { customer: cust, case: recCase };
  }

  public async seedAll(): Promise<{ seededCount: number; cases: RecoveryCaseRow[] }> {
    const seededCases: RecoveryCaseRow[] = [];

    // Create a demo batch container for all seeded cases
    const [batchRow] = await this.db
      .insert(batches)
      .values({
        name: `Demo Scenario Batch — ${new Date().toISOString().substring(0, 10)}`,
        directions: DEMO_SCENARIOS.map((s) => s.direction),
        status: "completed",
        totalCases: BigInt(DEMO_SCENARIOS.length),
        revenueAtRiskMinor: BigInt(
          DEMO_SCENARIOS.reduce((sum, s) => sum + s.caseData.amountAtRiskMinor, 0),
        ),
      })
      .returning();

    for (const spec of DEMO_SCENARIOS) {
      const res = await this.seedScenario(spec.key);
      // Link case to batch
      const [updatedCase] = await this.db
        .update(recoveryCases)
        .set({ batchId: batchRow.id })
        .where(eq(recoveryCases.id, res.case.id))
        .returning();

      seededCases.push(updatedCase);
    }

    return {
      seededCount: seededCases.length,
      cases: seededCases,
    };
  }
}
