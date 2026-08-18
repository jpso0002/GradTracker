import { readFileSync } from "node:fs";
import { z } from "zod";
import { ClassificationSchema, asUserId } from "@gradtracker/shared";
import type { EmailClassifier, ClassificationResult, RawEmail } from "../ports/index.js";
import { createDatabase } from "../db/client.js";
import { createIdentityRepository, createRepository } from "../db/repository.js";
import { processEmail } from "../domain/classify/pipeline.js";

/**
 * Inbox harvest importer (T3.9).
 *
 * Reads real emails, already classified in-session, and runs them through the
 * **real** `processEmail` pipeline — so matching, stage progression, provenance
 * and the retention boundary are all exercised exactly as they would be in
 * production. Nothing about this path is a shortcut except where the
 * classification came from.
 *
 * The harvest file lives **outside the repository**, because it contains email
 * subjects and bodies. Only extracted fields reach the database; the file is a
 * transient input, never an artefact.
 *
 *   npm run harvest -- <path-to-harvest.json>
 */

const HarvestRecordSchema = z.object({
  gmailMessageId: z.string(),
  gmailThreadId: z.string(),
  receivedAt: z.string(),
  fromAddress: z.string(),
  subject: z.string(),
  body: z.string(),
  classification: ClassificationSchema,
});

type HarvestRecord = z.infer<typeof HarvestRecordSchema>;

/** Replays the in-session classifications, keyed by message id. */
class HarvestClassifier implements EmailClassifier {
  private readonly byId: Map<string, HarvestRecord>;

  constructor(records: HarvestRecord[]) {
    this.byId = new Map(records.map((r) => [r.gmailMessageId, r]));
  }

  classify(email: RawEmail): Promise<ClassificationResult> {
    const record = this.byId.get(email.gmailMessageId);
    if (!record) {
      return Promise.reject(new Error(`No harvested classification for ${email.gmailMessageId}`));
    }
    return Promise.resolve({ ...record.classification, model: "fake" });
  }
}

function toRawEmail(record: HarvestRecord): RawEmail {
  return {
    gmailMessageId: record.gmailMessageId,
    gmailThreadId: record.gmailThreadId,
    receivedAt: new Date(record.receivedAt),
    fromAddress: record.fromAddress,
    subject: record.subject,
    body: record.body,
  };
}

async function main(): Promise<void> {
  const path = process.argv[2];
  // The mailbox being harvested. Defaults to the T3.9 account so an existing
  // harvest command keeps behaving identically.
  const ownAddress = process.env["HARVEST_OWN_ADDRESS"] ?? "jpso0002@student.monash.edu";
  const url = process.env["DATABASE_URL"] ?? "file:./dev.db";

  if (!path) {
    console.error("Usage: npm run harvest -- <path-to-harvest.json>");
    process.exit(1);
  }

  const records = z.array(HarvestRecordSchema).parse(JSON.parse(readFileSync(path, "utf8")));

  const { db, close } = createDatabase(url);
  const repo = createRepository(db);
  const identity = createIdentityRepository(db);

  const existing = await identity.findByGoogleSub("harvest-student");
  const user =
    existing ??
    (await identity.createUser({
      googleSub: "harvest-student",
      email: ownAddress,
      displayName: "Jordan",
      refreshTokenCiphertext: "harvest-no-token",
      refreshTokenIv: "harvest-no-iv",
      refreshTokenTag: "harvest-no-tag",
    }));

  const userId = asUserId(user!.id);

  // Oldest first, or stage progression is applied out of order.
  records.sort((a, b) => a.receivedAt.localeCompare(b.receivedAt));

  const tally: Record<string, number> = {};
  for (const record of records) {
    const outcome = await processEmail(
      {
        repo,
        classifier: new HarvestClassifier(records),
        ownAddress,
        reviewThreshold: 0.75,
      },
      userId,
      toRawEmail(record),
    );
    tally[outcome.kind] = (tally[outcome.kind] ?? 0) + 1;
  }

  console.log(`\nHarvested ${records.length} emails into ${url}\n`);
  for (const [kind, count] of Object.entries(tally).sort()) {
    console.log(`  ${kind.padEnd(20)} ${count}`);
  }

  const jobs = await repo.listJobs(userId, { status: "active" });
  const archived = await repo.listJobs(userId, { status: "archived" });
  const review = await repo.listPendingReview(userId);

  console.log(`\nPipeline: ${jobs.length} active, ${archived.length} archived, ${review.length} awaiting review\n`);
  for (const job of [...jobs, ...archived]) {
    const events = await repo.listEventsForJob(userId, job.id);
    console.log(
      `  ${job.company.padEnd(12)} ${job.role.slice(0, 38).padEnd(40)} ${job.stage.padEnd(11)} ${events.length} events`,
    );
  }
  console.log("");

  close();
}

main().catch((error: unknown) => {
  console.error("Harvest import failed:", error);
  process.exit(1);
});
