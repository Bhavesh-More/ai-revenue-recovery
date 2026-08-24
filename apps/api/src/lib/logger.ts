// Structured Pino logger.
import { pino, type Logger } from "pino";
import { loadEnv } from "@recovery/config";

let cached: Logger | null = null;

export function getLogger(): Logger {
  if (cached) return cached;
  const env = loadEnv();
  cached = pino({
    level: env.LOG_LEVEL,
    base: {
      app: "recovery-api",
      env: env.NODE_ENV,
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    transport:
      env.NODE_ENV === "development"
        ? {
            target: "pino-pretty",
            options: {
              colorize: true,
              translateTime: "SYS:standard",
              ignore: "pid,hostname",
            },
          }
        : undefined,
  });
  return cached;
}

export function createLogger(name: string): Logger {
  return getLogger().child({ component: name });
}
