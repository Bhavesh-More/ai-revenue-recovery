import { db } from "@recovery/db";
import { recoveryCases, auditEvents, agentDecisions, recoveryActions } from "@recovery/db/schema";
import { eq, desc } from "drizzle-orm";

async function main() {
  console.log("==================================================");
  console.log("TESTING LIVE DEMO DIRECTION 07 WITH REAL RESEND EMAIL");
  console.log("==================================================");

  const payload = {
    direction: "07_promise_to_pay",
    customer: {
      name: "Bhavesh More",
      email: "bhaveshmmore2006@gmail.com",
      companyName: "Dev Solutions",
    },
    amount: 1200,
    directionData: {
      promisedDate: "2026-09-04",
      source: "customer_portal",
    },
  };

  console.log("\nSending POST /api/v1/live-demo/execute...");
  const res = await fetch("http://localhost:4000/api/v1/live-demo/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const body = (await res.json()) as any;
  console.log(`\nHTTP Response Status: ${res.status}`);
  console.log("Response Body:", JSON.stringify(body, null, 2));

  if (!res.ok || !body.data?.case?.id) {
    throw new Error(`Execution failed: ${JSON.stringify(body)}`);
  }

  const caseId = body.data.case.id;
  console.log("\nCreated Demo Case ID:", caseId);

  // 1. Verify Case row
  const [caseRow] = await db.select().from(recoveryCases).where(eq(recoveryCases.id, caseId));
  console.log("\n1. Case Current State:", caseRow.currentState);
  console.log("   Amount at risk minor:", caseRow.amountAtRiskMinor);
  console.log("   Outcome recovered minor:", caseRow.outcomeRecoveredMinor);

  // 2. Verify AI Decision
  const decisions = await db.select().from(agentDecisions).where(eq(agentDecisions.caseId, caseId));
  console.log("\n2. AI Decisions count:", decisions.length);
  for (const d of decisions) {
    console.log(`   Decision ${d.id}: status=${d.status}, recommendation actionType=${d.recommendation?.actionType}`);
    console.log("   Recommendation parameters:", JSON.stringify(d.recommendation?.parameters));
  }

  // 3. Verify Recovery Actions
  const actions = await db.select().from(recoveryActions).where(eq(recoveryActions.caseId, caseId));
  console.log("\n3. Recovery Actions count:", actions.length);
  for (const a of actions) {
    console.log(`   Action ${a.id}: type=${a.type}, status=${a.status}, extRef=${a.resultExternalReference}`);
    console.log("   Payload:", JSON.stringify(a.payload));
  }

  // 4. Verify Audit Timeline
  const logs = await db.select().from(auditEvents).where(eq(auditEvents.caseId, caseId)).orderBy(desc(auditEvents.occurredAt));
  console.log(`\n4. Audit Timeline Events (${logs.length}):`);
  for (const l of logs) {
    const lifecycle = (l.detail as any)?.lifecycleEvent || "";
    console.log(`   - [${l.action}] ${lifecycle ? `(${lifecycle}) ` : ""}${l.summary}`);
  }

  console.log("\n==================================================");
  console.log("VERIFICATION COMPLETED");
  console.log("==================================================");
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
