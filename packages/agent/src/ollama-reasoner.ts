import type { Logger } from "pino";
import {
  OllamaClient,
  OllamaClientError,
  isTransientOllamaError,
  withRetry,
} from "@recovery/llm";
import { agentReasonerOutputSchema } from "@recovery/validation";
import { AgentError, AgentTimeoutError } from "./errors.js";
import { buildReasonerPrompt } from "./prompts/recover.js";
import type { Reasoner, ReasonerInput, ReasonerOutput } from "./reasoner.js";

export interface OllamaReasonerOptions {
  model: string;
  temperature?: number;
  maxTokens?: number;
  attempts?: number;
  baseMs?: number;
}

export class OllamaReasoner implements Reasoner {
  private readonly model: string;
  private readonly temperature: number;
  private readonly maxTokens: number;
  private readonly attempts: number;
  private readonly baseMs: number;

  constructor(
    private readonly client: OllamaClient,
    opts: OllamaReasonerOptions,
    private readonly logger?: Logger,
  ) {
    if (!opts.model) throw new AgentError("AGENT_ERROR", "OllamaReasoner requires a model.", "reason");
    this.model = opts.model;
    this.temperature = opts.temperature ?? 0.2;
    this.maxTokens = opts.maxTokens ?? 1024;
    this.attempts = opts.attempts ?? 3;
    this.baseMs = opts.baseMs ?? 250;
  }

  async reason(input: ReasonerInput): Promise<ReasonerOutput> {
    const { system, user } = buildReasonerPrompt(input);
    let response;
    try {
      response = await withRetry(
        () =>
          this.client.chatCompletion({
            model: this.model,
            messages: [
              { role: "system", content: system },
              { role: "user", content: user },
            ],
            response_format: { type: "json_object" },
            temperature: this.temperature,
            max_tokens: this.maxTokens,
          }),
        {
          attempts: this.attempts,
          baseMs: this.baseMs,
          jitter: true,
          shouldRetry: isTransientOllamaError,
        },
      );
    } catch (err) {
      if (err instanceof OllamaClientError && err.code === "OLLAMA_TIMEOUT") {
        throw new AgentTimeoutError("reason", this.attempts * this.baseMs);
      }
      const msg = err instanceof Error ? err.message : String(err);
      throw new AgentError("AGENT_ERROR", `Ollama request failed: ${msg}`, "reason");
    }

    const choice = response.choices[0];
    const content = choice?.message?.content ?? "";
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(content);
    } catch (err) {
      this.logger?.warn(
        { caseId: input.caseId, snippet: content.slice(0, 200) },
        "ollamaReasoner.invalidJson",
      );
      throw new AgentError(
        "AGENT_ERROR",
        `LLM output was not valid JSON: ${(err as Error).message}`,
        "reason",
      );
    }

    const parsed = agentReasonerOutputSchema.safeParse(parsedJson);
    if (!parsed.success) {
      this.logger?.warn(
        { caseId: input.caseId, issues: parsed.error.issues.slice(0, 5) },
        "ollamaReasoner.schemaMismatch",
      );
      throw new AgentError(
        "AGENT_ERROR",
        `LLM output failed validation: ${parsed.error.issues
          .slice(0, 3)
          .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
          .join("; ")}`,
        "reason",
      );
    }

    return parsed.data as ReasonerOutput;
  }
}
