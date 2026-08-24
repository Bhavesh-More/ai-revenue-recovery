import { startServer } from "./server.js";

startServer().catch((err) => {
  console.error("Failed to start API:", err);
  process.exit(1);
});
