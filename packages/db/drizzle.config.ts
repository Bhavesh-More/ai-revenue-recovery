import path from "node:path";
import { config as loadDotenv } from "dotenv";
import { defineConfig } from "drizzle-kit";

loadDotenv({ path: path.resolve(__dirname, "../../.env"), override: false });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is not set. Copy ai-revenue-recovery/.env.example to ai-revenue-recovery/.env.",
  );
}

export default defineConfig({
  schema: "./src/schema/index.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
  strict: true,
  verbose: true,
});
