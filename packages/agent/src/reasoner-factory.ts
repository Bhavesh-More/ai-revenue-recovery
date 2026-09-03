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

  const apiKeys = opts.apiKey ? [opts.apiKey] : env.OLLAMA_API_KEYS;
  const baseUrl = opts.baseUrl ?? env.OLLAMA_BASE_URL;
  const model = opts.model ?? env.OLLAMA_MODEL;
  const timeoutMs = opts.timeoutMs ?? env.OLLAMA_TIMEOUT_MS;

  if (!apiKeys || apiKeys.length === 0) {
    throw new AgentError(
      "AGENT_ERROR",
      "At least one Ollama API key (OLLAMA_API_KEY_1, OLLAMA_API_KEY_2...) is required to construct the LLM reasoner.",
      "reason",
    );
  }


  const client = new OllamaClient(
    { apiKeys, baseUrl, model, timeoutMs },
    opts.logger,
  );

  return new OllamaReasoner(client, { model });
}


export { StubReasoner };
