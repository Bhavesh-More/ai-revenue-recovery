import type { AgentTool, AgentToolContext } from "../tool.js";
import type { ActionResult, IsoTimestamp } from "@recovery/types";
import { escalateToHumanInputSchema } from "@recovery/validation";
import { caseLifecycle } from "@recovery/case-lifecycle";

type Input = ReturnType<typeof escalateToHumanInputSchema.parse>;

export const escalateToHumanTool: AgentTool<
  "escalate_to_human",
  Input,
  ActionResult
> = {
  name: "escalate_to_human",
  description: "Escalate a case to a human operator.",
  inputSchema: escalateToHumanInputSchema,
  async invoke(input: Input, ctx: AgentToolContext): Promise<ActionResult> {
    await caseLifecycle.transition({
      caseId: input.caseId,
      toState: "escalated",
      reason: input.reason,
      actor: ctx.actor,
    });

    return {
      status: "succeeded",
      message: `[stub] escalated to ${input.escalationTier}`,
      observedAt: new Date().toISOString() as IsoTimestamp,
    };
  },
};
