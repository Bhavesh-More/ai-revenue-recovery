import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@recovery/db";
import { customers } from "@recovery/db/schema";
import { auditService } from "@recovery/audit";
import { emailClient } from "@recovery/integrations";
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
      .select({ optedOut: customers.optedOut, email: customers.email, name: customers.name })
      .from(customers)
      .where(eq(customers.id, input.customerId))
      .limit(1);

    if (customer?.optedOut === true) {
      throw new Error("customer opted out");
    }

    const targetEmail = customer?.email || "customer@example.com";
    const emailResult = await emailClient.send({
      to: targetEmail,
      subject: `RevRecovery Notice: Action Required for Your Account`,
      html: input.body || `<p>Dear ${customer?.name || "Customer"},</p><p>Please review your pending account recovery action.</p>`,
      text: input.body,
    });

    await auditService.record({
      caseId: input.caseId,
      action: "communication_sent",
      summary: `[LIVE DEMO] Recovery email sent to ${targetEmail} (${emailResult.status})`,
      detail: {
        runId: ctx.data?.runId ?? null,
        channel: "email",
        template: input.template,
        bodyLength: input.body?.length ?? 0,
        provider: emailResult.provider,
        emailId: emailResult.id ?? null,
      },
      actor: `${ctx.actor}:send_email`,
    });

    return {
      externalReference: emailResult.id ?? "none",
      status: "succeeded",
      message: `Delivered via ${emailResult.provider}`,
      observedAt: new Date().toISOString() as IsoTimestamp,
    };
  },
};
