import { getStructuredLogger, createChildLogger, REDACTION_PATHS, type Logger } from "@recovery/logger";

export type { Logger };

export function getLogger(): Logger {
  return getStructuredLogger("recovery-api");
}

export function createLogger(name: string): Logger {
  return createChildLogger(name);
}

export { REDACTION_PATHS };
