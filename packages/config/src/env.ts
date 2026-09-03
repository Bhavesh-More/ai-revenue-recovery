import { config as loadDotenv } from "dotenv";
import { z } from "zod";
import path from "node:path";

loadDotenv({
  path: path.resolve(__dirname, "../../../.env"),
  quiet: true,
});

const NodeEnvSchema = z.enum(["development", "test", "production"]);

const LogLevelSchema = z.enum([
  "fatal",
  "error",
  "warn",
  "info",
  "debug",
  "trace",
  "silent",
]);

function extractOllamaApiKeys(): string[] {
  const keys: string[] = [];

  // 1. Check numbered keys: OLLAMA_API_KEY_1, OLLAMA_API_KEY_2, ..., api_key_1, ...
  for (let i = 1; i <= 50; i++) {
    const candidate =
      process.env[`OLLAMA_API_KEY_${i}`] ||
      process.env[`OLLAMA_API_KEY${i}`] ||
      process.env[`ollama_api_key_${i}`] ||
      process.env[`api_key_${i}`] ||
      process.env[`api_key${i}`] ||
      process.env[`API_KEY_${i}`] ||
      process.env[`API_KEY${i}`];

    if (candidate && candidate.trim().length > 0) {
      keys.push(candidate.trim());
    }
  }


  // 2. Check standalone keys as fallback
  const singleCandidate =
    process.env.OLLAMA_API_KEY ||
    process.env.ollama_api_key ||
    process.env.API_KEY ||
    process.env.api_key;

  if (singleCandidate && singleCandidate.trim().length > 0 && !keys.includes(singleCandidate.trim())) {
    keys.unshift(singleCandidate.trim());
  }

  return keys;
}

const RawEnvSchema = z.object({
  NODE_ENV: NodeEnvSchema.default("development"),
  LOG_LEVEL: LogLevelSchema.default("info"),

  API_PORT: z.coerce.number().int().positive().default(4000),
  API_HOST: z.string().default("0.0.0.0"),
  API_VERSION: z.string().default("v1"),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DATABASE_POOL_MAX: z.coerce.number().int().positive().default(10),

  REDIS_URL: z.string().default("redis://localhost:6379"),

  OLLAMA_API_KEY: z.string().default(""),
  OLLAMA_API_KEYS: z.array(z.string()).default([]),
  OLLAMA_BASE_URL: z.string().default("https://ollama.com/v1"),
  OLLAMA_MODEL: z.string().default("gpt-oss:120b"),
  OLLAMA_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),

  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),

  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
});

export type AppEnv = z.infer<typeof RawEnvSchema>;

let cached: AppEnv | null = null;

export function loadEnv(): AppEnv {
  if (cached) return cached;
  const discoveredKeys = extractOllamaApiKeys();
  const rawData = {
    ...process.env,
    OLLAMA_API_KEYS: discoveredKeys,
    OLLAMA_API_KEY: discoveredKeys[0] || process.env.OLLAMA_API_KEY || "mock-ollama-key",
  };

  const parsed = RawEnvSchema.safeParse(rawData);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }

  const finalKeys = discoveredKeys.length > 0 ? discoveredKeys : [parsed.data.OLLAMA_API_KEY];

  cached = {
    ...parsed.data,
    OLLAMA_API_KEYS: finalKeys,
    OLLAMA_API_KEY: finalKeys[0] || parsed.data.OLLAMA_API_KEY,
  };
  return cached;
}

export function __resetEnvCacheForTests(): void {
  cached = null;
}

