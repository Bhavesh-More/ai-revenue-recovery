import { startWorker } from "./worker.js";

startWorker().catch((err) => {
  console.error("Failed to start worker:", err);
  process.exit(1);
});
