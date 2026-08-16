import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient } from "@libsql/client";
import { drizzle as drizzleSqlite } from "drizzle-orm/libsql";
import { migrate as migrateSqlite } from "drizzle-orm/libsql/migrator";

/**
 * Applies pending migrations to the database named by DATABASE_URL.
 *
 * Run: npm run db:migrate
 *
 * The Postgres path is exercised by migrate.test.ts against PGlite, which is
 * real Postgres in WASM. Applying to a Postgres *server* additionally needs the
 * `pg` driver, which arrives with the deployment configuration in T8.5 — there
 * is no server to point at until then, so shipping the dependency early would
 * be dead weight.
 */

/**
 * Migrations live at the package root, not under `src/`, because they are data
 * rather than source: `tsc` does not copy `.sql` files into `dist/`, so a
 * migrations folder inside `src/` resolves for tests (which run from source)
 * and silently breaks for the built script. Two levels up from either
 * `src/db/` or `dist/db/` reaches the same directory.
 */
const MIGRATIONS_ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../migrations");

async function main(): Promise<void> {
  const url = process.env["DATABASE_URL"];

  if (!url) {
    console.error(
      "DATABASE_URL is not set. Copy .env.example to .env — it works unedited.",
    );
    process.exit(1);
  }

  if (url.startsWith("postgres://") || url.startsWith("postgresql://")) {
    console.error(
      [
        "Postgres server migrations are not wired up yet (task T8.5).",
        "The Postgres schema itself is verified on every test run against PGlite:",
        "  npm test -- migrate",
        "For local development use the SQLite default:  DATABASE_URL=file:./dev.db",
      ].join("\n"),
    );
    process.exit(1);
  }

  const client = createClient({ url });
  const db = drizzleSqlite(client);

  console.log(`Migrating ${url}`);
  await migrateSqlite(db, { migrationsFolder: join(MIGRATIONS_ROOT, "sqlite") });
  console.log("Migrations applied.");

  client.close();
}

main().catch((error: unknown) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
