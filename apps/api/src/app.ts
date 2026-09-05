// Ensure BigInt serialization never throws TypeError: Do not know how to serialize a BigInt
if (typeof BigInt !== "undefined" && !(BigInt.prototype as any).toJSON) {
  (BigInt.prototype as any).toJSON = function () {
    const num = Number(this);
    return Number.isSafeInteger(num) ? num : this.toString();
  };
}

import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { loadApiConfig, type ApiConfig } from "./config.js";
import { getLogger, REDACTION_PATHS } from "./lib/logger.js";
import { requestId } from "./lib/request-id.js";
import { errorHandler } from "./middleware/error-handler.js";
import { notFoundHandler } from "./middleware/not-found.js";
import { clerkAuthMiddleware } from "./middleware/auth.js";
import { apiRateLimiter, webhookRateLimiter } from "./middleware/rate-limiter.js";
import { healthRouter } from "./routes/health.js";
import { queueTestRouter } from "./routes/queue-test.js";
import { casesRouter } from "./routes/cases.js";
import { eventsRouter } from "./routes/events.js";
import { auditRouter } from "./routes/audit-events.js";
import { policiesRouter, casesPolicyRouter } from "./routes/policies.js";
import { casesAgentRouter } from "./routes/cases-agent.js";
import { llmHealthRouter } from "./routes/llm-health.js";
import { paymentRecoveryRouter } from "./routes/payment-recovery.js";
import { checkoutRecoveryRouter } from "./routes/checkout-recovery.js";
import { subscriptionRecoveryRouter } from "./routes/subscription-recovery.js";
import { receivablesRecoveryRouter } from "./routes/receivables-recovery.js";
import { mandateRecoveryRouter } from "./routes/mandate-recovery.js";
import { voiceRecoveryRouter } from "./routes/voice-recovery.js";
import { promisesRouter } from "./routes/promises.js";
import { webhooksRazorpayRouter } from "./routes/webhooks-razorpay.js";
import { streamRouter } from "./routes/stream.js";
import { jobsRouter } from "./routes/jobs.js";
import { observabilityRouter } from "./routes/observability.js";
import { metricsRouter } from "./routes/metrics.js";
import { scenariosRouter } from "./routes/scenarios.js";
import { liveDemoRouter } from "./routes/live-demo.js";

export interface AppDeps {
  config?: ApiConfig;
}

export function createApp(deps: AppDeps = {}): Express {
  const config = deps.config ?? loadApiConfig();
  const log = getLogger();
  const app = express();

  // Request ID middleware must come first so all subsequent logging can include it.
  app.use(requestId);

  app.use(
    pinoHttp({
      logger: log,
      genReqId: (req) => (req as unknown as { id: string }).id,
      redact: {
        paths: REDACTION_PATHS,
        censor: "[REDACTED]",
      },
      serializers: {
        req(req) {
          return { method: req.method, url: req.url, id: req.id };
        },
        res(res) {
          return { statusCode: res.statusCode };
        },
      },
      customLogLevel: (_req, res, err) => {
        if (err || res.statusCode >= 500) return "error";
        if (res.statusCode >= 400) return "warn";
        return "info";
      },
    }),
  );

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
        },
      },
      crossOriginEmbedderPolicy: false,
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
      },
    }),
  );
  app.use(
    cors({
      origin: config.corsOrigin,
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-API-Key", "X-Request-Id"],
    }),
  );

  app.use(`/api/${config.version}`, apiRateLimiter);
  app.use("/webhooks", webhookRateLimiter);

  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));
  app.use(clerkAuthMiddleware);

  // routers
  app.use(healthRouter);
  app.use(`/api/${config.version}`, healthRouter);
  app.use(`/api/${config.version}`, queueTestRouter);
  app.use(`/api/${config.version}`, casesRouter);
  app.use(`/api/${config.version}`, eventsRouter);
  app.use(`/api/${config.version}`, auditRouter);
  app.use(`/api/${config.version}`, policiesRouter);
  app.use(`/api/${config.version}`, casesPolicyRouter);
  app.use(`/api/${config.version}`, casesAgentRouter);
  app.use(`/api/${config.version}`, llmHealthRouter);
  app.use(`/api/${config.version}`, paymentRecoveryRouter);
  app.use(`/api/${config.version}`, checkoutRecoveryRouter);
  app.use(`/api/${config.version}`, subscriptionRecoveryRouter);
  app.use(subscriptionRecoveryRouter);
  app.use(`/api/${config.version}`, receivablesRecoveryRouter);
  app.use(receivablesRecoveryRouter);
  app.use(`/api/${config.version}`, mandateRecoveryRouter);
  app.use(mandateRecoveryRouter);
  app.use(`/api/${config.version}`, voiceRecoveryRouter);
  app.use(voiceRecoveryRouter);
  app.use(`/api/${config.version}`, promisesRouter);
  app.use(promisesRouter);
  app.use(`/api/${config.version}`, webhooksRazorpayRouter);
  app.use(webhooksRazorpayRouter);
  app.use(`/api/${config.version}`, streamRouter);
  app.use(streamRouter);
  app.use(`/api/${config.version}`, jobsRouter);
  app.use(jobsRouter);
  app.use(`/api/${config.version}`, observabilityRouter);
  app.use(observabilityRouter);
  app.use(`/api/${config.version}`, metricsRouter);
  app.use(metricsRouter);
  app.use(`/api/${config.version}`, scenariosRouter);
  app.use(scenariosRouter);
  app.use(`/api/${config.version}`, liveDemoRouter);
  app.use(liveDemoRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
