// Lives in the shared package so the api (producer) and the worker
// (consumer) validate the same payload shape with the same zod schema.
import { z } from "zod";

export const testJobName = "test.ping" as const;

export const testJobPayloadSchema = z.object({
  message: z.string().min(1).max(500),
  correlationId: z.string().optional(),
});

export type TestJobPayload = z.infer<typeof testJobPayloadSchema>;

export const testJobResultSchema = z.object({
  received: z.string(),
  echoedAt: z.string(),
  correlationId: z.string().optional(),
});

export type TestJobResult = z.infer<typeof testJobResultSchema>;
