import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@recovery/db";
import { customers } from "@recovery/db/schema";
import { auditService } from "@recovery/audit";
import type { AgentTool, AgentToolContext } from "../tool.js";
import type { ActionResult, IsoTimestamp } from "@recovery/types";
import { scheduleRetryInputSchema } from "@recovery/validation";

type Input = ReturnType<typeof scheduleRetryInputSchema.parse>;

export const scheduleRetryTool: AgentTool<
  "schedule_retry",
  Input,
  ActionResult
> = {
  name: "schedule_retry",
  description: "Schedule a deferred payment retry for a future timestamp.",
  inputSchema: scheduleRetryInputSchema,
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
      action: "action_executed",
      summary: `[stub] retry scheduled for ${input.scheduledFor}`,
      detail: {
        runId: ctx.data?.runId ?? null,
        scheduledFor: input.scheduledFor,
        paymentId: input.paymentId ?? null,
      },
      actor: `${ctx.actor}:schedule_retry`,
    });

    return {
      externalReference: `mock-sched-${randomUUID()}`,
      status: "succeeded",
      message: `[stub] retry scheduled for ${input.scheduledFor}`,
      observedAt: new Date().toISOString() as IsoTimestamp,
    };
  },
};
