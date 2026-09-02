import { DemoScenarioGenerator, DEMO_SCENARIOS, RecoveryMetricsCalculator } from "@recovery/case-lifecycle";
import type { RecoveryCaseRow } from "@recovery/db/schema";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

async function runScenarioTests() {
  console.log("=========================================");
  console.log("Starting Commit 40 — Demo Scenario Generator Integration Test");
  console.log("=========================================\n");

  const generator = new DemoScenarioGenerator(null as any);
  const scenarios = generator.getScenarios();

  console.log(`1. Validating scenario definitions count: ${scenarios.length}`);
  assert(scenarios.length === 7, "Should have exactly 7 pre-configured demo scenarios");
  console.log("   ✓ Scenario definitions count assertion passed.");

  console.log("\n2. Validating direction coverage across all 7 scenarios:");
  const expectedDirections = [
    "01_payment_degradation",
    "02_checkout_dropoff",
    "03_failed_subscription",
    "04_b2b_receivables",
    "05_mandate_retry",
    "06_hinglish_voice",
    "07_promise_to_pay",
  ];

  for (const dir of expectedDirections) {
    const match = scenarios.find((s) => s.direction === dir);
    assert(match !== undefined, `Scenario for direction ${dir} must exist`);
    console.log(`   - [${dir}] -> ${match!.name} (Risk: ${match!.caseData.riskTier}, Amount: ₹${match!.caseData.amountAtRiskMinor / 100})`);
  }
  console.log("   ✓ All 7 directions covered assertion passed.");

  console.log("\n3. Testing in-memory metric generation from demo scenario cases:");
  const mockCases: Partial<RecoveryCaseRow>[] = scenarios.map((s, idx) => ({
    id: `mock-case-${idx + 1}`,
    direction: s.direction,
    currentState: s.caseData.currentState,
    amountAtRiskMinor: s.caseData.amountAtRiskMinor,
    recoveryProbability: s.caseData.recoveryProbability.toFixed(3),
    riskTier: s.caseData.riskTier,
    attemptCount: s.caseData.attemptCount,
    escalated: s.caseData.escalated,
    latestDecisionSummary: s.caseData.decisionSummary,
    outcomeState: s.caseData.outcomeState,
    outcomeRecoveredMinor: s.caseData.outcomeRecoveredMinor ?? 0,
    outcomePromisedMinor: s.caseData.outcomePromisedMinor ?? 0,
  }));

  const metricsCalculator = new RecoveryMetricsCalculator(null as any);
  const metrics = metricsCalculator.calculateFromCases(mockCases as RecoveryCaseRow[]);

  console.log(`   - Total Cases: ${metrics.totalCases}`);
  console.log(`   - Revenue at Risk: ₹${metrics.revenueAtRiskMinor / 100}`);
  console.log(`   - Expected Recovery: ₹${metrics.expectedRecoveryMinor / 100}`);
  console.log(`   - Promised Amount: ₹${metrics.promisedAmountMinor / 100}`);

  assert(metrics.totalCases === 7, "Total cases evaluated should be 7");
  assert(metrics.revenueAtRiskMinor > 0, "Total revenue at risk must be greater than 0");
  assert(metrics.expectedRecoveryMinor > 0, "Expected recovery must be greater than 0");
  console.log("   ✓ In-memory metric calculation from demo scenario cases passed.");

  console.log("\n=========================================");
  console.log("ALL DEMO SCENARIO TESTS PASSED CLEANLY!");
  console.log("=========================================");
}

runScenarioTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
