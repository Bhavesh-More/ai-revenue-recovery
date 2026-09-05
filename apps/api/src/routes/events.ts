import { Router } from "express";
import { eventIngestion, ingestEventInputSchema } from "@recovery/event-ingestion";
import { ApiError } from "../lib/errors.js";
import { asyncHandler } from "../lib/async-handler.js";
import { accepted, ok } from "../lib/responses.js";

export const eventsRouter = Router();

eventsRouter.post(
  "/events",
  asyncHandler(async (req, res) => {
    const parsed = ingestEventInputSchema.safeParse(req.body);
    if (!parsed.success) {
      throw ApiError.badRequest(
        "VALIDATION_ERROR",
        "Invalid event payload.",
        {
          fieldErrors: parsed.error.issues.map((i) => ({
            path: i.path.join(".") || "(root)",
            message: i.message,
          })),
        },
      );
    }

    const result = await eventIngestion.ingest(parsed.data);
    ok(res, {
      eventId: result.event.id,
      caseId: result.case.id,
      direction: result.case.direction,
      currentState: result.case.currentState,
      accepted: true,
      created: result.created,
    });
  }),
);

eventsRouter.get(
  "/events",
  asyncHandler(async (_req, res) => {
    accepted(res, { accepted: true });
  }),
);
