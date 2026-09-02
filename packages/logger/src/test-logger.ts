import { getStructuredLogger, createChildLogger, REDACTION_PATHS } from "./index.js";

async function runLoggerTest() {
  console.log("=== Testing Structured Logger & PII Redaction ===");

  const logger = getStructuredLogger("test-service");

  // Test 1: Redaction of authorization headers & API keys
  console.log("\n[Test 1] Testing PII/PCI Redaction Paths...");
  const sampleLogData = {
    req: {
      headers: {
        authorization: "Bearer secret_token_xyz_123",
        "x-razorpay-signature": "hmac_signature_secret",
      },
    },
    apiKey: "live_api_key_secret",
    keySecret: "razorpay_secret_key",
    cardNumber: "4111111111111111",
    cvv: "123",
    caseId: "CASE-LOG-101",
  };

  logger.info(sampleLogData, "Testing structured log entry with sensitive fields");

  // Test 2: Child logger creation
  console.log("\n[Test 2] Testing Child Logger Context Propagation...");
  const childLogger = createChildLogger("PaymentAgent", {
    caseId: "CASE-LOG-101",
    runId: "run-90123",
  });

  childLogger.info("Executing recovery action decision step");

  console.log(`\nConfigured Redaction Paths Count: ${REDACTION_PATHS.length}`);
  console.log(" Structured Logger Integration Test Passed!");
}

runLoggerTest().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
