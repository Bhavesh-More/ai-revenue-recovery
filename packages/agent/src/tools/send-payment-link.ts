import { eq } from "drizzle-orm";
import { db } from "@recovery/db";
import { customers } from "@recovery/db/schema";
import { auditService } from "@recovery/audit";
import { razorpayClient } from "@recovery/integrations";
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
  description: "Generate an active payment link for the customer via Razorpay.",
  inputSchema: sendPaymentLinkInputSchema,
  async invoke(
    input: Input,
    ctx: AgentToolContext,
  ): Promise<ActionResult> {
    const [customer] = await db
      .select({
        optedOut: customers.optedOut,
        email: customers.email,
        phone: customers.phone,
        name: customers.name,
      })
      .from(customers)
      .where(eq(customers.id, input.customerId))
      .limit(1);

    if (customer?.optedOut === true) {
      throw new Error("Customer has opted out of automated communications.");
    }

    const paymentLink = await razorpayClient.createPaymentLink({
      amountMinor: input.amountMinor,
      currency: input.currency || "INR",
      description: `Razorpay Revenue Recovery for Case ${input.caseId}`,
      customer: {
        name: customer?.name || "Valued Customer",
        email: customer?.email || undefined,
        contact: customer?.phone || undefined,
      },
      referenceId: input.caseId,
      notes: {
        caseId: input.caseId,
      },
    });

    await auditService.record({
      caseId: input.caseId,
      action: "communication_sent",
      summary: `Generated Razorpay Payment Link ${paymentLink.id} (${paymentLink.short_url})`,
      detail: {
        runId: ctx.data?.runId ?? null,
        paymentLinkId: paymentLink.id,
        shortUrl: paymentLink.short_url,
        amountMinor: input.amountMinor,
        currency: input.currency,
        channel: input.channel ?? "email",
      },
      actor: `${ctx.actor}:send_payment_link`,
    });

    return {
      externalReference: paymentLink.id,
      status: "succeeded",
      message: `Razorpay Payment Link generated successfully: ${paymentLink.short_url}`,
      observedAt: new Date().toISOString() as IsoTimestamp,
    };
  },
};
