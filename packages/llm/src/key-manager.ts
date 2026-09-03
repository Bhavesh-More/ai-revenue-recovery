import type { Logger } from "pino";

export interface KeyInfo {
  name: string;
  key: string;
  index: number;
  requestCount: number;
  totalTokens: number;
  errorCount: number;
  isExhausted: boolean;
  exhaustedAt?: number;
  exhaustionReason?: string;
}

export interface KeyPoolStats {
  totalKeys: number;
  activeKeyName: string;
  activeKeyIndex: number;
  exhaustedCount: number;
  keys: Array<{
    name: string;
    index: number;
    requestCount: number;
    totalTokens: number;
    errorCount: number;
    isExhausted: boolean;
    exhaustionReason?: string;
  }>;
}

export class OllamaKeyPool {
  private readonly keys: KeyInfo[];
  private activeIndex: number = 0;
  private readonly logger?: Logger;
  private readonly cooldownMs: number;

  constructor(apiKeys: string[], logger?: Logger, cooldownMs: number = 60_000) {
    this.logger = logger;
    this.cooldownMs = cooldownMs;

    const filteredKeys = apiKeys.map((k) => k.trim()).filter((k) => k.length > 0);
    if (filteredKeys.length === 0) {
      filteredKeys.push("mock-ollama-key");
    }

    this.keys = filteredKeys.map((key, idx) => ({
      name: `OLLAMA_API_KEY_${idx + 1}`,
      key,
      index: idx,
      requestCount: 0,
      totalTokens: 0,
      errorCount: 0,
      isExhausted: false,
    }));
  }



  public getActiveKeyInfo(): KeyInfo {
    this.checkCooldowns();
    return this.keys[this.activeIndex] || this.keys[0];
  }

  public getActiveKey(): string {
    return this.getActiveKeyInfo().key;
  }

  public getActiveKeyName(): string {
    return this.getActiveKeyInfo().name;
  }

  public getTotalKeys(): number {
    return this.keys.length;
  }

  /**
   * Determine if an error is a 100% usage / rate limit / quota exhaustion error.
   */
  public isExhaustionError(err: unknown): boolean {
    if (!err) return false;
    if (typeof err === "object") {
      const e = err as Record<string, any>;
      const status = e.status || e.statusCode || e.code;
      if (status === 429 || status === "429" || status === "RATE_LIMIT_EXCEEDED" || status === "OLLAMA_HTTP_429") {
        return true;
      }
      const message = String(e.message || e.error || "").toLowerCase();
      if (
        message.includes("rate limit") ||
        message.includes("quota") ||
        message.includes("too many requests") ||
        message.includes("exceeded") ||
        message.includes("capacity") ||
        message.includes("exhausted") ||
        message.includes("429") ||
        message.includes("credits") ||
        message.includes("limit reached")
      ) {
        return true;
      }
    }
    const str = String(err).toLowerCase();
    return str.includes("429") || str.includes("rate limit") || str.includes("quota") || str.includes("exceeded");
  }

  /**
   * Shift from the current key to the next available key when 100% usage or rate limit is reached.
   */
  public shiftToNextKey(reason: string = "100% usage / rate limit reached"): KeyInfo {
    const current = this.keys[this.activeIndex];
    if (current) {
      current.isExhausted = true;
      current.exhaustedAt = Date.now();
      current.exhaustionReason = reason;
      current.errorCount++;
    }

    const previousIndex = this.activeIndex;
    const previousName = current?.name || `api_key_${previousIndex + 1}`;

    // Find the next available non-exhausted key
    let nextIndex = (this.activeIndex + 1) % this.keys.length;
    let found = false;

    for (let attempt = 0; attempt < this.keys.length; attempt++) {
      const candidate = this.keys[nextIndex];
      if (candidate && (!candidate.isExhausted || (candidate.exhaustedAt && Date.now() - candidate.exhaustedAt > this.cooldownMs))) {
        candidate.isExhausted = false;
        this.activeIndex = nextIndex;
        found = true;
        break;
      }
      nextIndex = (nextIndex + 1) % this.keys.length;
    }

    if (!found) {
      // If all keys exhausted, reset the next key to retry
      this.activeIndex = (previousIndex + 1) % this.keys.length;
      this.keys[this.activeIndex].isExhausted = false;
    }

    const nextKey = this.keys[this.activeIndex];

    this.logger?.warn(
      {
        previousKey: previousName,
        nextKey: nextKey.name,
        totalKeys: this.keys.length,
        reason,
      },
      `[Ollama Key Pool] API key ${previousName} reached 100% usage / limit. Shifting to ${nextKey.name}.`,
    );

    return nextKey;
  }

  public recordSuccess(tokens: number = 0): void {
    const active = this.keys[this.activeIndex];
    if (active) {
      active.requestCount++;
      active.totalTokens += tokens;
    }
  }

  public recordError(): void {
    const active = this.keys[this.activeIndex];
    if (active) {
      active.errorCount++;
    }
  }

  public getStats(): KeyPoolStats {
    this.checkCooldowns();
    return {
      totalKeys: this.keys.length,
      activeKeyName: this.getActiveKeyName(),
      activeKeyIndex: this.activeIndex,
      exhaustedCount: this.keys.filter((k) => k.isExhausted).length,
      keys: this.keys.map((k) => ({
        name: k.name,
        index: k.index,
        requestCount: k.requestCount,
        totalTokens: k.totalTokens,
        errorCount: k.errorCount,
        isExhausted: k.isExhausted,
        exhaustionReason: k.exhaustionReason,
      })),
    };
  }

  private checkCooldowns(): void {
    const now = Date.now();
    for (const key of this.keys) {
      if (key.isExhausted && key.exhaustedAt && now - key.exhaustedAt > this.cooldownMs) {
        key.isExhausted = false;
        key.exhaustedAt = undefined;
        key.exhaustionReason = undefined;
      }
    }
  }
}
