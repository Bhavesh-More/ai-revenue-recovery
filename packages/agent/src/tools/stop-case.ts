import type { AgentTool, AgentToolContext } from "../tool.js";
import type { ActionResult, IsoTimestamp } from "@recovery/types";
import { stopCaseInputSchema } from "@recovery/validation";
import { caseLifecycle } from "@recovery/case-lifecycle";

type Input = ReturnType<typeof stopCaseInputSchema.parse>;

export const stopCaseTool: AgentTool<"stop_case", Input, ActionResult> = {
  name: "stop_case",
  description: "Stop further recovery work on a case.",
  inputSchema: stopCaseInputSchema,
  async invoke(input: Input, ctx: AgentToolContext): Promise<ActionResult> {
    await caseLifecycle.transition({
      caseId: input.caseId,
      toState: "stopped",
      reason: input.reason,
      actor: ctx.actor,
    });

    return {
      status: "succeeded",
      message: `[stub] case stopped: ${input.reason}`,
      observedAt: new Date().toISOString() as IsoTimestamp,
    };
  },
};
