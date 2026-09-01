import { randomUUID } from "node:crypto";
import { auditService } from "@recovery/audit";
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
    ctx: AgentToolContext,
  ): Promise<ActionResult> {
    await auditService.record({
      caseId: input.caseId,
      action: "action_executed",
      summary: `[stub] promise of ${input.promisedMinor} ${input.currency} recorded for ${input.dueAt}`,
      detail: {
        runId: ctx.data?.runId ?? null,
        promisedMinor: input.promisedMinor,
        currency: input.currency,
        dueAt: input.dueAt,
        promiseType: input.promiseType,
      },
      actor: `${ctx.actor}:record_promise`,
    });

    return {
      externalReference: `mock-promise-${randomUUID()}`,
      status: "succeeded",
      message: `[stub] promise of ${input.promisedMinor} ${input.currency} recorded for ${input.dueAt}`,
      observedAt: new Date().toISOString() as IsoTimestamp,
    };
  },
};
