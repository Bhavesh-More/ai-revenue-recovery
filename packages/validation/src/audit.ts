import { z } from "zod";

export const auditActionSchema = z.enum([
  "event_detected",
  "context_retrieved",
  "decision_created",
  "decision_failed",
  "policy_checked",
  "action_executed",
  "action_failed",
  "communication_sent",
  "outcome_received",
  "escalation",
  "recovery",
  "stop",
]);

export type AuditActionSchema = z.infer<typeof auditActionSchema>;

const csvAction = z
  .string()
  .transform((v) => v.split(",").map((s) => s.trim()).filter(Boolean))
  .pipe(auditActionSchema.array());

export const listAuditEventsQuerySchema = z
  .object({
    caseId: z.uuid().optional(),
    action: z
      .union([auditActionSchema, csvAction])
      .optional(),
    actor: z.string().min(1).optional(),
    from: z.iso.datetime({ offset: true }).optional(),
    to: z.iso.datetime({ offset: true }).optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(200).optional(),
    offset: z.coerce.number().int().nonnegative().optional(),
  })
  .transform((q) => {
    const limit = q.limit ?? 50;
    const page = q.page ?? 1;
    const offset = q.offset ?? (page - 1) * limit;
    const actions = q.action
      ? Array.isArray(q.action)
        ? q.action
        : [q.action]
      : undefined;
    return {
      caseId: q.caseId,
      actions,
      actor: q.actor,
      from: q.from ? new Date(q.from) : undefined,
      to: q.to ? new Date(q.to) : undefined,
      limit,
      offset,
      page,
    };
  });

export const listCaseAuditEventsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(200).optional(),
    offset: z.coerce.number().int().nonnegative().optional(),
  })
  .transform((q) => {
    const limit = q.limit ?? 50;
    const page = q.page ?? 1;
    const offset = q.offset ?? (page - 1) * limit;
    return { limit, offset, page };
  });
