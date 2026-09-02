import type { Request, Response, NextFunction } from "express";

export interface AuthenticatedRequest extends Request {
  actor?: string;
  userRole?: string;
}

export function clerkAuthMiddleware(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void {
  // Public route exemptions (Razorpay webhooks, Health check, Event stream)
  const isPublicRoute =
    req.path.startsWith("/webhooks/") ||
    req.path.startsWith("/health") ||
    req.path === "/stream";

  if (isPublicRoute) {
    req.actor = "system:public_webhook";
    next();
    return;
  }

  const authHeader = req.headers.authorization;
  const apiKeyHeader = req.headers["x-api-key"] as string | undefined;

  const authEnabled =
    process.env.CLERK_AUTH_ENABLED === "true" &&
    Boolean(process.env.CLERK_SECRET_KEY);

  if (!authEnabled) {
    // Dev Sandbox mode: default to trusted admin operator context
    req.actor = apiKeyHeader ? `api_key:${apiKeyHeader.slice(0, 8)}` : "operator:sandbox_admin";
    req.userRole = "admin";
    next();
    return;
  }

  if (!authHeader && !apiKeyHeader) {
    req.actor = "operator:anonymous";
    req.userRole = "guest";
    next();
    return;
  }

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    req.actor = `operator:clerk_${token.slice(0, 8)}`;
    req.userRole = "operator";
  } else if (apiKeyHeader) {
    req.actor = `api_key:${apiKeyHeader.slice(0, 8)}`;
    req.userRole = "admin";
  } else {
    req.actor = "operator:authenticated_user";
    req.userRole = "operator";
  }

  next();
}
