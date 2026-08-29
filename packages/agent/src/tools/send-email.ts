import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@recovery/db";
import { customers } from "@recovery/db/schema";
import { auditService } from "@recovery/audit";
import type { AgentTool, AgentToolContext } from "../tool.js";
import type { ActionResult, IsoTimestamp } from "@recovery/types";
import { sendEmailInputSchema } from "@recovery/validation";

type Input = ReturnType<typeof sendEmailInputSchema.parse>;

export const sendEmailTool: AgentTool<"send_email", Input, ActionResult> = {
  name: "send_email",
  description: "Send a templated recovery email to a customer.",
  inputSchema: sendEmailInputSchema,
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
      summary: `[stub] email queued for customer ${input.customerId}`,
      detail: {
        runId: ctx.data?.runId ?? null,
        channel: "email",
        template: input.template,
        bodyLength: input.body?.length ?? 0,
      },
      actor: `${ctx.actor}:send_email`,
    });

    return {
      externalReference: `mock-email-${randomUUID()}`,
      status: "succeeded",
      message: "[stub] delivered",
      observedAt: new Date().toISOString() as IsoTimestamp,
    };
  },
};
