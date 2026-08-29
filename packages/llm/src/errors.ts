export class OllamaClientError extends Error {
  readonly code: string;
  readonly status?: number;
  constructor(message: string, opts: { code?: string; status?: number; cause?: unknown } = {}) {
    super(message, opts.cause ? { cause: opts.cause } : undefined);
    this.name = "OllamaClientError";
    this.code = opts.code ?? "OLLAMA_CLIENT_ERROR";
    this.status = opts.status;
  }
}

export class OllamaTimeoutError extends OllamaClientError {
  constructor(message: string, opts: { cause?: unknown } = {}) {
    super(message, { code: "OLLAMA_TIMEOUT", status: 408, cause: opts.cause });
    this.name = "OllamaTimeoutError";
  }
}

export class OllamaResponseParseError extends OllamaClientError {
  constructor(message: string, opts: { cause?: unknown } = {}) {
    super(message, { code: "OLLAMA_PARSE_ERROR", cause: opts.cause });
    this.name = "OllamaResponseParseError";
  }
}

export function isOllamaError(e: unknown): e is OllamaClientError {
  return e instanceof OllamaClientError;
}

export function isTransientOllamaError(e: unknown): boolean {
  if (!isOllamaError(e)) return false;
  if (e instanceof OllamaTimeoutError) return true;
  if (e.status === undefined) return true;
  return e.status === 408 || e.status === 429 || e.status >= 500;
}
