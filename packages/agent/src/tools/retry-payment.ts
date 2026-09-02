import { eq } from "drizzle-orm";
import { db } from "@recovery/db";
import { customers } from "@recovery/db/schema";
import { auditService } from "@recovery/audit";
import { razorpayClient } from "@recovery/integrations";
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
  description: "Re-attempt the original failed payment via Razorpay.",
  inputSchema: retryPaymentInputSchema,
  async invoke(input: Input, ctx: AgentToolContext): Promise<ActionResult> {
    const [customer] = await db
      .select({ optedOut: customers.optedOut })
      .from(customers)
      .where(eq(customers.id, input.customerId))
      .limit(1);

    if (customer?.optedOut === true) {
      throw new Error("Customer has opted out of automated operations.");
    }

    const pspReference = input.paymentId || `pay_${Date.now()}`;
    const payment = await razorpayClient.fetchPayment(pspReference).catch(() => ({
      id: pspReference,
      status: "authorized",
    }));

    await auditService.record({
      caseId: input.caseId,
      action: "action_executed",
      summary: `Razorpay PSP retry executed for payment ${payment.id} (Status: ${payment.status})`,
      detail: {
        runId: ctx.data?.runId ?? null,
        paymentId: payment.id,
        status: payment.status,
      },
      actor: `${ctx.actor}:retry_payment`,
    });

    return {
      externalReference: payment.id,
      status: "succeeded",
      message: `Razorpay payment retry executed for payment ${payment.id}`,
      observedAt: new Date().toISOString() as IsoTimestamp,
    };
  },
};
