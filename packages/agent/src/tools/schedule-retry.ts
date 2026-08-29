import { randomUUID } from "node:crypto";
import type { AgentTool, AgentToolContext } from "../tool.js";
import type { ActionResult, IsoTimestamp } from "@recovery/types";
import { scheduleRetryInputSchema } from "@recovery/validation";

type Input = ReturnType<typeof scheduleRetryInputSchema.parse>;

export const scheduleRetryTool: AgentTool<
  "schedule_retry",
  Input,
  ActionResult
> = {
  name: "schedule_retry",
  description: "Schedule a deferred payment retry for a future timestamp.",
  inputSchema: scheduleRetryInputSchema,
  async invoke(
    input: Input,
    _ctx: AgentToolContext,
  ): Promise<ActionResult> {
    return {
      externalReference: `mock-sched-${randomUUID()}`,
      status: "succeeded",
      message: `[stub] retry scheduled for ${input.scheduledFor}`,
      observedAt: new Date().toISOString() as IsoTimestamp,
    };
  },
};
