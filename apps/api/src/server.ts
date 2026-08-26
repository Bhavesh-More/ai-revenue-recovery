import { createServer } from "node:http";
import type { Server } from "node:http";
import { createApp } from "./app.js";
import { loadApiConfig } from "./config.js";
import { getLogger } from "./lib/logger.js";
import { disposeHealth } from "./routes/health.js";
import { policyService } from "@recovery/policy";

export interface RunningServer {
  server: Server;
  port: number;
  host: string;
  shutdown: () => Promise<void>;
}

function listen(server: Server, port: number, host: string): Promise<void> {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => resolve());
  });
}

function close(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}

export async function startServer(): Promise<RunningServer> {
  const config = loadApiConfig();
  const log = getLogger();
  const app = createApp({ config });
  const server = createServer(app);

  // Idempotent default-policy bootstrap so the engine has a usable policy at startup.
  try {
    const seeded = await policyService.seedDefault();
    log.info({ policyId: seeded.id, name: seeded.name }, "Default policy ready");
  } catch (err) {
    log.warn({ err }, "Failed to seed default policy");
  }

  const port = config.port || 3000;
  const host = config.host;

  await listen(server, port, host);

  log.info(
    { port, host, env: config.env },
    `API listening on http://${host}:${port}/api/${config.version}`,
  );

  let shuttingDown = false;

  const shutdown = async (): Promise<void> => {
    if (shuttingDown) return;

    shuttingDown = true;
    log.info("Shutdown initiated");

    try {
      await close(server);
    } catch (err) {
      log.warn({ err }, "Failed to close HTTP server cleanly");
    }

    try {
      await disposeHealth();
    } catch (err) {
      log.warn({ err }, "Failed to close DB pool cleanly");
    }

    log.info("Shutdown complete");
  };

  process.once("SIGINT", () => {
    void shutdown().then(() => process.exit(0));
  });

  process.once("SIGTERM", () => {
    void shutdown().then(() => process.exit(0));
  });

  return {
    server,
    port,
    host,
    shutdown,
  };
}