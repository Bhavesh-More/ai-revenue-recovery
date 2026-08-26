import { z } from "zod";

export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "RESOURCE_NOT_FOUND"
  | "DUPLICATE_RESOURCE"
  | "CONFLICT"
  | "INVALID_STATE_TRANSITION"
  | "POLICY_VIOLATION"
  | "ACTION_NOT_ALLOWED"
  | "ACTION_ALREADY_EXECUTED"
  | "POLICY_NOT_FOUND"
  | "POLICY_VIOLATION"
  | "RECOVERY_STOPPED"
  | "BATCH_NOT_FOUND"
  | "CASE_NOT_FOUND"
  | "CUSTOMER_NOT_FOUND"
  | "PAYMENT_NOT_FOUND"
  | "INVOICE_NOT_FOUND"
  | "SUBSCRIPTION_NOT_FOUND"
  | "MANDATE_NOT_FOUND"
  | "CHECKOUT_SESSION_NOT_FOUND"
  | "PROMISE_NOT_FOUND"
  | "JOB_NOT_FOUND"
  | "WEBHOOK_INVALID"
  | "WEBHOOK_DUPLICATE"
  | "INTEGRATION_ERROR"
  | "PROVIDER_ERROR"
  | "QUEUE_ERROR"
  | "AGENT_ERROR"
  | "AGENT_TIMEOUT"
  | "AGENT_TOOL_ERROR"
  | "VOICE_PROVIDER_ERROR"
  | "INTERNAL_ERROR";

export interface ApiErrorEnvelope {
  error: {
    code: ApiErrorCode;
    message: string;
    details: Record<string, unknown> | null;
    requestId: string | null;
  };
}

export class ApiError extends Error {
  public readonly code: ApiErrorCode;
  public readonly status: number;
  public readonly details: Record<string, unknown> | null;
  public readonly expose: boolean;

  constructor(
    code: ApiErrorCode,
    message: string,
    status: number,
    options: {
      details?: Record<string, unknown>;
      expose?: boolean;
    } = {},
  ) {
    super(message);

    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = options.details ?? null;
    this.expose = options.expose ?? status < 500;

    Object.setPrototypeOf(this, new.target.prototype);
  }

  static badRequest(
    code: ApiErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ): ApiError {
    return new ApiError(code, message, 400, {
      details,
    });
  }

  static notFound(
    code: ApiErrorCode,
    message: string,
  ): ApiError {
    return new ApiError(code, message, 404);
  }

  static conflict(
    code: ApiErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ): ApiError {
    return new ApiError(code, message, 409, {
      details,
    });
  }

  static internal(
    message = "Internal server error",
    details?: Record<string, unknown>,
  ): ApiError {
    return new ApiError("INTERNAL_ERROR", message, 500, {
      details,
      expose: false,
    });
  }
}

export interface ValidationFieldError {
  path: string;
  message: string;
}

export function zodFieldErrors(
  issues: z.core.$ZodIssue[],
): ValidationFieldError[] {
  return issues.map((issue) => ({
    path: issue.path.join(".") || "(root)",
    message: issue.message,
  }));
}