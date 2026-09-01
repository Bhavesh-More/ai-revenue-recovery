import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@recovery/db";
import { customers } from "@recovery/db/schema";
import { auditService } from "@recovery/audit";
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
      action: "action_executed",
      summary: `[stub] PSP retry queued for customer ${input.customerId}`,
      detail: {
        runId: ctx.data?.runId ?? null,
        paymentId: input.paymentId ?? null,
      },
      actor: `${ctx.actor}:retry_payment`,
    });

    return {
      externalReference: `mock-rzp-${randomUUID()}`,
      status: "succeeded",
      message: "[stub] PSP retry queued",
      observedAt: new Date().toISOString() as IsoTimestamp,
    };
  },
};
