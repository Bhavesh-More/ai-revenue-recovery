import { eventBroadcaster, StreamEventPayload } from "./lib/broadcaster.js";

async function runSseStreamTest() {
  console.log("=== Testing Real-Time SSE Stream Broadcaster ===");

  let receivedEvent: StreamEventPayload | null = null;

  // Subscribe test listener
  eventBroadcaster.on("event", (payload: StreamEventPayload) => {
    receivedEvent = payload;
    console.log(`[SSE Test Listener Received] Type: ${payload.type}`);
    console.log(`                             Timestamp: ${payload.timestamp}`);
    console.log(`                             Data: ${JSON.stringify(payload.data)}`);
  });

  // Test 1: Broadcast case.created event
  console.log("\n[Test 1] Broadcasting 'case.created' event...");
  eventBroadcaster.broadcast("case.created", {
    caseId: "CASE-STREAM-101",
    amountAtRiskMinor: 499900,
    direction: "01_payment_degradation",
  });

  // Test 2: Broadcast case.updated event
  console.log("\n[Test 2] Broadcasting 'case.updated' event...");
  eventBroadcaster.broadcast("case.updated", {
    caseId: "CASE-STREAM-101",
    toState: "recovered",
    reason: "Razorpay payment link settled",
  });

  // Test 3: Broadcast webhook.event
  console.log("\n[Test 3] Broadcasting 'webhook.event'...");
  eventBroadcaster.broadcast("webhook.event", {
    event: "payment_link.paid",
    processedCaseId: "CASE-STREAM-101",
  });

  const lastEvt = receivedEvent as StreamEventPayload | null;
  if (lastEvt && lastEvt.type === "webhook.event") {
    console.log("\n All SSE Stream Broadcaster Tests Passed!");
  } else {
    console.error("\n SSE Stream Broadcaster Tests Failed!");
    process.exit(1);
  }
}

runSseStreamTest().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
