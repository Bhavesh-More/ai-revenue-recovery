import crypto from "crypto";
import { RazorpayClient } from "./razorpay/client.js";

async function runRazorpayIntegrationTest() {
  console.log("=== Testing Razorpay Integration Package ===");

  const client = new RazorpayClient();

  // Test 1: Verify mock mode detection
  const isMock = client.isMockMode();
  console.log(`[Test 1] Sandbox Mock Mode Active: ${isMock}`);

  // Test 2: Create Payment Link
  const paymentLink = await client.createPaymentLink({
    amountMinor: 499900,
    currency: "INR",
    description: "SaaS Recovery Payment Link",
    customer: {
      name: "Rahul Sharma",
      contact: "+919876543210",
      email: "rahul@example.com",
    },
    referenceId: "RC-TEST-101",
  });

  console.log(`[Test 2] Created Payment Link ID: ${paymentLink.id}`);
  console.log(`         Short URL: ${paymentLink.short_url}`);

  // Test 3: Signature Verification
  const secret = "test_webhook_secret_key";
  const bodyPayload = JSON.stringify({
    event: "payment.captured",
    payload: {
      payment: {
        entity: {
          id: "pay_test_123",
          amount: 499900,
          status: "captured",
        },
      },
    },
    created_at: 1700000000,
  });

  const validSignature = crypto
    .createHmac("sha256", secret)
    .update(bodyPayload)
    .digest("hex");

  const isVerified = client.verifyWebhookSignature(bodyPayload, validSignature, secret);
  console.log(`[Test 3] HMAC Signature Verification Result: ${isVerified ? "PASS" : "FAIL"}`);

  const isInvalidRejected = !client.verifyWebhookSignature(bodyPayload, "invalid_sig_hash", secret);
  console.log(`[Test 4] Invalid Signature Rejection Result: ${isInvalidRejected ? "PASS" : "FAIL"}`);

  if (isVerified && isInvalidRejected && paymentLink.short_url) {
    console.log("\n All Razorpay Integration Tests Passed!");
  } else {
    console.error("\n Razorpay Integration Tests Failed!");
    process.exit(1);
  }
}

runRazorpayIntegrationTest().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
