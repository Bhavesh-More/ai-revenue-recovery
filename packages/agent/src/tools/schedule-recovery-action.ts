import { db } from "@recovery/db";
import { recoveryActions, recoveryCases } from "@recovery/db/schema";
import { auditService } from "@recovery/audit";
import type { AgentTool, AgentToolContext } from "../tool.js";
import { scheduleRecoveryActionInputSchema } from "@recovery/validation";
import { eq } from "drizzle-orm";

export const scheduleRecoveryActionTool: AgentTool<
  "schedule_recovery_action",
  ReturnType<typeof scheduleRecoveryActionInputSchema.parse>,
  unknown
> = {
  name: "schedule_recovery_action",
  description: "Create a recovery action entry (scheduled or immediate).",
  inputSchema: scheduleRecoveryActionInputSchema,
  async invoke(input, ctx: AgentToolContext) {
    // Verify case exists
    const [c] = await db
      .select()
      .from(recoveryCases)
      .where(eq(recoveryCases.id, input.caseId))
      .limit(1);
    if (!c) throw new Error("case not found");
    const [action] = await db
      .insert(recoveryActions)
      .values({
        caseId: input.caseId,
        customerId: c.customerId,
        type: input.actionType as any,
        scheduledFor: input.scheduledFor
          ? new Date(input.scheduledFor)
          : undefined,
        payload: input.payload ?? {},
      })
      .returning();
    await auditService.record({
      caseId: input.caseId,
      action: "action_executed",
      summary: `Action ${input.actionType} scheduled`,
      actor: `${ctx.actor}:schedule_recovery_action`,
    });
    return action;
  },
};
