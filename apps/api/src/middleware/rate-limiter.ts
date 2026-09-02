import rateLimit from "express-rate-limit";

// Global REST API rate limiter: 200 requests per 15 minutes window
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many requests from this IP, please try again after 15 minutes.",
    },
  },
});

// High-capacity webhook rate limiter: 1000 requests per 15 minutes window
export const webhookRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: "WEBHOOK_RATE_LIMIT_EXCEEDED",
      message: "Webhook throughput capacity exceeded.",
    },
  },
});

// Strict rate limiter for sensitive actions: 30 requests per 15 minutes window
export const strictActionRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: "ACTION_RATE_LIMIT_EXCEEDED",
      message: "Action rate limit exceeded for sensitive payment/policy operations.",
    },
  },
});
