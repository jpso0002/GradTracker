import { defineConfig } from "drizzle-kit";

/** Postgres — production. Migrations are generated, never hand-written, so the
 *  SQL cannot drift from schema.pg.ts. */
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.pg.ts",
  out: "./migrations/pg",
  strict: true,
  verbose: false,
});
