import { clerkAuthMiddleware, AuthenticatedRequest } from "./middleware/auth.js";

async function runClerkAuthTest() {
  console.log("=== Testing Express Clerk Auth Middleware ===");

  // Test 1: Public Webhook Bypass Route
  console.log("\n[Test 1] Testing Razorpay Webhook Public Exemption...");
  const mockWebhookReq = {
    path: "/webhooks/razorpay",
    headers: {},
  } as AuthenticatedRequest;

  clerkAuthMiddleware(mockWebhookReq, {} as any, () => {});
  console.log(`         Exempted Webhook Actor: ${mockWebhookReq.actor}`);

  // Test 2: Local Sandbox Dev Mode Fallback
  console.log("\n[Test 2] Testing Local Sandbox Dev Mode Context...");
  const mockDevReq = {
    path: "/cases",
    headers: {},
  } as AuthenticatedRequest;

  clerkAuthMiddleware(mockDevReq, {} as any, () => {});
  console.log(`         Dev Mode Actor: ${mockDevReq.actor}`);
  console.log(`         Dev Mode User Role: ${mockDevReq.userRole}`);

  // Test 3: Bearer Token Extraction
  console.log("\n[Test 3] Testing Bearer Token Extraction...");
  const mockTokenReq = {
    path: "/cases",
    headers: {
      authorization: "Bearer clerk_user_token_901823",
    },
  } as AuthenticatedRequest;

  // Temporarily simulate auth enabled
  process.env.CLERK_AUTH_ENABLED = "true";
  process.env.CLERK_SECRET_KEY = "mock_secret";

  clerkAuthMiddleware(mockTokenReq, {} as any, () => {});
  console.log(`         Authenticated Actor: ${mockTokenReq.actor}`);
  console.log(`         User Role: ${mockTokenReq.userRole}`);

  if (
    mockWebhookReq.actor === "system:public_webhook" &&
    mockTokenReq.actor === "operator:clerk_clerk_us"
  ) {
    console.log("\n✅ All Clerk Authentication Middleware Tests Passed!");
  } else {
    console.error("\n❌ Clerk Authentication Middleware Tests Failed!");
    process.exit(1);
  }
}

runClerkAuthTest().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
