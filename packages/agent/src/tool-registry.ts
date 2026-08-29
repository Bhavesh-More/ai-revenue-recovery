import type { AgentTool, AgentToolContext, AnyAgentTool } from "./tool.js";
import { TRACING_CONFIG } from "./tracing.js";

const REGISTRY = new Map<string, AnyAgentTool>();

export function registerAgentTool<T extends AnyAgentTool>(tool: T): T {
  if (REGISTRY.has(tool.name)) {
    throw new Error(`Agent tool '${tool.name}' is already registered.`);
  }
  REGISTRY.set(tool.name, tool);
  return tool;
}

export function findAgentTool(actionType: string): AnyAgentTool | undefined {
  return REGISTRY.get(actionType);
}

export function listAgentToolNames(): string[] {
  return Array.from(REGISTRY.keys()).sort();
}

export interface DispatchInput {
  tool: AnyAgentTool;
  input: unknown;
  ctx: AgentToolContext;
  runId: string;
}

export type DispatchResult =
  | { ok: true; output: unknown; durationMs: number }
  | { ok: false; error: { name: string; message: string } };

type TraceableFn = <T extends (...args: any[]) => any>(fn: T, opts: any) => T;
let traceable: TraceableFn | undefined;
try {
  const mod = require("langsmith/traceable") as
    | { traceable: TraceableFn }
    | undefined;
  traceable = mod?.traceable;
} catch {
  traceable = undefined;
}

async function dispatchAgentToolImpl(
  input: DispatchInput,
): Promise<DispatchResult> {
  const started = Date.now();
  const parsed = input.tool.inputSchema.safeParse(input.input);
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        name: "InputValidationError",
        message: parsed.error.message,
      },
    };
  }
  try {
    const output = await input.tool.invoke(parsed.data, input.ctx);
    return { ok: true, output, durationMs: Date.now() - started };
  } catch (err) {
    const name = err instanceof Error ? err.name : "UnknownError";
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: { name, message } };
  }
}

const dispatchTraced =
  TRACING_CONFIG.enabled && traceable
    ? (traceable(dispatchAgentToolImpl, {
        name: "agent.dispatchTool",
        extractSessionId: (input: DispatchInput) => input.ctx.caseId,
        processInputs: (input: DispatchInput) => ({
          tool: input.tool.name,
          run_id: input.runId,
          case_id: input.ctx.caseId,
        }),
      }) as unknown as typeof dispatchAgentToolImpl)
    : dispatchAgentToolImpl;

export async function dispatchAgentTool(
  input: DispatchInput,
): Promise<DispatchResult> {
  return dispatchTraced(input);
}

export type { AgentTool, AgentToolContext };
