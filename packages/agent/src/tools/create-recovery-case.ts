import { db } from "@recovery/db";
import { recoveryCases, customers } from "@recovery/db/schema";
import { auditService } from "@recovery/audit";
import type { AgentTool, AgentToolContext } from "../tool.js";
import { createRecoveryCaseInputSchema } from "@recovery/validation";
import { eq } from "drizzle-orm";

export const createRecoveryCaseTool: AgentTool<
  "create_recovery_case",
  ReturnType<typeof createRecoveryCaseInputSchema.parse>,
  unknown
> = {
  name: "create_recovery_case",
  description: "Create a new recovery case for a customer.",
  inputSchema: createRecoveryCaseInputSchema,
  async invoke(input, ctx: AgentToolContext) {
    // Verify customer exists
    const [cust] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, input.customerId))
      .limit(1);
    if (!cust) throw new Error("customer not found");
    // Insert case – eventId placeholder as originating event will be linked later.
    const [newCase] = await db
      .insert(recoveryCases)
      .values({
        customerId: input.customerId,
        originatingEventId: "00000000-0000-0000-0000-000000000000" as any,
        direction: input.direction as any,
        amountAtRiskMinor: input.amountAtRiskMinor,
        currency: input.currency,
      })
      .returning();
    await auditService.record({
      caseId: newCase.id,
      action: "event_detected",
      summary: `Case ${newCase.id} created for customer ${input.customerId}`,
      actor: `${ctx.actor}:create_recovery_case`,
    });
    return newCase;
  },
};
