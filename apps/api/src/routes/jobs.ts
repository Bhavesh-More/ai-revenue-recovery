import { Router } from "express";
import { agentJobTracker } from "@recovery/agent";
import { ApiError } from "../lib/errors.js";
import { ok } from "../lib/responses.js";
import { asyncHandler } from "../lib/async-handler.js";

export const jobsRouter = Router();

jobsRouter.get(
  "/jobs/:jobId",
  asyncHandler(async (req, res) => {
    const jobId = String(req.params.jobId);
    const job = agentJobTracker.getJob(jobId);

    if (!job) {
      throw ApiError.notFound("JOB_NOT_FOUND", `Agent job ${jobId} not found.`);
    }

    ok(res, job);
  }),
);

jobsRouter.get(
  "/jobs/:jobId/events",
  asyncHandler(async (req, res) => {
    const jobId = String(req.params.jobId);
    const events = agentJobTracker.getJobEvents(jobId);
    ok(res, events);
  }),
);
