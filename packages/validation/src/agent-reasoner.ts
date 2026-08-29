import { z } from "zod";

export const agentActionTypeSchema = z.enum([
  "retry_payment",
  "send_payment_link",
  "send_email",
  "send_sms",
  "send_whatsapp",
  "start_voice_call",
  "request_payment_method_update",
  "record_promise",
  "escalate_to_human",
  "stop_case",
  "schedule_retry",
]);

export const agentParametersSchema = z
  .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
  .optional();

export const agentRecommendationSchema = z.object({
  actionType: agentActionTypeSchema,
  parameters: agentParametersSchema,
  expectedOutcomeMinor: z.number().int().nonnegative().optional(),
  confidence: z.number().min(0).max(1),
  rationale: z.string().min(1).max(2000),
});

export const agentReasonerOutputSchema = z.object({
  observations: z.array(z.string().min(1)).max(50),
  rootCause: z.string().min(1).max(2000),
  recommendation: agentRecommendationSchema,
});

export type AgentRecommendationZ = z.infer<typeof agentRecommendationSchema>;
export type AgentReasonerOutputZ = z.infer<typeof agentReasonerOutputSchema>;
