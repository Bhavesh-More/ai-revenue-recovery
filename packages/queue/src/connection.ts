// Redis connection
import { Redis } from "ioredis";
import { loadEnv } from "@recovery/config";

export interface RedisConnectionOptions {
  // Maximum number of times to retry a request
  maxRetriesPerRequest: number | null;
  purpose: "bullmq-producer" | "bullmq-worker" | "general";
}

export function createRedisConnection(options: RedisConnectionOptions): Redis {
  const env = loadEnv();
  return new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: options.maxRetriesPerRequest,
    // BullMQ workers need to disable ready check because it can cause issues with certain Redis setups.
    // Producers can use ready check to ensure the connection is ready before sending jobs.
    enableReadyCheck: options.purpose !== "bullmq-worker",
    // Reconnect with exponential backoff up to 2s.
    retryStrategy(times) {
      return Math.min(100 * 2 ** (times - 1), 2000);
    },
  });
}

let producerCache: Redis | null = null;
export function getProducerConnection(): Redis {
  if (!producerCache) {
    producerCache = createRedisConnection({
      purpose: "bullmq-producer",
      maxRetriesPerRequest: null,
    });
  }
  return producerCache;
}

let workerCache: Redis | null = null;
export function getWorkerConnection(): Redis {
  if (!workerCache) {
    workerCache = createRedisConnection({
      purpose: "bullmq-worker",
      maxRetriesPerRequest: null,
    });
  }
  return workerCache;
}

export async function closeAllConnections(): Promise<void> {
  const closes: Promise<unknown>[] = [];
  if (producerCache) closes.push(producerCache.quit().catch(() => undefined));
  if (workerCache) closes.push(workerCache.quit().catch(() => undefined));
  await Promise.all(closes);
  producerCache = null;
  workerCache = null;
}
