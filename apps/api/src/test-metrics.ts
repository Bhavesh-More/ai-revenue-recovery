import { RecoveryMetricsCalculator, DEFAULT_DIRECTION_BASELINES } from "@recovery/case-lifecycle";
import type { RecoveryCaseRow } from "@recovery/db/schema";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

async function runMetricsTests() {
  console.log("=========================================");
  console.log("Starting Commit 39 — Recovery Metrics Integration Test");
  console.log("=========================================\n");

  const calculator = new RecoveryMetricsCalculator(null as any);

  // Mock test cases spanning multiple directions and outcomes
  const mockCases: Partial<RecoveryCaseRow>[] = [
    // Case 1: Payment Degradation - Recovered
    {
      id: "case-1",
      direction: "01_payment_degradation",
      currentState: "recovered",
      amountAtRiskMinor: 100000, // 1000 INR
      recoveryProbability: "0.800",
      attemptCount: 2,
      escalated: false,
      outcomeState: "recovered",
      outcomeRecoveredMinor: 100000,
      outcomePromisedMinor: 100000,
      riskTier: "medium",
    },
    // Case 2: Payment Degradation - Escalated & Failed
    {
      id: "case-2",
      direction: "01_payment_degradation",
      currentState: "failed",
      amountAtRiskMinor: 200000, // 2000 INR
      recoveryProbability: "0.400",
      attemptCount: 3,
      escalated: true,
      outcomeState: "failed",
      outcomeRecoveredMinor: 0,
      outcomePromisedMinor: 0,
      riskTier: "high",
    },
    // Case 3: Checkout Dropoff - Recovered
    {
      id: "case-3",
      direction: "02_checkout_dropoff",
      currentState: "recovered",
      amountAtRiskMinor: 500000, // 5000 INR
      recoveryProbability: "0.900",
      attemptCount: 1,
      escalated: false,
      outcomeState: "recovered",
      outcomeRecoveredMinor: 500000,
      outcomePromisedMinor: 500000,
      riskTier: "low",
    },
    // Case 4: Failed Subscription - Stopped by Policy
    {
      id: "case-4",
      direction: "03_failed_subscription",
      currentState: "stopped",
      amountAtRiskMinor: 300000, // 3000 INR
      recoveryProbability: "0.200",
      attemptCount: 0,
      escalated: false,
      outcomeState: "stopped",
      outcomeRecoveredMinor: 0,
      outcomePromisedMinor: 0,
      riskTier: "high",
    },
  ];

  const results = calculator.calculateFromCases(mockCases as RecoveryCaseRow[]);

  console.log("1. Total Cases & State Counts:");
  console.log(`   - Total Cases: ${results.totalCases}`);
  console.log(`   - Recovered: ${results.recoveredCases}`);
  console.log(`   - Escalated: ${results.escalatedCases}`);
  console.log(`   - Stopped: ${results.stoppedCases}`);
  console.log(`   - Failed: ${results.failedCases}`);
  assert(results.totalCases === 4, "Total cases should be 4");
  assert(results.recoveredCases === 2, "Recovered cases should be 2");
  assert(results.escalatedCases === 1, "Escalated cases should be 1");
  assert(results.stoppedCases === 1, "Stopped cases should be 1");
  console.log("   ✓ State counts assertion passed.");

  console.log("\n2. Financial Outcome Metrics:");
  console.log(`   - Revenue at Risk: ${results.revenueAtRiskMinor} minor units`);
  console.log(`   - Expected Recovery: ${results.expectedRecoveryMinor} minor units`);
  console.log(`   - Promised Amount: ${results.promisedAmountMinor} minor units`);
  console.log(`   - Actual Recovered: ${results.actualRecoveredMinor} minor units`);
  
  // Total Risk = 100k + 200k + 500k + 300k = 1,100,000 minor units
  assert(results.revenueAtRiskMinor === 1100000, "Revenue at risk should be 1,100,000");
  
  // Expected = (100k * 0.8) + (200k * 0.4) + (500k * 0.9) + (300k * 0.2) = 80k + 80k + 450k + 60k = 670,000
  assert(results.expectedRecoveryMinor === 670000, "Expected recovery should be 670,000");
  
  // Actual Recovered = 100k + 500k = 600,000
  assert(results.actualRecoveredMinor === 600000, "Actual recovered should be 600,000");
  console.log("   ✓ Financial metrics assertions passed.");

  console.log("\n3. Recovery Rate & Incremental Recovery:");
  console.log(`   - Recovery Rate: ${(results.recoveryRate * 100).toFixed(2)}%`);
  console.log(`   - Natural Baseline Recovered: ${results.naturalBaselineRecoveredMinor} minor units`);
  console.log(`   - Incremental Recovery: ${results.incrementalRecoveryMinor} minor units`);
  
  // Recovery Rate = 600,000 / 1,100,000 = 0.5455
  assert(Math.abs(results.recoveryRate - 0.5455) < 0.001, "Recovery rate should be ~0.5455");

  // Baseline Recovered:
  // Case 1 (degradation 10%): 100k * 0.10 = 10k
  // Case 2 (degradation 10%): 200k * 0.10 = 20k
  // Case 3 (checkout 15%): 500k * 0.15 = 75k
  // Case 4 (subscription 8%): 300k * 0.08 = 24k
  // Total Baseline = 10k + 20k + 75k + 24k = 129,000
  assert(results.naturalBaselineRecoveredMinor === 129000, "Baseline recovered should be 129,000");

  // Incremental Recovery = 600k - 129k = 471,000
  assert(results.incrementalRecoveryMinor === 471000, "Incremental recovery should be 471,000");
  console.log("   ✓ Recovery rate & incremental lift assertions passed.");

  console.log("\n4. Operational Effectiveness Rates:");
  console.log(`   - Intervened Cases: ${results.intervenedCases}`);
  console.log(`   - Intervention Effectiveness: ${(results.interventionEffectiveness * 100).toFixed(2)}%`);
  console.log(`   - Escalation Rate: ${(results.escalationRate * 100).toFixed(2)}%`);
  console.log(`   - Stop Rate: ${(results.stopRate * 100).toFixed(2)}%`);

  // Intervened cases (attempts > 0): Case 1 (2), Case 2 (3), Case 3 (1) = 3 cases.
  // Intervened recovered: Case 1, Case 3 = 2 cases.
  // Intervention Effectiveness = 2 / 3 = 0.6667
  assert(results.intervenedCases === 3, "Intervened cases should be 3");
  assert(Math.abs(results.interventionEffectiveness - 0.6667) < 0.001, "Intervention effectiveness should be ~0.6667");
  assert(results.escalationRate === 0.25, "Escalation rate should be 25%");
  assert(results.stopRate === 0.25, "Stop rate should be 25%");
  console.log("   ✓ Operational effectiveness assertions passed.");

  console.log("\n5. Directional Breakdown:");
  const deg = results.byDirection["01_payment_degradation"];
  assert(deg !== undefined, "Payment degradation breakdown should exist");
  assert(deg!.totalCases === 2, "Degradation cases count should be 2");
  assert(deg!.actualRecoveredMinor === 100000, "Degradation recovered minor should be 100k");
  console.log(`   - Payment Degradation: ${deg!.totalCases} cases, Recovered: ${deg!.actualRecoveredMinor} minor units`);
  console.log("   ✓ Directional breakdown assertion passed.");

  console.log("\n=========================================");
  console.log("ALL 9 RECOVERY OUTCOME METRICS TESTS PASSED CLEANLY!");
  console.log("=========================================");
}

runMetricsTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
