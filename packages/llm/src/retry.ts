export interface RetryOptions {
  attempts: number;
  baseMs: number;
  jitter?: boolean;
  shouldRetry?: (err: unknown) => boolean;
  onAttempt?: (attempt: number, err: unknown) => void;
}

export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  opts: RetryOptions,
): Promise<T> {
  if (opts.attempts < 1) {
    throw new Error("withRetry requires attempts >= 1.");
  }
  let lastErr: unknown;
  for (let i = 0; i < opts.attempts; i++) {
    try {
      return await fn(i);
    } catch (err) {
      lastErr = err;
      opts.onAttempt?.(i, err);
      const retry = opts.shouldRetry ? opts.shouldRetry(err) : true;
      if (!retry || i === opts.attempts - 1) break;
      const backoff = opts.baseMs * Math.pow(2, i);
      const jitter = opts.jitter ? Math.random() * opts.baseMs : 0;
      await new Promise((r) => setTimeout(r, backoff + jitter));
    }
  }
  throw lastErr;
}
