import { Router } from "express";
import { TRACING_CONFIG } from "@recovery/agent";
import { ok } from "../lib/responses.js";
import { asyncHandler } from "../lib/async-handler.js";

export const observabilityRouter = Router();

observabilityRouter.get(
  "/observability/status",
  asyncHandler(async (_req, res) => {
    ok(res, {
      tracingEnabled: TRACING_CONFIG.enabled,
      project: TRACING_CONFIG.project ?? "ai-revenue-recovery",
      environment: TRACING_CONFIG.environment ?? "development",
      endpoint: TRACING_CONFIG.endpoint || "https://api.smith.langchain.com",
      status: TRACING_CONFIG.enabled ? "ACTIVE" : "SANDBOX_MOCK",
    });
  }),
);
