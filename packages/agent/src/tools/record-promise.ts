import { randomUUID } from "node:crypto";
import type { AgentTool, AgentToolContext } from "../tool.js";
import type { ActionResult, IsoTimestamp } from "@recovery/types";
import { recordPromiseInputSchema } from "@recovery/validation";

type Input = ReturnType<typeof recordPromiseInputSchema.parse>;

export const recordPromiseTool: AgentTool<
  "record_promise",
  Input,
  ActionResult
> = {
  name: "record_promise",
  description: "Record a customer promise to pay (stub).",
  inputSchema: recordPromiseInputSchema,
  async invoke(
    input: Input,
    _ctx: AgentToolContext,
  ): Promise<ActionResult> {
    return {
      externalReference: `mock-promise-${randomUUID()}`,
      status: "succeeded",
      message: `[stub] promise of ${input.promisedMinor} ${input.currency} recorded for ${input.dueAt}`,
      observedAt: new Date().toISOString() as IsoTimestamp,
    };
  },
};
