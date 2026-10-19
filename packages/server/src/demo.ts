import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { migrate } from "drizzle-orm/libsql/migrator";
import type { Database } from "./db/client.js";
import { users, jobs, emailEvents, jobFieldProvenance, syncState, jobOpenings } from "./db/schema.sqlite.js";
import { eq, inArray, ne } from "drizzle-orm";
import { CONFIDENCE, asUserId, type Fixture, type UserId } from "@gradtracker/shared";
import { seed, SEED_GOOGLE_SUB, SEED_STUDENT, type SeedResult } from "./db/seed.js";
import { createIdentityRepository } from "./db/repository.js";
import { loadCorpus } from "./corpus/loader.js";
import { calendarDaysBetween, shiftDays } from "./time/zoned-time.js";
import { sampleMessageId, type SampleMessage } from "./adapters/gmail/imap.js";
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
  for (const table of [jobFieldProvenance, emailEvents, jobs, syncState, jobOpenings]) {
    await db.delete(table);
  }
  await db.delete(users).where(ne(users.googleSub, SEED_GOOGLE_SUB));
  await db.update(users).set({ reviewThreshold: CONFIDENCE.DEFAULT_REVIEW_THRESHOLD });
  return seed(db, today);
}

/**
 * Empties the demo database for the opening scan to fill from the inbox (D37),
 * keeping the sample student — the running server remembers that id.
 */
export async function clearDemoDatabase(db: Database): Promise<UserId> {
  await migrate(db, { migrationsFolder: MIGRATIONS });
  for (const table of [jobFieldProvenance, emailEvents, jobs, syncState, jobOpenings]) {
    await db.delete(table);
  }
  await db.delete(users).where(ne(users.googleSub, SEED_GOOGLE_SUB));
  await db.update(users).set({ reviewThreshold: CONFIDENCE.DEFAULT_REVIEW_THRESHOLD });

  const identity = createIdentityRepository(db);
  const student =
    (await identity.findByGoogleSub(SEED_GOOGLE_SUB)) ??
    (await identity.createUser({
      googleSub: SEED_GOOGLE_SUB,
      email: SEED_STUDENT.email,
      displayName: SEED_STUDENT.displayName,
      refreshTokenCiphertext: "seed-not-a-real-token",
      refreshTokenIv: "seed-iv",
      refreshTokenTag: "seed-tag",
    }));
  return asUserId(student!.id);
}

// ── The sample emails in the demo inbox (D37) ───────────────────────────────

/**
 * Brings the sample emails up to date as they are read: every one moves forward
 * by the same number of calendar days, so the newest arrived yesterday and the
 * dashboard has overdue, imminent and later deadlines whatever day the demo
 * runs. The gaps between emails — and so the order of each application's
 * history — are unchanged.
 */
export function rebaseSamples(emails: RawEmail[], now: Date, fixtures: Fixture[] = loadCorpus()): RawEmail[] {
  const newest = new Date(Math.max(...fixtures.map((f) => new Date(f.email.receivedAt).getTime())));
  const days = calendarDaysBetween(newest, now) - 1;
  return emails.map((email) => ({ ...email, receivedAt: shiftDays(email.receivedAt, days) }));
}

/** RFC 2047, so a subject with an em dash survives every mail server. */
function encodeHeader(value: string): string {
  return /^[\x20-\x7e]*$/.test(value) ? value : `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
}

/**
 * One sample email as a complete message, for the load script to place in the
 * demo inbox. It keeps its own sender and date, and its Message-ID marks it as
 * a sample so the inbox reader can tell it from mail a person sent.
 */
export function buildSampleMessage(fixture: Fixture, to: string): SampleMessage {
  const { email } = fixture;
  const receivedAt = new Date(email.receivedAt);
  const body = Buffer.from(email.body.replace(/\r?\n/g, "\r\n"), "utf8").toString("base64").replace(/.{76}/g, "$&\r\n");
  const raw = [
    `From: ${email.fromAddress}`,
    `To: ${to}`,
    `Subject: ${encodeHeader(email.subject)}`,
    `Date: ${receivedAt.toUTCString().replace("GMT", "+0000")}`,
    `Message-ID: ${sampleMessageId(email.gmailMessageId)}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8",
    "Content-Transfer-Encoding: base64",
    "",
    body,
    "",
  ].join("\r\n");
  return { raw, receivedAt };
}

// ── Demo accounts (D40) ─────────────────────────────────────────────────────

/** Brings `demo.db` up to date without emptying it: accounts, and what each
 *  has scanned, survive a restart. */
export async function migrateDemoDatabase(db: Database): Promise<void> {
  await migrate(db, { migrationsFolder: MIGRATIONS });
}

/** Empties one student's dashboard — their applications, review items and
 *  scan — and puts their settings back. Every other account is untouched. */
export async function clearUserData(db: Database, userId: UserId): Promise<void> {
  const owned = db.select({ id: jobs.id }).from(jobs).where(eq(jobs.userId, userId));
  await db.delete(jobFieldProvenance).where(inArray(jobFieldProvenance.jobId, owned));
  await db.delete(emailEvents).where(eq(emailEvents.userId, userId));
  await db.delete(jobs).where(eq(jobs.userId, userId));
  await db.delete(syncState).where(eq(syncState.userId, userId));
  await db.delete(jobOpenings).where(eq(jobOpenings.userId, userId));
  await db.update(users).set({ reviewThreshold: CONFIDENCE.DEFAULT_REVIEW_THRESHOLD }).where(eq(users.id, userId));
}

/** The `users` row a demo account signs in as, made on first use. */
export async function demoAccountUser(db: Database, account: { email: string; name: string }): Promise<UserId> {
  const identity = createIdentityRepository(db);
  const googleSub = `demo-account:${account.email}`;
  const user =
    (await identity.findByGoogleSub(googleSub)) ??
    (await identity.createUser({
      googleSub,
      email: account.email,
      displayName: account.name,
      // NOT NULL in the product schema, because a real student always has an
      // encrypted Google token. A demo account has none.
      refreshTokenCiphertext: "demo-account-no-token",
      refreshTokenIv: "demo-account",
      refreshTokenTag: "demo-account",
    }));
  return asUserId(user!.id);
}
