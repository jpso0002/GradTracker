import { defineConfig } from "drizzle-kit";

/** SQLite — development and test. */
export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/schema.sqlite.ts",
  out: "./migrations/sqlite",
  strict: true,
  verbose: false,
});
