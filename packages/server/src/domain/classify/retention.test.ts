import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { migrate } from "drizzle-orm/libsql/migrator";
import { asUserId, type UserId } from "@gradtracker/shared";
import { createTestDatabase, type DatabaseHandle } from "../../db/client.js";
import { createRepository, createIdentityRepository } from "../../db/repository.js";
import { users, jobs, emailEvents, jobFieldProvenance, syncState } from "../../db/schema.sqlite.js";
import { loadCorpus } from "../../corpus/loader.js";
import { FakeGmailClient } from "../../adapters/gmail/fake.js";
import { FakeEmailClassifier } from "../../adapters/classifier/fake.js";
import { processEmail } from "./pipeline.js";

/**
 * T3.6 — SM-6 proved against a populated database.
 *
 * `schema.retention.test.ts` asserts that forbidden *columns* do not exist.
 * This asserts the stronger property: after running the entire corpus through
 * the real pipeline, **no subject or body text appears in any value of any
 * column of any table.**
 *
 * The distinction matters. A column named `next_action` is permitted, and a
 * careless implementation could stuff a sentence of the email body into it.
 * Only searching the actual data catches that.
 */

const MIGRATIONS = join(dirname(fileURLToPath(import.meta.url)), "../../../migrations/sqlite");
const corpus = loadCorpus();

let handle: DatabaseHandle;
let userId: UserId;
/** Every value from every row of every table, as one searchable string. */
let dump = "";

beforeAll(async () => {
  handle = createTestDatabase();
  await migrate(handle.db, { migrationsFolder: MIGRATIONS });

  const repo = createRepository(handle.db);
  const user = await createIdentityRepository(handle.db).createUser({
    googleSub: "sub",
    email: "sam@student.monash.edu",
    refreshTokenCiphertext: "ct",
    refreshTokenIv: "iv",
    refreshTokenTag: "tag",
  });
  userId = asUserId(user!.id);

  const gmail = new FakeGmailClient({ fixtures: corpus, pageSize: 100 });
  const classifier = new FakeEmailClassifier({ fixtures: corpus });

  const page = await gmail.listSince(null);
  for (const id of page.messageIds) {
    await processEmail(
      { repo, classifier, ownAddress: "sam@student.monash.edu", reviewThreshold: 0.75 },
      userId,
      await gmail.fetchMessage(id),
    );
  }

  const tables = [users, jobs, emailEvents, jobFieldProvenance, syncState];
  const parts: string[] = [];
  for (const table of tables) {
    parts.push(JSON.stringify(await handle.db.select().from(table)));
  }
  dump = parts.join("\n").toLowerCase();
});

afterAll(() => handle.close());

/** Distinctive multi-word phrases lifted from fixture bodies. Single words
 *  would produce false alarms — "assessment" legitimately appears in a stage
 *  and in a next action. */
function bodyPhrases(body: string): string[] {
  return body
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line.split(/\s+/).length >= 6)
    .map((line) => line.split(/\s+/).slice(0, 6).join(" ").toLowerCase());
}

describe("SM-6 — no raw email content reaches the database", () => {
  it("populated the database, so the search is meaningful", async () => {
    // A test that searches an empty database passes trivially.
    const repo = createRepository(handle.db);
    expect((await repo.listJobs(userId)).length).toBeGreaterThan(10);
    expect(dump.length).toBeGreaterThan(1000);
  });

  it("stores no email subject", () => {
    const found: string[] = [];
    for (const fixture of corpus) {
      const subject = fixture.email.subject.toLowerCase();
      if (subject.length >= 15 && dump.includes(subject)) found.push(fixture.email.id);
    }
    expect(found, `subjects found in the database: ${found.join(", ")}`).toEqual([]);
  });

  it("stores no phrase from any email body", () => {
    const found: string[] = [];
    for (const fixture of corpus) {
      for (const phrase of bodyPhrases(fixture.email.body)) {
        if (dump.includes(phrase)) {
          found.push(`${fixture.email.id}: "${phrase}"`);
          break;
        }
      }
    }
    expect(found, `body text found in the database:\n  ${found.join("\n  ")}`).toEqual([]);
  });

  it("stores no full sender address", () => {
    const found: string[] = [];
    for (const fixture of corpus) {
      const address = fixture.email.fromAddress.toLowerCase();
      if (dump.includes(address)) found.push(fixture.email.id);
    }
    expect(found, `sender addresses found: ${found.join(", ")}`).toEqual([]);
  });

  it("does store the sender domain, which provenance needs", () => {
    // Stated positively so a later reader does not over-apply the rule and
    // delete the trail that makes "detected from a Greenhouse email" possible.
    expect(dump).toContain("greenhouse.io");
    expect(dump).toContain("lever.co");
  });

  it("does store the Gmail message ids, which dedup and deep links need", () => {
    expect(dump).toContain("fixture-001");
  });

  it("catches content if it ever does leak — the search actually works", async () => {
    // Guard against a false pass. If the dump could not detect planted content,
    // every assertion above would be vacuous.
    const repo = createRepository(handle.db);
    const [job] = await repo.listJobs(userId);
    const leaked = "complete your online assessment by friday";
    await repo.updateJob(userId, job!.id, { nextAction: leaked });

    const reDump = JSON.stringify(await handle.db.select().from(jobs)).toLowerCase();
    expect(reDump).toContain(leaked);

    await repo.updateJob(userId, job!.id, { nextAction: null });
  });
});
