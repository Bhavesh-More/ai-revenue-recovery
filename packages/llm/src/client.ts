import OpenAI from "openai";
import type { Logger } from "pino";
import {
  OllamaClientError,
  OllamaResponseParseError,
  OllamaTimeoutError,
} from "./errors.js";
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
  total_tokens: number;
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
  return {
    promptTokens: u.prompt_tokens,
    completionTokens: u.completion_tokens,
    totalTokens: u.total_tokens,
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
  private readonly sdk: OpenAI;
  private readonly defaultModel: string;
  private readonly timeoutMs: number;
  private readonly logger?: Logger;

  constructor(config: OllamaClientConfig, logger?: Logger) {
    if (!config.apiKey) {
      throw new OllamaClientError("OllamaClient requires apiKey.");
    }
    if (!config.baseUrl) {
      throw new OllamaClientError("OllamaClient requires baseUrl.");
    }
    if (!config.model) {
      throw new OllamaClientError("OllamaClient requires model.");
    }
    this.defaultModel = config.model;
    this.timeoutMs = config.timeoutMs ?? 30_000;
    this.logger = logger;
    this.sdk = new OpenAI({
      baseURL: config.baseUrl,
      apiKey: config.apiKey,
      timeout: this.timeoutMs,
      maxRetries: 0,
    });
  }

  async chatCompletion(req: ChatRequest): Promise<ChatResponse> {
    const model = req.model ?? this.defaultModel;
    const startedAt = Date.now();
    try {
      const messages = req.messages.map((m) => ({
        role: m.role as "system" | "user" | "assistant" | "tool",
        content: m.content,
        ...(m.name ? { name: m.name } : {}),
      }));
      const completion = (await this.sdk.chat.completions.create({
        model,
        messages: messages as unknown as Parameters<OpenAI["chat"]["completions"]["create"]>[0]["messages"],
        ...(req.response_format ? { response_format: req.response_format } : {}),
        temperature: req.temperature ?? 0.2,
        max_tokens: req.max_tokens ?? 1024,
      })) as unknown as OpenAIChatCompletionLike;
      const latencyMs = Date.now() - startedAt;
      this.logger?.info(
        {
          model,
          latencyMs,
          promptTokens: completion.usage?.prompt_tokens ?? 0,
          completionTokens: completion.usage?.completion_tokens ?? 0,
          totalTokens: completion.usage?.total_tokens ?? 0,
          finishReason: completion.choices[0]?.finish_reason,
        },
        "ollama.chatCompletion",
      );
      return toChatResponse(completion);
    } catch (err) {
      const latencyMs = Date.now() - startedAt;
      const unknownErr: unknown = err;
      if (isOpenAIAPIError(unknownErr)) {
        const apiErr = unknownErr as { status?: number; message?: unknown; name?: string };
        const status = apiErr.status ?? 0;
        const message = typeof apiErr.message === "string" ? apiErr.message : "OpenAI SDK error.";
        const code = `OLLAMA_HTTP_${status}`;
        const isTimeout =
          (typeof apiErr.name === "string" && apiErr.name === "APIConnectionTimeoutError") ||
          status === 408;
        const wrapped = isTimeout
          ? new OllamaTimeoutError(message, { cause: unknownErr })
          : new OllamaClientError(message, { code, status, cause: unknownErr });
        this.logger?.warn({ model, latencyMs, status, message }, "ollama.chatCompletion.error");
        throw wrapped;
      }
      if (
        unknownErr &&
        typeof unknownErr === "object" &&
        "name" in unknownErr &&
        (unknownErr as { name?: unknown }).name === "AbortError"
      ) {
        this.logger?.warn({ model, latencyMs }, "ollama.chatCompletion.timeout");
        throw new OllamaTimeoutError("Ollama request timed out.", { cause: unknownErr });
      }
      const message = unknownErr instanceof Error ? unknownErr.message : String(unknownErr);
      this.logger?.error({ model, latencyMs, err: message }, "ollama.chatCompletion.unexpected");
      throw new OllamaClientError(`Unexpected Ollama error: ${message}`, { cause: unknownErr });
    }
  }
}
