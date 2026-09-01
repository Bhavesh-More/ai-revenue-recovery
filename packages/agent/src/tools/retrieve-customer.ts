import { eq } from "drizzle-orm";
import { db } from "@recovery/db";
import { customers, type CustomerRow } from "@recovery/db/schema";
import { auditService } from "@recovery/audit";
import type { AgentTool, AgentToolContext } from "../tool.js";
import { retrieveCustomerInputSchema } from "@recovery/validation";

export const retrieveCustomerTool: AgentTool<
  "retrieve_customer",
  ReturnType<typeof retrieveCustomerInputSchema.parse>,
  CustomerRow
> = {
  name: "retrieve_customer",
  description: "Fetch full customer record for a case.",
  inputSchema: retrieveCustomerInputSchema,
  async invoke(input, ctx: AgentToolContext) {
    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, input.customerId))
      .limit(1);
    if (!customer) {
      throw new Error("customer not found");
    }
    await auditService.record({
      caseId: input.caseId,
      action: "context_retrieved",
      summary: `Customer ${input.customerId} fetched`,
      actor: `${ctx.actor}:retrieve_customer`,
    });
    return customer;
  },
};
