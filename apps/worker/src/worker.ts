import { Worker } from "bullmq";
import {
  QUEUE_NAMES,
  closeAllConnections,
  getWorkerConnection,
  processTestJob,
  testJobName,
} from "@recovery/queue";
import { loadWorkerConfig } from "./config.js";
import { getWorkerLogger } from "./logger.js";

export interface RunningWorker {
  worker: Worker;
  shutdown: () => Promise<void>;
}

export async function startWorker(): Promise<RunningWorker> {
  const config = loadWorkerConfig();
  const log = getWorkerLogger();

  const worker = new Worker(
    QUEUE_NAMES.TEST,
    async (job) => {
      if (job.name === testJobName) {
        return processTestJob(job);
      }
      throw new Error(`Unknown job name on ${QUEUE_NAMES.TEST}: ${job.name}`);
    },
    {
      connection: getWorkerConnection(),
      concurrency: config.concurrency,
    },
  );

  worker.on("completed", (job, result) => {
    log.info({ jobId: job.id, name: job.name, result }, "job completed");
  });

  worker.on("failed", (job, err) => {
    log.warn({ jobId: job?.id, name: job?.name, err }, "job failed");
  });

  worker.on("error", (err) => {
    log.error({ err }, "worker error");
  });

  // Wait for the worker to be ready
  await worker.waitUntilReady();
  log.info(
    {
      queue: QUEUE_NAMES.TEST,
      concurrency: config.concurrency,
      env: config.env,
    },
    "worker ready",
  );

  let shuttingDown = false;
  const shutdown = async (): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    log.info("worker shutdown initiated");
    try {
      await worker.close();
    } catch (err) {
      log.warn({ err }, "worker close failed");
    }
    await closeAllConnections();
    log.info("worker shutdown complete");
  };

  process.once("SIGINT", () => {
    void shutdown().then(() => process.exit(0));
  });
  process.once("SIGTERM", () => {
    void shutdown().then(() => process.exit(0));
  });

  return { worker, shutdown };
}
