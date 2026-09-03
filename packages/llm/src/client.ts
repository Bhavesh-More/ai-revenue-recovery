import OpenAI from "openai";
import type { Logger } from "pino";
import {
  OllamaClientError,
  OllamaResponseParseError,
  OllamaTimeoutError,
} from "./errors.js";
import { OllamaKeyPool, type KeyPoolStats } from "./key-manager.js";
import type {
  ChatChoice,
  ChatMessage,
  ChatRequest,
  ChatResponse,
  ChatUsage,
  OllamaClientConfig,
} from "./types.js";

interface OpenAIChatMessageLike {
  role: string;
  content?: string | null;
  refusal?: string | null;
}

interface OpenAIChatChoiceLike {
  index: number;
  finish_reason: string;
  message: OpenAIChatMessageLike;
}

interface OpenAIChatUsageLike {
  prompt_tokens: number;
  completion_tokens: number;
  totalTokens?: number;
  total_tokens?: number;
}

interface OpenAIChatCompletionLike {
  id: string;
  model: string;
  created: number;
  choices: OpenAIChatChoiceLike[];
  usage?: OpenAIChatUsageLike;
}

function toChatMessage(m: OpenAIChatMessageLike): ChatMessage {
  if (m.role !== "system" && m.role !== "user" && m.role !== "assistant" && m.role !== "tool") {
    throw new OllamaResponseParseError(`Unsupported chat role: ${m.role}`);
  }
  return {
    role: m.role,
    content: m.content ?? "",
  };
}

function toChatChoice(c: OpenAIChatChoiceLike): ChatChoice {
  return {
    index: c.index,
    finishReason: c.finish_reason,
    message: toChatMessage(c.message),
  };
}

function toChatUsage(u: OpenAIChatUsageLike | undefined): ChatUsage {
  if (!u) {
    return { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
  }
  const totalTokens = u.total_tokens ?? (u.prompt_tokens + u.completion_tokens);
  return {
    promptTokens: u.prompt_tokens,
    completionTokens: u.completion_tokens,
    totalTokens,
  };
}


function toChatResponse(c: OpenAIChatCompletionLike): ChatResponse {
  if (!c.choices || c.choices.length === 0) {
    throw new OllamaResponseParseError("LLM response had no choices.");
  }
  return {
    id: c.id,
    model: c.model,
    created: c.created,
    choices: c.choices.map(toChatChoice),
    usage: toChatUsage(c.usage),
  };
}

function isOpenAIAPIError(e: unknown): boolean {
  return e instanceof OpenAI.APIError;
}

export class OllamaClient {
  private readonly defaultModel: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly logger?: Logger;
  private readonly keyPool: OllamaKeyPool;
  private readonly sdkCache: Map<string, OpenAI> = new Map();

  constructor(config: OllamaClientConfig, logger?: Logger) {
    const rawKeys =
      config.apiKeys && config.apiKeys.length > 0
        ? config.apiKeys
        : config.apiKey
        ? [config.apiKey]
        : [];

    if (rawKeys.length === 0) {
      throw new OllamaClientError("OllamaClient requires at least one API key (e.g. api_key_1).");
    }
    if (!config.baseUrl) {
      throw new OllamaClientError("OllamaClient requires baseUrl.");
    }
    if (!config.model) {
      throw new OllamaClientError("OllamaClient requires model.");
    }

    this.defaultModel = config.model;
    this.baseUrl = config.baseUrl;
    this.timeoutMs = config.timeoutMs ?? 30_000;
    this.logger = logger;
    this.keyPool = new OllamaKeyPool(rawKeys, logger);
  }

  public getKeyPool(): OllamaKeyPool {
    return this.keyPool;
  }

  public getKeyStats(): KeyPoolStats {
    return this.keyPool.getStats();
  }

  private getSdkForApiKey(apiKey: string): OpenAI {
    let sdk = this.sdkCache.get(apiKey);
    if (!sdk) {
      sdk = new OpenAI({
        baseURL: this.baseUrl,
        apiKey,
        timeout: this.timeoutMs,
        maxRetries: 0,
      });
      this.sdkCache.set(apiKey, sdk);
    }
    return sdk;
  }

  async chatCompletion(req: ChatRequest): Promise<ChatResponse> {
    const model = req.model ?? this.defaultModel;
    const maxAttempts = Math.max(1, this.keyPool.getTotalKeys());
    let lastError: unknown = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const activeKeyInfo = this.keyPool.getActiveKeyInfo();
      const sdk = this.getSdkForApiKey(activeKeyInfo.key);
      const startedAt = Date.now();

      try {
        const messages = req.messages.map((m) => ({
          role: m.role as "system" | "user" | "assistant" | "tool",
          content: m.content,
          ...(m.name ? { name: m.name } : {}),
        }));

        const completion = (await sdk.chat.completions.create({
          model,
          messages: messages as unknown as Parameters<OpenAI["chat"]["completions"]["create"]>[0]["messages"],
          ...(req.response_format ? { response_format: req.response_format } : {}),
          temperature: req.temperature ?? 0.2,
          max_tokens: req.max_tokens ?? 1024,
        })) as unknown as OpenAIChatCompletionLike;

        const latencyMs = Date.now() - startedAt;
        const totalTokens = completion.usage?.total_tokens ?? 0;
        this.keyPool.recordSuccess(totalTokens);

        this.logger?.info(
          {
            model,
            keyName: activeKeyInfo.name,
            latencyMs,
            promptTokens: completion.usage?.prompt_tokens ?? 0,
            completionTokens: completion.usage?.completion_tokens ?? 0,
            totalTokens,
            finishReason: completion.choices[0]?.finish_reason,
          },
          "ollama.chatCompletion",
        );

        return toChatResponse(completion);
      } catch (err) {
        const latencyMs = Date.now() - startedAt;
        lastError = err;
        this.keyPool.recordError();

        const isExhausted = this.keyPool.isExhaustionError(err);
        const hasMoreKeys = this.keyPool.getTotalKeys() > 1;

        if (isExhausted && hasMoreKeys && attempt < maxAttempts) {
          const nextKey = this.keyPool.shiftToNextKey(
            isOpenAIAPIError(err)
              ? `HTTP ${(err as any).status || 429} Rate Limit / Quota Exceeded`
              : "100% usage / rate limit reached",
          );
          this.logger?.warn(
            {
              exhaustedKey: activeKeyInfo.name,
              nextKey: nextKey.name,
              attempt,
              maxAttempts,
            },
            `[OllamaClient] Switched active key from ${activeKeyInfo.name} to ${nextKey.name} after 100% usage / rate limit. Retrying request.`,
          );
          continue;
        }

        if (isOpenAIAPIError(err)) {
          const apiErr = err as { status?: number; message?: unknown; name?: string };
          const status = apiErr.status ?? 0;
          const message = typeof apiErr.message === "string" ? apiErr.message : "OpenAI SDK error.";
          const code = `OLLAMA_HTTP_${status}`;
          const isTimeout =
            (typeof apiErr.name === "string" && apiErr.name === "APIConnectionTimeoutError") ||
            status === 408;
          const wrapped = isTimeout
            ? new OllamaTimeoutError(message, { cause: err })
            : new OllamaClientError(message, { code, status, cause: err });
          this.logger?.warn({ model, keyName: activeKeyInfo.name, latencyMs, status, message }, "ollama.chatCompletion.error");
          throw wrapped;
        }

        if (
          err &&
          typeof err === "object" &&
          "name" in err &&
          (err as { name?: unknown }).name === "AbortError"
        ) {
          this.logger?.warn({ model, keyName: activeKeyInfo.name, latencyMs }, "ollama.chatCompletion.timeout");
          throw new OllamaTimeoutError("Ollama request timed out.", { cause: err });
        }

        const message = err instanceof Error ? err.message : String(err);
        this.logger?.error({ model, keyName: activeKeyInfo.name, latencyMs, err: message }, "ollama.chatCompletion.unexpected");
        throw new OllamaClientError(`Unexpected Ollama error: ${message}`, { cause: err });
      }
    }

    const message = lastError instanceof Error ? lastError.message : String(lastError);
    throw new OllamaClientError(`All Ollama API keys exhausted: ${message}`, { cause: lastError });
  }
}

