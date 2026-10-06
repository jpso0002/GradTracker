import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { migrate } from "drizzle-orm/libsql/migrator";
import type { Database } from "./db/client.js";
import { users, jobs, emailEvents, jobFieldProvenance, syncState } from "./db/schema.sqlite.js";
import { seed, type SeedResult } from "./db/seed.js";

/**
 * The presentation demo's database (D35).
 *
 * Its own file, `demo.db`, holding the **seeded sample mailbox** — 25 synthetic
 * applications, 4 detections awaiting review, 612 emails "read" — and never a
 * real inbox. `dev.db` may hold one, so the demo never touches it.
 *
 * Rebuilt on every start: deadlines are offsets from today, so a database
 * seeded last week has lost its overdue and due-tomorrow rows, and a
 * rehearsal's edits should not survive into the presentation.
 */

export const DEMO_DATABASE = "demo.db";

/** One level up from `src/` or `dist/` is the package root, where the
 *  migrations live (see db/migrate.ts). */
const MIGRATIONS = join(dirname(fileURLToPath(import.meta.url)), "../migrations/sqlite");

/**
 * Empties the database and seeds it again. The rows go, not the file: on
 * Windows a closed SQLite file stays locked for a while, so deleting and
 * recreating it fails — and emptying it needs no file system at all.
 */
export async function resetDemoDatabase(db: Database, today: Date = new Date()): Promise<SeedResult> {
  await migrate(db, { migrationsFolder: MIGRATIONS });
  // Children before parents, so no foreign key is left pointing at nothing.
  for (const table of [jobFieldProvenance, emailEvents, jobs, syncState, users]) {
    await db.delete(table);
  }
  return seed(db, today);
}
