import { loadEnv } from "@recovery/config";
import { OllamaClient } from "@recovery/llm";
import { AgentError } from "./errors.js";
import { OllamaReasoner } from "./ollama-reasoner.js";
import type { Reasoner } from "./reasoner.js";
import { StubReasoner } from "./reasoner.js";

export interface LoadReasonerOptions {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  timeoutMs?: number;
  logger?: import("pino").Logger;
}

export function loadReasonerFromEnv(opts: LoadReasonerOptions = {}): Reasoner {
  let env;
  try {
    env = loadEnv();
  } catch (err) {
    throw new AgentError(
      "AGENT_ERROR",
      `Cannot construct reasoner: ${err instanceof Error ? err.message : String(err)}`,
      "reason",
    );
  }

  const apiKey = opts.apiKey ?? env.OLLAMA_API_KEY;
  const baseUrl = opts.baseUrl ?? env.OLLAMA_BASE_URL;
  const model = opts.model ?? env.OLLAMA_MODEL;
  const timeoutMs = opts.timeoutMs ?? env.OLLAMA_TIMEOUT_MS;

  if (!apiKey) {
    throw new AgentError(
      "AGENT_ERROR",
      "OLLAMA_API_KEY is required to construct the LLM reasoner.",
      "reason",
    );
  }

  const client = new OllamaClient(
    { apiKey, baseUrl, model, timeoutMs },
    opts.logger,
  );

  return new OllamaReasoner(client, { model });
}

export { StubReasoner };
