import type { Job } from "bullmq";
import {
  testJobName,
  testJobPayloadSchema,
  testJobResultSchema,
  type TestJobResult,
} from "../jobs/test-job.js";

export async function processTestJob(job: Job): Promise<TestJobResult> {
  const parsed = testJobPayloadSchema.safeParse(job.data);
  if (!parsed.success) {
    throw new Error(
      `Invalid test-job payload: ${parsed.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ")}`,
    );
  }

  const { message, correlationId } = parsed.data;
  const result = testJobResultSchema.parse({
    received: message,
    echoedAt: new Date().toISOString(),
    correlationId,
  });

  console.log(
    JSON.stringify({
      level: "info",
      msg: "test-job processed",
      jobId: job.id,
      ...result,
    }),
  );

  return result;
}

export { testJobName };
