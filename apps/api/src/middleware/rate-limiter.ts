import rateLimit from "express-rate-limit";

const isDev = process.env.NODE_ENV !== "production";

// Global REST API rate limiter: 50,000 requests in dev/demo, 500 in prod per 15 min
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 50000 : 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many requests from this IP, please try again after 15 minutes.",
    },
  },
});

// High-capacity webhook rate limiter
export const webhookRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 50000 : 5000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: "WEBHOOK_RATE_LIMIT_EXCEEDED",
      message: "Webhook throughput capacity exceeded.",
    },
  },
});

// Action rate limiter for sensitive operations
export const strictActionRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 50000 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: "ACTION_RATE_LIMIT_EXCEEDED",
      message: "Action rate limit exceeded for sensitive payment/policy operations.",
    },
  },
});
