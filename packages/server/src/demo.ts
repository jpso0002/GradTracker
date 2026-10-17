import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { migrate } from "drizzle-orm/libsql/migrator";
import type { Database } from "./db/client.js";
import { users, jobs, emailEvents, jobFieldProvenance, syncState } from "./db/schema.sqlite.js";
import { ne } from "drizzle-orm";
import { CONFIDENCE } from "@gradtracker/shared";
import { seed, SEED_GOOGLE_SUB, type SeedResult } from "./db/seed.js";
import { DEMO_SCRIPTS } from "./adapters/index.js";
import type { RawEmail } from "./ports/index.js";

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

/**
 * The backup trigger's emails (D36): the scripted emails a teammate would have
 * sent, received "now". Fixed ids, so a second press is recognised as already
 * processed and changes nothing.
 */
export function demoBackupEmails(now: Date): RawEmail[] {
  return DEMO_SCRIPTS.map((script, i) => ({
    gmailMessageId: `backup-${script.id}`,
    gmailThreadId: `backup-${script.id}`,
    // A second apart, in script order, so the pipeline sees them in sequence.
    receivedAt: new Date(now.getTime() + i * 1000),
    fromAddress: script.backupFrom,
    subject: script.subject,
    body: script.body,
  }));
}

/** One level up from `src/` or `dist/` is the package root, where the
 *  migrations live (see db/migrate.ts). */
const MIGRATIONS = join(dirname(fileURLToPath(import.meta.url)), "../migrations/sqlite");

/**
 * Empties the database and seeds it again. The rows go, not the file: on
 * Windows a closed SQLite file stays locked for a while, so deleting and
 * recreating it fails — and emptying it needs no file system at all.
 *
 * The sample student's own row is kept, with its settings put back, so the
 * Reset demo button can run this under a live server: the server remembers
 * the demo user's id, and a new row would leave it pointing at nobody.
 */
export async function resetDemoDatabase(db: Database, today: Date = new Date()): Promise<SeedResult> {
  await migrate(db, { migrationsFolder: MIGRATIONS });
  // Children before parents, so no foreign key is left pointing at nothing.
  for (const table of [jobFieldProvenance, emailEvents, jobs, syncState]) {
    await db.delete(table);
  }
  await db.delete(users).where(ne(users.googleSub, SEED_GOOGLE_SUB));
  await db.update(users).set({ reviewThreshold: CONFIDENCE.DEFAULT_REVIEW_THRESHOLD });
  return seed(db, today);
}
