import { Router } from "express";
import {
  QUEUE_NAMES,
  getQueue,
  testJobName,
  testJobPayloadSchema,
} from "@recovery/queue";
import { ApiError } from "../lib/errors.js";
import { asyncHandler } from "../lib/async-handler.js";
import { accepted } from "../lib/responses.js";

export const queueTestRouter = Router();

queueTestRouter.post(
  "/queue/test-job",
  asyncHandler(async (req, res) => {
    const parsed = testJobPayloadSchema.safeParse(req.body);
    if (!parsed.success) {
      throw ApiError.badRequest(
        "VALIDATION_ERROR",
        "Invalid test-job payload.",
        {
          fieldErrors: parsed.error.issues.map((i) => ({
            path: i.path.join(".") || "(root)",
            message: i.message,
          })),
        },
      );
    }

    const queue = getQueue(QUEUE_NAMES.TEST);
    const job = await queue.add(testJobName, parsed.data, {
      jobId: parsed.data.correlationId ?? undefined,
    });

    accepted(res, {
      accepted: true,
      jobId: job.id,
      queue: QUEUE_NAMES.TEST,
      name: testJobName,
    });
  }),
);
