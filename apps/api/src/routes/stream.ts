import { Router } from "express";
import { eventBroadcaster, StreamEventPayload } from "../lib/broadcaster.js";

export const streamRouter = Router();

streamRouter.get("/stream", (req, res) => {
  // Set SSE HTTP Headers
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

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

  // Send a keep-alive ping every 15 seconds to prevent gateway/proxy timeouts
  const pingInterval = setInterval(() => {
    res.write(": ping\n\n");
  }, 15000);

  // Clean up when client closes connection
  req.on("close", () => {
    clearInterval(pingInterval);
    eventBroadcaster.off("event", onEvent);
    res.end();
  });
});
