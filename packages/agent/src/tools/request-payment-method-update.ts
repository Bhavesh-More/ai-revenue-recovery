import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@recovery/db";
import { customers } from "@recovery/db/schema";
import { auditService } from "@recovery/audit";
import type { AgentTool, AgentToolContext } from "../tool.js";
import type { ActionResult, IsoTimestamp } from "@recovery/types";
import { requestPaymentMethodUpdateInputSchema } from "@recovery/validation";

type Input = ReturnType<typeof requestPaymentMethodUpdateInputSchema.parse>;

export const requestPaymentMethodUpdateTool: AgentTool<
  "request_payment_method_update",
  Input,
  ActionResult
> = {
  name: "request_payment_method_update",
  description: "Ask the customer to update their saved payment method.",
  inputSchema: requestPaymentMethodUpdateInputSchema,
  async invoke(input: Input, ctx: AgentToolContext): Promise<ActionResult> {
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
      summary: `[stub] payment-method update link queued via ${input.channel}`,
      detail: {
        runId: ctx.data?.runId ?? null,
        channel: input.channel,
      },
      actor: `${ctx.actor}:request_payment_method_update`,
    });

    return {
      externalReference: `mock-pmupd-${randomUUID()}`,
      status: "succeeded",
      message: "[stub] update link sent",
      observedAt: new Date().toISOString() as IsoTimestamp,
    };
  },
};
