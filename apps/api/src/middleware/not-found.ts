// 404 fallback. Anything that does not match a mounted router returns the 404 handler, which will return a JSON with a 404 status code and a request ID for correlation.

import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../lib/errors.js";

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(
    new ApiError(
      "RESOURCE_NOT_FOUND",
      `Route ${req.method} ${req.originalUrl} not found.`,
      404,
    ),
  );
}
