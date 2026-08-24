import { loadEnv, type AppEnv } from "@recovery/config";

export interface WorkerConfig {
  env: AppEnv["NODE_ENV"];
  logLevel: AppEnv["LOG_LEVEL"];
  redisUrl: string;
  // Number of concurrent jobs the worker can process at once.
  concurrency: number;
}

export function loadWorkerConfig(): WorkerConfig {
  const env = loadEnv();
  return {
    env: env.NODE_ENV,
    logLevel: env.LOG_LEVEL,
    redisUrl: env.REDIS_URL,
    concurrency: Number(process.env.WORKER_CONCURRENCY ?? 2),
  };
}
