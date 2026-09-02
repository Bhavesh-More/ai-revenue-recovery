import { getStructuredLogger, createChildLogger, type Logger } from "@recovery/logger";

export type { Logger };

export function getWorkerLogger(): Logger {
  return getStructuredLogger("recovery-worker");
}

export function createWorkerChildLogger(componentName: string): Logger {
  return createChildLogger(componentName);
}
