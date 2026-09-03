import { db } from "@recovery/db";
import { recoveryCases, agentDecisions, customers, revenueEvents, auditEvents, batches } from "@recovery/db/schema";
import { batchSimulator } from "@recovery/agent";
import { eq, desc } from "drizzle-orm";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

async function testAuthoritativeFlow() {
  console.log("=================================================");
  console.log("Testing Authoritative Batch Generation & Simulation Flow");
  console.log("=================================================\n");

  // 1. TEST BATCH GENERATION: Synthetic generation produces inputs, AI reasons, Policy checks, Simulation runs
  console.log("1. Generating synthetic batch of 15 cases (mixed directions)...");
  const batchResult = await batchSimulator.generateAndSimulateBatch({
    batchName: `Test Batch ${Date.now()}`,
    numberOfCases: 15,
    generationMode: "mixed",
    randomSeed: 42,
  });

  console.log(`   - Batch ID: ${batchResult.batch.id}`);
  console.log(`   - Total Cases: ${batchResult.metrics.totalCases}`);
  console.log(`   - Recovered: ${batchResult.metrics.recoveredCases}`);
  console.log(`   - Waiting: ${batchResult.metrics.waitingCases}`);
  console.log(`   - Escalated: ${batchResult.metrics.escalatedCases}`);
  console.log(`   - Stopped: ${batchResult.metrics.stoppedCases}`);
  console.log(`   - Risk Revenue: ₹${Math.round(batchResult.metrics.revenueAtRiskMinor / 100)}`);
  console.log(`   - Recovered Revenue: ₹${Math.round(batchResult.metrics.actualRecoveredMinor / 100)}`);
  console.log(`   - Recovery Rate: ${batchResult.metrics.recoveryRate}%`);

  // Assert recovery rate is within valid bounds
  assert(batchResult.metrics.totalCases === 15, "Total cases should be 15");
  assert(batchResult.metrics.revenueAtRiskMinor > 0, "Revenue at risk must be greater than 0");
  assert(
    batchResult.metrics.recoveryRate <= 100 && batchResult.metrics.recoveryRate >= 0,
    "Recovery rate must be between 0 and 100%",
  );

  // 2. VERIFY METRICS MATCH PERSISTED DB ROWS EXACTLY
  console.log("\n2. Verifying batch metrics match persisted DB rows...");
  const dbCases = await db
    .select()
    .from(recoveryCases)
    .where(eq(recoveryCases.batchId, batchResult.batch.id));

  assert(dbCases.length === 15, "DB must have exactly 15 cases for this batch");

  let sumRisk = 0;
  let sumRecovered = 0;
  let dbRecoveredCount = 0;
  let dbWaitingCount = 0;
  let dbEscalatedCount = 0;
  let dbStoppedCount = 0;

  for (const c of dbCases) {
    sumRisk += Number(c.amountAtRiskMinor || 0);
    const recMinor = Number(c.outcomeRecoveredMinor || 0);

    if (c.currentState === "recovered") {
      dbRecoveredCount++;
      sumRecovered += recMinor;
      assert(recMinor > 0, `Recovered case ${c.id} must have positive outcomeRecoveredMinor`);
    } else {
      // Non-recovered cases MUST have 0 recovered revenue!
      assert(
        recMinor === 0,
        `Non-recovered case ${c.id} (state: ${c.currentState}) MUST have outcomeRecoveredMinor === 0, but got ${recMinor}`,
      );
      if (c.currentState === "escalated" || c.escalated) {
        dbEscalatedCount++;
      } else if (c.currentState === "stopped") {
        dbStoppedCount++;
      } else {
        dbWaitingCount++;
      }
    }
  }

  assert(sumRisk === batchResult.metrics.revenueAtRiskMinor, "Sum of risk minor must match batch metric");
  assert(sumRecovered === batchResult.metrics.actualRecoveredMinor, "Sum of recovered minor must match batch metric");
  console.log("   ✓ Financial metrics match persisted DB rows exactly.");
  console.log("   ✓ Non-recovered cases have strictly 0 recovered revenue.");

  // 3. TEST APPROVAL FLOW: Approval MUST NOT directly settle a case
  console.log("\n3. Testing Approval Flow (Approval does NOT settle)...");

  // Find an escalated case or create one
  let escalatedCase = dbCases.find((c) => c.currentState === "escalated");
  if (!escalatedCase) {
    const [cust] = await db
      .insert(customers)
      .values({
        name: "Escalated Test Customer",
        phone: "+919876543210",
        email: "escalated@example.com",
      })
      .returning();

    const [ev] = await db
      .insert(revenueEvents)
      .values({
        customerId: cust.id,
        type: "payment.failed",
        source: "test",
        amountAtRiskMinor: 500000,
        currency: "INR",
        payload: {},
      })
      .returning();

    const [newCase] = await db
      .insert(recoveryCases)
      .values({
        customerId: cust.id,
        originatingEventId: ev.id,
        direction: "01_payment_degradation",
        currentState: "escalated",
        amountAtRiskMinor: 500000,
        currency: "INR",
        escalated: true,
        riskTier: "critical",
      })
      .returning();

    await db.insert(agentDecisions).values({
      caseId: newCase.id,
      runId: crypto.randomUUID(),
      type: "recovery",
      status: "awaiting_approval",
      policyResult: {
        decision: "require_approval",
        reasons: ["High exposure threshold"],
      },
      recommendation: {
        actionType: "retry_payment",
        rationale: "Secondary PSP retry required for high exposure",
      },
    });

    escalatedCase = newCase;
  }

  console.log(`   - Escalated Case ID: ${escalatedCase.id} (amount: ₹${Number(escalatedCase.amountAtRiskMinor) / 100})`);
  
  // Approve the case via approveAndSimulateCase
  const approvedResult = await batchSimulator.approveAndSimulateCase(escalatedCase.id, "test_supervisor");

  console.log(`   - Post-Approval State: ${approvedResult.currentState}`);
  console.log(`   - Recovered Revenue: ₹${Number(approvedResult.outcomeRecoveredMinor || 0) / 100}`);

  // Verify case is no longer escalated
  assert(approvedResult.currentState !== "escalated", "Case must not remain in escalated state after approval");
  assert(
    ["recovered", "waiting", "customer_action_required", "stopped"].includes(approvedResult.currentState),
    `Case must transition to valid outcome state, got ${approvedResult.currentState}`,
  );

  // Check audit events for the case
  const audits = await db
    .select()
    .from(auditEvents)
    .where(eq(auditEvents.caseId, escalatedCase.id))
    .orderBy(desc(auditEvents.occurredAt));

  const approvalGrantedEvent = audits.find((a) => (a.detail as any)?.lifecycleEvent === "APPROVAL_GRANTED");
  assert(!!approvalGrantedEvent, "Must record APPROVAL_GRANTED lifecycle audit event");
  assert(
    approvalGrantedEvent?.action === "action_executed",
    "APPROVAL_GRANTED audit event action must be action_executed, NOT recovery",
  );

  const actionSimulationEvent = audits.find((a) => (a.detail as any)?.lifecycleEvent === "ACTION_EXECUTED_SIMULATION");
  assert(!!actionSimulationEvent, "Must record ACTION_EXECUTED_SIMULATION lifecycle audit event");

  console.log("   ✓ APPROVAL_GRANTED lifecycle event recorded.");
  console.log("   ✓ ACTION_EXECUTED_SIMULATION lifecycle event recorded.");
  console.log(`   ✓ Customer outcome resolved to ${approvedResult.currentState} (Decoupled from approval!).`);

  // 4. TEST REJECTION FLOW: Rejection moves to STOPPED, revenue = 0
  console.log("\n4. Testing Rejection Flow...");
  const [cust2] = await db
    .insert(customers)
    .values({
      name: "Reject Test Customer",
      phone: "+919876543211",
      email: "reject@example.com",
    })
    .returning();

  const [ev2] = await db
    .insert(revenueEvents)
    .values({
      customerId: cust2.id,
      type: "invoice.overdue",
      source: "test",
      amountAtRiskMinor: 750000,
      currency: "INR",
      payload: {},
    })
    .returning();

  const [rejectCase] = await db
    .insert(recoveryCases)
    .values({
      customerId: cust2.id,
      originatingEventId: ev2.id,
      direction: "04_b2b_receivables",
      currentState: "escalated",
      amountAtRiskMinor: 750000,
      currency: "INR",
      escalated: true,
      riskTier: "high",
    })
    .returning();

  await db.insert(agentDecisions).values({
    caseId: rejectCase.id,
    runId: crypto.randomUUID(),
    type: "recovery",
    status: "awaiting_approval",
    policyResult: {
      decision: "require_approval",
      reasons: ["B2B legal notice threshold"],
    },
    recommendation: {
      actionType: "send_whatsapp",
      rationale: "Send legal notice",
    },
  });

  const rejectedResult = await batchSimulator.rejectCaseSimulation(rejectCase.id, "test_supervisor", "Disputed invoice");

  assert(rejectedResult.currentState === "stopped", "Rejected case must transition to stopped");
  assert(Number(rejectedResult.outcomeRecoveredMinor || 0) === 0, "Rejected case must have 0 recovered revenue");

  const rejectAudits = await db
    .select()
    .from(auditEvents)
    .where(eq(auditEvents.caseId, rejectCase.id))
    .orderBy(desc(auditEvents.occurredAt));

  const approvalRejectedEvent = rejectAudits.find((a) => (a.detail as any)?.lifecycleEvent === "APPROVAL_REJECTED");
  assert(!!approvalRejectedEvent, "Must record APPROVAL_REJECTED lifecycle audit event");
  console.log("   ✓ Rejection transitioned case to STOPPED with 0 recovered revenue.");
  console.log("   ✓ APPROVAL_REJECTED lifecycle event recorded.");

  console.log("\n=================================================");
  console.log("ALL AUTHORITATIVE FLOW TESTS PASSED SUCCESSFULLY!");
  console.log("=================================================");
}

testAuthoritativeFlow()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Test failed:", err);
    process.exit(1);
  });
