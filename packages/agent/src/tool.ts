import type { z } from "zod";
export interface AgentToolContext {
  caseId: string;
  actor: string;
  //context the runner pre-loaded (customer id, payment id, etc.).
  data?: Record<string, string | number | boolean | null>;
}

export interface AgentTool<
  TName extends string = string,
  TInput = unknown,
  TOutput = unknown,
> {
  readonly name: TName;
  readonly description: string;
  readonly inputSchema: z.ZodType<TInput>;
  invoke(input: TInput, ctx: AgentToolContext): Promise<TOutput>;
}

export type AnyAgentTool = AgentTool<string, unknown, unknown>;

export const AGENT_TOOL_REGISTRY: AnyAgentTool[] = [];
