import { loadEnv, type AppEnv } from "@recovery/config";

export interface ApiConfig {
  env: AppEnv["NODE_ENV"];
  logLevel: AppEnv["LOG_LEVEL"];
  port: number;
  host: string;
  version: string;
  corsOrigin: string;
  isProduction: boolean;
}

export function loadApiConfig(): ApiConfig {
  const env = loadEnv();
  return {
    env: env.NODE_ENV,
    logLevel: env.LOG_LEVEL,
    port: env.API_PORT,
    host: env.API_HOST,
    version: env.API_VERSION,
    corsOrigin: env.CORS_ORIGIN,
    isProduction: env.NODE_ENV === "production",
  };
}
