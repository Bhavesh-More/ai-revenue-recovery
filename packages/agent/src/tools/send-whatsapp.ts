import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@recovery/db";
import { customers } from "@recovery/db/schema";
import { auditService } from "@recovery/audit";
import type { AgentTool, AgentToolContext } from "../tool.js";
import type { ActionResult, IsoTimestamp } from "@recovery/types";
import { sendWhatsappInputSchema } from "@recovery/validation";

type Input = ReturnType<typeof sendWhatsappInputSchema.parse>;

export const sendWhatsappTool: AgentTool<
  "send_whatsapp",
  Input,
  ActionResult
> = {
  name: "send_whatsapp",
  description: "Send a templated recovery WhatsApp message to a customer.",
  inputSchema: sendWhatsappInputSchema,
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
      summary: `[stub] whatsapp queued for customer ${input.customerId}`,
      detail: {
        runId: ctx.data?.runId ?? null,
        channel: "whatsapp",
        template: input.template,
        bodyLength: input.body?.length ?? 0,
      },
      actor: `${ctx.actor}:send_whatsapp`,
    });

    return {
      externalReference: `mock-wa-${randomUUID()}`,
      status: "succeeded",
      message: "[stub] delivered",
      observedAt: new Date().toISOString() as IsoTimestamp,
    };
  },
};
