import { randomUUID } from "node:crypto";
import type { AgentTool, AgentToolContext } from "../tool.js";
import type { ActionResult, IsoTimestamp } from "@recovery/types";
import { retryPaymentInputSchema } from "@recovery/validation";

type Input = ReturnType<typeof retryPaymentInputSchema.parse>;

export const retryPaymentTool: AgentTool<
  "retry_payment",
  Input,
  ActionResult
> = {
  name: "retry_payment",
  description: "Re-attempt the original failed payment via the PSP.",
  inputSchema: retryPaymentInputSchema,
  async invoke(_input: Input, _ctx: AgentToolContext): Promise<ActionResult> {
    return {
      externalReference: `mock-rzp-${randomUUID()}`,
      status: "succeeded",
      message: "[stub] PSP retry queued",
      observedAt: new Date().toISOString() as IsoTimestamp,
    };
  },
};
