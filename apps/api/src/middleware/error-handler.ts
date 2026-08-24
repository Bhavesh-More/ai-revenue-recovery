import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { ApiError, zodFieldErrors, type ApiErrorEnvelope } from "../lib/errors.js";
import { getLogger } from "../lib/logger.js";

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const log = getLogger().child({ requestId: req.id });

  if (err instanceof ApiError) {
    log.warn({ code: err.code, status: err.status }, err.message);
    const body: ApiErrorEnvelope = {
      error: {
        code: err.code,
        message: err.message,
        details: err.expose ? err.details : null,
        requestId: req.id ?? null,
      },
    };
    res.status(err.status).json(body);
    return;
  }

  if (err instanceof ZodError) {
    const fields = zodFieldErrors(err.issues);
    log.warn({ code: "VALIDATION_ERROR", fields }, "Request validation failed");
    const body: ApiErrorEnvelope = {
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed.",
        details: { fieldErrors: fields },
        requestId: req.id ?? null,
      },
    };
    res.status(400).json(body);
    return;
  }

  const message = err instanceof Error ? err.message : "Unknown error";
  log.error({ err }, "Unhandled error");
  const body: ApiErrorEnvelope = {
    error: {
      code: "INTERNAL_ERROR",
      message: "Internal server error.",
      details: null,
      requestId: req.id ?? null,
    },
  };
  res.status(500).json(body);
  // Surface original message to logs
  void message;
}
