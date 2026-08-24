import { pino, type Logger } from "pino";
import { loadEnv } from "@recovery/config";

let cached: Logger | null = null;

export function getWorkerLogger(): Logger {
  if (cached) return cached;
  const env = loadEnv();
  cached = pino({
    level: env.LOG_LEVEL,
    base: {
      app: "recovery-worker",
      env: env.NODE_ENV,
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  });
  return cached;
}
