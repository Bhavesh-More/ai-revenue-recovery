import { auditService } from "@recovery/audit";
import type { AgentTool, AgentToolContext } from "../tool.js";
import { retrievePaymentInputSchema } from "@recovery/validation";

export const retrievePaymentTool: AgentTool<
  "retrieve_payment",
  ReturnType<typeof retrievePaymentInputSchema.parse>,
  unknown
> = {
  name: "retrieve_payment",
  description: "Fetch payment details for a case (stub).",
  inputSchema: retrievePaymentInputSchema,
  async invoke(input, ctx: AgentToolContext) {
    // Stub implementation – in a real system would query payments table.
    await auditService.record({
      caseId: input.caseId,
      action: "context_retrieved",
      summary: `Payment ${input.paymentId} fetched (stub)`,
      actor: `${ctx.actor}:retrieve_payment`,
    });
    return { paymentId: input.paymentId };
  },
};
