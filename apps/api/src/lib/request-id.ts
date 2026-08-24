// Request-ID middleware. Reuses incoming header if present; otherwise mints one.
// Every response carries `x-request-id` so logs and errors can be correlated.

import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

const HEADER = "x-request-id";

declare module "express-serve-static-core" {
  interface Request {
    id: string;
  }
}

export function requestId(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header(HEADER);
  const id = incoming && incoming.length > 0 ? incoming : randomUUID();
  req.id = id;
  res.setHeader(HEADER, id);
  next();
}
