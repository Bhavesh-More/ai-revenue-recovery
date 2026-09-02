import { agentJobTracker } from "./job-tracker.js";
import { TRACING_CONFIG } from "./tracing.js";

async function runObservabilityTest() {
  console.log("=== Testing Agent Observability & Telemetry ===");

  const testJobId = "job_test_observability_101";
  const caseId = "CASE-OBSERVABILITY-101";

  // Test 1: Create Job
  console.log("\n[Test 1] Creating agent job...");
  const job = agentJobTracker.createJob(testJobId, caseId, "RECOVERY_ANALYSIS");
  console.log(`         Job ID: ${job.id}`);
  console.log(`         Status: ${job.status}`);
  console.log(`         Progress: ${job.progress}%`);

  // Test 2: Add Job Events
  console.log("\n[Test 2] Adding step-by-step reasoning events...");
  agentJobTracker.addJobEvent(testJobId, "LOAD_CONTEXT", "Loaded payment failure history and customer profile");
  agentJobTracker.addJobEvent(testJobId, "POLICY_CHECK", "Validated retry policy parameters (Max retries: 3)");
  agentJobTracker.addJobEvent(testJobId, "ACTION_SELECTED", "AI selected Razorpay Payment Link generation");
  agentJobTracker.updateJobStatus(testJobId, "SUCCEEDED", 100);

  const updatedJob = agentJobTracker.getJob(testJobId);
  const events = agentJobTracker.getJobEvents(testJobId);

  console.log(`         Updated Job Status: ${updatedJob?.status}`);
  console.log(`         Total Recorded Events: ${events.length}`);

  // Test 3: Tracing Config Resolution
  console.log("\n[Test 3] Tracing Config Resolution:");
  console.log(`         Tracing Enabled: ${TRACING_CONFIG.enabled}`);
  console.log(`         Project: ${TRACING_CONFIG.project}`);
  console.log(`         Environment: ${TRACING_CONFIG.environment}`);

  if (updatedJob?.status === "SUCCEEDED" && events.length === 4) {
    console.log("\n All Agent Observability & Telemetry Tests Passed!");
  } else {
    console.error("\n Agent Observability Tests Failed!");
    process.exit(1);
  }
}

runObservabilityTest().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
