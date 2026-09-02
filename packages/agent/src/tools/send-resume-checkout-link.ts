import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@recovery/db";
import { customers } from "@recovery/db/schema";
import { auditService } from "@recovery/audit";
import type { ActionResult, IsoTimestamp } from "@recovery/types";
import { sendResumeCheckoutLinkInputSchema } from "@recovery/validation";
import type { AgentTool, AgentToolContext } from "../tool.js";

type Input = ReturnType<typeof sendResumeCheckoutLinkInputSchema.parse>;

export const sendResumeCheckoutLinkTool: AgentTool<
  "send_resume_checkout_link",
  Input,
  ActionResult
> = {
  name: "send_resume_checkout_link",
  description:
    "Generate and send a resume-checkout link so the customer can continue where they left off.",
  inputSchema: sendResumeCheckoutLinkInputSchema,
  async invoke(
    input: Input,
    ctx: AgentToolContext,
  ): Promise<ActionResult> {
    const [cust] = await db
      .select({ optedOut: customers.optedOut })
      .from(customers)
      .where(eq(customers.id, input.customerId))
      .limit(1);

    if (cust?.optedOut) {
      return {
        status: "failed",
        message: "customer opted out of recovery communications",
        observedAt: new Date().toISOString() as IsoTimestamp,
      };
    }

    const channel = input.channel ?? "email";
    const lastSeenPage = input.lastSeenPage ?? "checkout";
    const externalRef = `mock-resume-${randomUUID()}`;

    await auditService.record({
      caseId: ctx.caseId,
      action: "communication_sent",
      summary: `Resume-checkout link sent via ${channel} for drop-off at ${lastSeenPage}.`,
      detail: {
        ...(ctx.data as Record<string, string | number | boolean | null>),
        channel,
        lastSeenPage,
        externalReference: externalRef,
      },
      actor: ctx.actor,
    });

    return {
      status: "succeeded",
      externalReference: externalRef,
      message: `resume-checkout link generated and sent via ${channel} (lastSeenPage: ${lastSeenPage})`,
      observedAt: new Date().toISOString() as IsoTimestamp,
    };
  },
};
