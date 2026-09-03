import { Router } from "express";
import { eventBroadcaster, StreamEventPayload } from "../lib/broadcaster.js";

export const streamRouter = Router();

streamRouter.get("/stream", (req, res) => {
  const origin = (req.headers.origin as string) || "http://localhost:3000";

  // Set SSE HTTP Headers with explicit CORS for EventSource
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("X-Accel-Buffering", "no");

  if (typeof (res as any).flushHeaders === "function") {
    (res as any).flushHeaders();
  }

  // Flush initial connection event
  const initPayload: StreamEventPayload = {
    type: "connected",
    timestamp: new Date().toISOString(),
    data: { status: "online", message: "Real-time SSE stream connected" },
  };
  res.write(`event: connected\ndata: ${JSON.stringify(initPayload)}\n\n`);

  // Event listener callback
  const onEvent = (payload: StreamEventPayload) => {
    res.write(`event: ${payload.type}\ndata: ${JSON.stringify(payload)}\n\n`);
  };

  eventBroadcaster.on("event", onEvent);

  // Send a keep-alive ping every 10 seconds to prevent timeout
  const pingInterval = setInterval(() => {
    res.write(": ping\n\n");
  }, 10000);

  // Clean up when client closes connection
  req.on("close", () => {
    clearInterval(pingInterval);
    eventBroadcaster.off("event", onEvent);
    res.end();
  });
});
