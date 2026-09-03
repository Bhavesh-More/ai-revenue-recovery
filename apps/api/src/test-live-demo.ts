import { db } from "@recovery/db";
import { recoveryCases, auditEvents } from "@recovery/db/schema";
import { eq, desc } from "drizzle-orm";

async function run() {
  console.log("=== 1. TESTING STANDARD LIVE DEMO (POLICY ALLOWED) ===");

  const payload1 = {
    direction: "03_failed_subscription",
    customer: {
      name: "Priya Sharma",
      email: "priya.sharma@example.com",
      companyName: "Sharma Tech Solutions",
    },
    amount: 1499,
    directionData: {
      subscriptionId: "sub_demo_priya",
      failureReason: "bank_decline",
      gracePeriodDays: 5,
    },
  };

  const res1 = await fetch("http://localhost:4000/api/v1/live-demo/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload1),
  });

  const body1 = (await res1.json()) as any;
  console.log("Case 1 Status:", body1.data?.status);
  console.log("Email Sent:", body1.data?.emailSent);
  console.log("Case 1 ID:", body1.data?.case?.id);

  if (body1.data?.status !== "customer_action_required" || !body1.data?.emailSent) {
    throw new Error("Case 1 failed expected flow: " + JSON.stringify(body1));
  }

  console.log("\n=== 2. TESTING HIGH-VALUE LIVE DEMO (POLICY ESCALATED & APPROVAL) ===");

  const payload2 = {
    direction: "04_b2b_receivables",
    customer: {
      name: "Vikram Malhotra",
      email: "vikram@malhotracorp.com",
      companyName: "Malhotra Enterprises Ltd",
    },
    amount: 650000, // ₹6,50,000 (> ₹5,00,000 threshold -> requires human approval)
    directionData: {
      invoiceNumber: "INV-2026-HIGH-01",
      paymentTerms: "Net 30",
    },
  };

  const res2 = await fetch("http://localhost:4000/api/v1/live-demo/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload2),
  });

  const body2 = (await res2.json()) as any;
  console.log("Case 2 Status:", body2.data?.status);
  console.log("Approval Required:", body2.data?.approvalRequired);
  console.log("Case 2 ID:", body2.data?.case?.id);

  if (body2.data?.status !== "escalated" || !body2.data?.approvalRequired) {
    throw new Error("Case 2 did not escalate as expected: " + JSON.stringify(body2));
  }

  console.log("\nApproving Case 2 via /api/v1/live-demo/approve...");
  const approveRes = await fetch("http://localhost:4000/api/v1/live-demo/approve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      caseId: body2.data.case.id,
      actor: "supervisor_sarah",
    }),
  });

  const approveBody = (await approveRes.json()) as any;
  console.log("Post-Approval Status:", approveBody.data?.status);
  console.log("Post-Approval Email Sent:", approveBody.data?.emailSent);

  if (approveBody.data?.status !== "customer_action_required" || !approveBody.data?.emailSent) {
    throw new Error("Approval flow failed: " + JSON.stringify(approveBody));
  }

  // Inspect Timeline Events for Case 2
  const logs = await db
    .select()
    .from(auditEvents)
    .where(eq(auditEvents.caseId, body2.data.case.id))
    .orderBy(desc(auditEvents.occurredAt));

  console.log(`\nCase 2 Audit Timeline (${logs.length} events):`);
  for (const log of logs) {
    const lifecycle = (log.detail as any)?.lifecycleEvent || "";
    console.log(`- [${log.action}] ${lifecycle ? `(${lifecycle}) ` : ""}${log.summary}`);
  }

  console.log("\n=== ALL TESTS PASSED SUCCESSFULLY ===");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
