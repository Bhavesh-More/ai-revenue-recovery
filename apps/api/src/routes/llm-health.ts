import { Router } from "express";
import { loadEnv } from "@recovery/config";
import { OllamaClient, OllamaTimeoutError, isOllamaError } from "@recovery/llm";
import { getLogger } from "../lib/logger.js";
import { ApiError } from "../lib/errors.js";
import { asyncHandler } from "../lib/async-handler.js";
import { ok } from "../lib/responses.js";

export const llmHealthRouter = Router();

llmHealthRouter.get(
  "/health/llm",
  asyncHandler(async (_req, res) => {
    const env = loadEnv();
    const log = getLogger();
    const client = new OllamaClient(
      {
        apiKeys: env.OLLAMA_API_KEYS,
        baseUrl: env.OLLAMA_BASE_URL,
        model: env.OLLAMA_MODEL,
        timeoutMs: env.OLLAMA_TIMEOUT_MS,
      },
      log,
    );

    const startedAt = Date.now();
    try {
      const response = await client.chatCompletion({
        model: env.OLLAMA_MODEL,
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 4,
        temperature: 0,
      });
      const latencyMs = Date.now() - startedAt;
      const snippet =
        response.choices[0]?.message?.content?.slice(0, 80) ?? "";
      ok(res, {
        ok: true,
        model: response.model,
        latencyMs,
        promptTokens: response.usage.promptTokens,
        completionTokens: response.usage.completionTokens,
        totalTokens: response.usage.totalTokens,
        responseSnippet: snippet,
        keyPool: client.getKeyStats(),
      });

    } catch (err) {
      const latencyMs = Date.now() - startedAt;
      if (err instanceof OllamaTimeoutError || isOllamaError(err)) {
        throw ApiError.gateway(
          err instanceof OllamaTimeoutError ? "AGENT_TIMEOUT" : "AGENT_ERROR",
          err.message,
          {
            latencyMs,
            code: err.code,
            ...(err.status !== undefined ? { status: err.status } : {}),
          },
        );
      }
      throw ApiError.gateway("AGENT_ERROR", "Unexpected LLM health error.", {
        latencyMs,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }),
);
