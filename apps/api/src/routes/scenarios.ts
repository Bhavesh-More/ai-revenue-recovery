import { Router } from "express";
import { z } from "zod";
import { db } from "@recovery/db";
import { DemoScenarioGenerator, DEMO_SCENARIOS } from "@recovery/case-lifecycle";
import { asyncHandler } from "../lib/async-handler.js";
import { ok, created } from "../lib/responses.js";
import { ApiError } from "../lib/errors.js";
import { eventBroadcaster } from "../lib/broadcaster.js";

export const scenariosRouter = Router();
const generator = new DemoScenarioGenerator(db);

const seedSchema = z.object({
  scenarioKey: z.string().optional().default("all"),
});

/**
 * GET /api/v1/scenarios
 * List all pre-configured demo scenarios with metadata.
 */
scenariosRouter.get(
  "/scenarios",
  asyncHandler(async (_req, res) => {
    ok(res, {
      count: DEMO_SCENARIOS.length,
      scenarios: DEMO_SCENARIOS,
    });
  }),
);

/**
 * POST /api/v1/scenarios/seed
 * Seed specific or all demo scenarios into the platform database.
 */
scenariosRouter.post(
  "/scenarios/seed",
  asyncHandler(async (req, res) => {
    const { scenarioKey } = seedSchema.parse(req.body ?? {});

    if (scenarioKey === "all") {
      const result = await generator.seedAll();
      eventBroadcaster.emit("event", {
        type: "case.created",
        timestamp: new Date().toISOString(),
        data: { seededCount: result.seededCount },
      });
      created(res, {
        message: "Successfully seeded all 7 demo scenarios.",
        seededCount: result.seededCount,
        cases: result.cases,
      });
      return;
    }

    try {
      const result = await generator.seedScenario(scenarioKey);
      eventBroadcaster.emit("event", {
        type: "case.created",
        timestamp: new Date().toISOString(),
        data: { scenarioKey, caseId: result.case.id },
      });
      created(res, {
        message: `Successfully seeded demo scenario '${scenarioKey}'.`,
        customer: result.customer,
        case: result.case,
      });
    } catch (err: any) {
      throw ApiError.badRequest("VALIDATION_ERROR", err.message || `Failed to seed scenario '${scenarioKey}'.`);
    }
  }),
);
