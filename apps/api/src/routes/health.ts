import { Router } from "express";
import { loadEnv } from "@recovery/config";
import { closeDb, db } from "@recovery/db";
import { asyncHandler } from "../lib/async-handler.js";
import { ok } from "../lib/responses.js";

const STARTED_AT = Date.now();
export const healthRouter = Router();
interface HealthResponse {
  status: "ok" | "degraded";
  version: string;
  uptimeSeconds: number;
  db: "ok" | "down";
  timestamp: string;
}

async function checkDb(): Promise<"ok" | "down"> {
  try {
    await db.execute("select 1");
    return "ok";
  } catch {
    return "down";
  }
}

function buildResponse(dbStatus: "ok" | "down"): HealthResponse {
  const env = loadEnv();
  return {
    status: dbStatus === "ok" ? "ok" : "degraded",
    version: env.API_VERSION,
    uptimeSeconds: Math.round((Date.now() - STARTED_AT) / 1000),
    db: dbStatus,
    timestamp: new Date().toISOString(),
  };
}

healthRouter.get(
  "/health",
  asyncHandler(async (_req, res) => {
    const dbStatus = await checkDb();
    ok(res, buildResponse(dbStatus));
  }),
);

export async function disposeHealth(): Promise<void> {
  await closeDb();
}
