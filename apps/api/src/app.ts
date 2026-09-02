import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { loadApiConfig, type ApiConfig } from "./config.js";
import { getLogger } from "./lib/logger.js";
import { requestId } from "./lib/request-id.js";
import { errorHandler } from "./middleware/error-handler.js";
import { notFoundHandler } from "./middleware/not-found.js";
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

  app.use(helmet());
  app.use(
    cors({
      origin: config.corsOrigin,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));

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

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
