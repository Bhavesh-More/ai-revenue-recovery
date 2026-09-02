import { pino, type Logger, type LoggerOptions } from "pino";
import { loadEnv } from "@recovery/config";

export type { Logger };

export interface LogContext {
  component?: string;
  caseId?: string;
  requestId?: string;
  jobId?: string;
  actor?: string;
  [key: string]: unknown;
}

export const REDACTION_PATHS = [
  "req.headers.authorization",
  'req.headers["x-razorpay-signature"]',
  "authorization",
  "apiKey",
  "keySecret",
  "secret",
  "webhookSecret",
  "password",
  "cardNumber",
  "cvv",
  "*.apiKey",
  "*.keySecret",
  "*.secret",
  "*.cardNumber",
  "*.cvv",
];

let rootLogger: Logger | null = null;

export function getStructuredLogger(serviceName = "recovery-service"): Logger {
  if (rootLogger) return rootLogger;

  const env = loadEnv();
  const logLevel = env.LOG_LEVEL || "info";
  const isDev = env.NODE_ENV === "development";

  const options: LoggerOptions = {
    level: logLevel,
    base: {
      app: serviceName,
      env: env.NODE_ENV,
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: {
      paths: REDACTION_PATHS,
      censor: "[REDACTED]",
    },
    transport: isDev
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
          },
        }
      : undefined,
  };

  rootLogger = pino(options);
  return rootLogger;
}

export function createChildLogger(componentName: string, context?: LogContext): Logger {
  const parent = getStructuredLogger();
  return parent.child({
    component: componentName,
    ...context,
  });
}
