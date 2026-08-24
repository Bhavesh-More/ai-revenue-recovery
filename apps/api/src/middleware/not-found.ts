// 404 fallback. Anything that does not match a mounted router returns the 404 handler, which will return a JSON with a 404 status code and a request ID for correlation.

import type { NextFunction, Request, Response } from "express";
import { ApiError, type ApiErrorEnvelope } from "../lib/errors.js";

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(
    new ApiError(
      "RESOURCE_NOT_FOUND",
      `Route ${req.method} ${req.originalUrl} not found.`,
      404,
    ),
  );
}

export function sendNotFound(req: Request, res: Response, message: string): void {
  const body: ApiErrorEnvelope = {
    error: {
      code: "RESOURCE_NOT_FOUND",
      message,
      details: null,
      requestId: req.id ?? null,
    },
  };
  res.status(404).json(body);
}
