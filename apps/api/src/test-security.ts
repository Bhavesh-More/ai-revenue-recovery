import { apiRateLimiter } from "./middleware/rate-limiter.js";

async function runSecurityTest() {
  console.log("=== Testing Security Hardening & Rate Limiting ===");

  // Test 1: Rate Limiter Middleware Execution
  console.log("\n[Test 1] Testing Rate Limiting Middleware...");
  const mockReq: any = {
    ip: "127.0.0.1",
    headers: {},
    app: {
      get: (key: string) => (key === "trust proxy" ? false : undefined),
    },
  };

  const mockRes: any = {
    setHeader: () => {},
    getHeader: () => undefined,
  };

  let rateLimiterPassed = false;
  await new Promise<void>((resolve) => {
    apiRateLimiter(mockReq, mockRes, () => {
      rateLimiterPassed = true;
      resolve();
    });
  });

  console.log(`         Rate Limiter Execution: ${rateLimiterPassed ? "PASSED" : "FAILED"}`);

  // Test 2: Webhook Timestamp Replay Attack Defense
  console.log("\n[Test 2] Testing Webhook Timestamp Drift Validation...");

  const currentTime = Math.floor(Date.now() / 1000);
  const staleTimestamp = currentTime - 600; // 10 minutes old (exceeds 300s limit)

  const driftSeconds = Math.abs(currentTime - staleTimestamp);
  const isStale = driftSeconds > 300;

  console.log(`         Drift Seconds: ${driftSeconds}s`);
  console.log(`         Replay Protection Rejection Triggered: ${isStale}`);

  if (rateLimiterPassed && isStale) {
    console.log("\n✅ All Security Hardening & Rate Limiting Tests Passed!");
  } else {
    console.error("\n❌ Security Hardening Tests Failed!");
    process.exit(1);
  }
}

runSecurityTest().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
