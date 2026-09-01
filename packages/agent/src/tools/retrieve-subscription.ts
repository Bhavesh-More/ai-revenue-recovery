import { auditService } from "@recovery/audit";
import type { AgentTool, AgentToolContext } from "../tool.js";
import { retrieveSubscriptionInputSchema } from "@recovery/validation";

export const retrieveSubscriptionTool: AgentTool<
  "retrieve_subscription",
  ReturnType<typeof retrieveSubscriptionInputSchema.parse>,
  unknown
> = {
  name: "retrieve_subscription",
  description: "Fetch subscription details for a case (stub).",
  inputSchema: retrieveSubscriptionInputSchema,
  async invoke(input, ctx: AgentToolContext) {
    await auditService.record({
      caseId: input.caseId,
      action: "context_retrieved",
      summary: `Subscription ${input.subscriptionId} fetched (stub)`,
      actor: `${ctx.actor}:retrieve_subscription`,
    });
    return { subscriptionId: input.subscriptionId };
  },
};
