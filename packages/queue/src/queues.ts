import { Queue, type JobsOptions } from "bullmq";
import { getProducerConnection } from "./connection.js";

export const QUEUE_NAMES = {
  TEST: "recovery.test",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export const DEFAULT_JOB_OPTIONS: JobsOptions = {
  attempts: 3,
  backoff: {
    type: "exponential",
    delay: 1_000,
  },
  removeOnComplete: {
    age: 24 * 3_600, // 24h
    count: 1_000,
  },
  removeOnFail: {
    age: 7 * 24 * 3_600, // 7d
  },
};

let cached: Partial<Record<QueueName, Queue>> = {};

export function getQueue(name: QueueName): Queue {
  const existing = cached[name];
  if (existing) return existing;
  const queue = new Queue(name, {
    connection: getProducerConnection(),
    defaultJobOptions: DEFAULT_JOB_OPTIONS,
  });
  cached[name] = queue;
  return queue;
}

export async function closeAllQueues(): Promise<void> {
  await Promise.all(
    Object.values(cached).map((q) => q?.close().catch(() => undefined)),
  );
  cached = {};
}
