import { randomUUID } from "node:crypto";
import type { AgentTool, AgentToolContext } from "../tool.js";
import type { ActionResult, IsoTimestamp } from "@recovery/types";
import { sendPaymentLinkInputSchema } from "@recovery/validation";

type Input = ReturnType<typeof sendPaymentLinkInputSchema.parse>;

export const sendPaymentLinkTool: AgentTool<
  "send_payment_link",
  Input,
  ActionResult
> = {
  name: "send_payment_link",
  description: "Generate a payment link for the customer via Razorpay.",
  inputSchema: sendPaymentLinkInputSchema,
  async invoke(
    input: Input,
    _ctx: AgentToolContext,
  ): Promise<ActionResult> {
    return {
      externalReference: `mock-plink-${randomUUID()}`,
      status: "succeeded",
      message: `[stub] payment link ${input.amountMinor} ${input.currency} generated`,
      observedAt: new Date().toISOString() as IsoTimestamp,
    };
  },
};
