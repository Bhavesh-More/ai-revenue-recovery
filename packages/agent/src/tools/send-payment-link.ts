import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@recovery/db";
import { customers } from "@recovery/db/schema";
import { auditService } from "@recovery/audit";
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
    ctx: AgentToolContext,
  ): Promise<ActionResult> {
    const [customer] = await db
      .select({ optedOut: customers.optedOut })
      .from(customers)
      .where(eq(customers.id, input.customerId))
      .limit(1);

    if (customer?.optedOut === true) {
      throw new Error("customer opted out");
    }

    await auditService.record({
      caseId: input.caseId,
      action: "communication_sent",
      summary: `[stub] payment link ${input.amountMinor} ${input.currency} generated`,
      detail: {
        runId: ctx.data?.runId ?? null,
        amountMinor: input.amountMinor,
        currency: input.currency,
        channel: input.channel ?? "email",
      },
      actor: `${ctx.actor}:send_payment_link`,
    });

    return {
      externalReference: `mock-plink-${randomUUID()}`,
      status: "succeeded",
      message: `[stub] payment link ${input.amountMinor} ${input.currency} generated`,
      observedAt: new Date().toISOString() as IsoTimestamp,
    };
  },
};
