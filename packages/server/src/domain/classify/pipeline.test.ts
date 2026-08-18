import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { migrate } from "drizzle-orm/libsql/migrator";
import { asUserId, type UserId, type Classification } from "@gradtracker/shared";
import { createTestDatabase, type DatabaseHandle } from "../../db/client.js";
import { createRepository, createIdentityRepository, type Repository } from "../../db/repository.js";
import { loadCorpus } from "../../corpus/loader.js";
import { FakeGmailClient } from "../../adapters/gmail/fake.js";
import { FakeEmailClassifier } from "../../adapters/classifier/fake.js";
import type { RawEmail } from "../../ports/index.js";
import { preFilter, classifyOne, processEmail, type PipelineDeps } from "./pipeline.js";
import { EscalatingClassifier } from "./escalate.js";

const MIGRATIONS = join(dirname(fileURLToPath(import.meta.url)), "../../../migrations/sqlite");
const corpus = loadCorpus();
const gmail = new FakeGmailClient({ fixtures: corpus, pageSize: 100 });

let handle: DatabaseHandle;
let repo: Repository;
let userId: UserId;

const deps = (over: Partial<PipelineDeps> = {}): PipelineDeps => ({
  repo,
  classifier: new FakeEmailClassifier({ fixtures: corpus }),
  ownAddress: "sam@student.monash.edu",
  reviewThreshold: 0.75,
  ...over,
});

beforeEach(async () => {
  handle = createTestDatabase();
  await migrate(handle.db, { migrationsFolder: MIGRATIONS });
  repo = createRepository(handle.db);
  const user = await createIdentityRepository(handle.db).createUser({
    googleSub: "sub",
    email: "sam@student.monash.edu",
    refreshTokenCiphertext: "ct",
    refreshTokenIv: "iv",
    refreshTokenTag: "tag",
  });
  userId = asUserId(user!.id);
});

afterEach(() => handle.close());

const email = (id: string) => gmail.fetchMessage(id);

describe("pre-filter", () => {
  const base: RawEmail = {
    gmailMessageId: "m",
    gmailThreadId: "t",
    receivedAt: new Date(),
    fromAddress: "recruiter@company.com",
    subject: "s",
    body: "b",
  };

  it("skips the student's own sent mail", () => {
    expect(preFilter({ ...base, fromAddress: "sam@student.monash.edu" }, "sam@student.monash.edu"))
      .toEqual({ skip: true, reason: "own-address" });
  });

  it("skips calendar machine traffic", () => {
    expect(preFilter({ ...base, fromAddress: "calendar-notification@google.com" }, null).skip).toBe(true);
  });

  it("passes everything else to the model", () => {
    // The pre-filter must never make a classification judgement. A keyword skip
    // would create false negatives, and a false negative is a silently missed
    // application — the costly failure (SM-2).
    for (const fixture of corpus) {
      expect(
        preFilter(
          { ...base, fromAddress: fixture.email.fromAddress },
          "sam@student.monash.edu",
        ).skip,
        `${fixture.email.id} was filtered before reaching the model`,
      ).toBe(false);
    }
  });
});

describe("classifyOne — the retention boundary (SM-6)", () => {
  it("returns nothing that could contain email content", async () => {
    const raw = await email("fixture-001");
    const classified = await classifyOne(raw, new FakeEmailClassifier({ fixtures: corpus }));

    const serialised = JSON.stringify(classified);
    expect(serialised).not.toContain(raw.subject);
    expect(serialised).not.toContain(raw.body.slice(0, 40));
    expect(serialised).not.toContain(raw.fromAddress);
  });

  it("keeps the sender domain, which is all provenance needs", async () => {
    const classified = await classifyOne(
      await email("fixture-001"),
      new FakeEmailClassifier({ fixtures: corpus }),
    );
    expect(classified.senderDomain).toBe("greenhouse.io");
  });

  it("drops the reasoning field, which quotes the email (defect C1)", async () => {
    const classified = await classifyOne(
      await email("fixture-001"),
      new FakeEmailClassifier({ fixtures: corpus }),
    );
    expect("reasoning" in classified.classification).toBe(false);
  });
});

describe("processEmail", () => {
  it("creates a job from an application email", async () => {
    const outcome = await processEmail(deps(), userId, await email("fixture-001"));
    expect(outcome.kind).toBe("created-job");

    const [job] = await repo.listJobs(userId);
    expect(job?.company).toBe("Deloitte");
    expect(job?.stage).toBe("assessment");
    expect(job?.senderDomain).toBe("greenhouse.io");
  });

  it("stores nothing at all for a non-application", async () => {
    // Not merely "no job" — no row, no id, no domain. A LinkedIn alert leaves
    // no trace in the database.
    const outcome = await processEmail(deps(), userId, await email("fixture-004"));
    expect(outcome.kind).toBe("not-application");
    expect(await repo.listJobs(userId)).toHaveLength(0);
    expect(await repo.listPendingReview(userId)).toHaveLength(0);
  });

  it("queues a low-confidence extraction instead of asserting it", async () => {
    const outcome = await processEmail(
      deps({ classifier: new FakeEmailClassifier({ fixtures: corpus, confidenceFor: () => 0.41 }) }),
      userId,
      await email("fixture-001"),
    );

    expect(outcome.kind).toBe("queued-for-review");
    // Crucially, no job is created — nothing is asserted until the student
    // confirms it.
    expect(await repo.listJobs(userId)).toHaveLength(0);
    expect(await repo.listPendingReview(userId)).toHaveLength(1);
  });

  it("queues rather than inventing a job called null", async () => {
    const outcome = await processEmail(
      deps({
        classifier: new FakeEmailClassifier({
          fixtures: corpus,
          corrupt: (truth): Classification => ({ ...truth, company: null }),
        }),
      }),
      userId,
      await email("fixture-001"),
    );
    expect(outcome.kind).toBe("queued-for-review");
    expect(await repo.listJobs(userId)).toHaveLength(0);
  });

  it("records what the email said on the queued event, so the card is not blank (T4.8)", async () => {
    // A review item has no job, so the only place the extraction can live is
    // the event itself. Without this the student confirms a sender domain and
    // a confidence and nothing else (defect C7).
    await processEmail(
      deps({ classifier: new FakeEmailClassifier({ fixtures: corpus, confidenceFor: () => 0.41 }) }),
      userId,
      await email("fixture-001"),
    );

    const truth = corpus.find((f) => f.email.gmailMessageId === "fixture-001")!.expected;
    const [pending] = await repo.listPendingReview(userId);
    expect(pending!.detectedCompany).toBe(truth.company);
    expect(pending!.detectedRole).toBe(truth.role);
  });

  it("leaves the detected company null when the classifier read none", async () => {
    await processEmail(
      deps({
        classifier: new FakeEmailClassifier({
          fixtures: corpus,
          corrupt: (truth): Classification => ({ ...truth, company: null, confidence: 0.41 }),
        }),
      }),
      userId,
      await email("fixture-001"),
    );

    const [pending] = await repo.listPendingReview(userId);
    expect(pending!.detectedCompany).toBeNull();
  });

  it("is idempotent — a re-read after a crash changes nothing", async () => {
    await processEmail(deps(), userId, await email("fixture-001"));
    const second = await processEmail(deps(), userId, await email("fixture-001"));

    expect(second.kind).toBe("already-processed");
    expect(await repo.listJobs(userId)).toHaveLength(1);
  });

  it("matches a later email to the existing job and advances the stage", async () => {
    await processEmail(deps(), userId, await email("fixture-001")); // Deloitte, assessment
    const outcome = await processEmail(deps(), userId, await email("fixture-023")); // Deloitte, assessment again

    expect(outcome.kind).toBe("updated-job");
    expect(await repo.listJobs(userId)).toHaveLength(1);
  });

  it("does not let a stale email drag a job backwards", async () => {
    // 049 is a Deloitte rejection; 001 is an earlier Deloitte assessment invite.
    await processEmail(deps(), userId, await email("fixture-049"));
    await processEmail(deps(), userId, await email("fixture-001"));

    const [job] = await repo.listJobs(userId);
    expect(job?.stage).toBe("rejected");
  });

  it("keeps separate applications at one employer separate", async () => {
    // 001 is Deloitte Audit; 020 is Atlassian. Different companies entirely —
    // but the important case is the Deloitte Digital fixture, which normalises
    // differently and must not merge.
    await processEmail(deps(), userId, await email("fixture-001"));
    await processEmail(deps(), userId, await email("fixture-020"));
    expect(await repo.listJobs(userId)).toHaveLength(2);
  });

  it("advances lastEventAt even when no field changed", async () => {
    // An employer replying "still reviewing" is not a stale job.
    await processEmail(deps(), userId, await email("fixture-001"));
    const before = (await repo.listJobs(userId))[0]!.lastEventAt;

    await processEmail(deps(), userId, await email("fixture-023"));
    const after = (await repo.listJobs(userId))[0]!.lastEventAt;

    expect(after.getTime()).toBeGreaterThan(before.getTime());
  });

  it("records a timeline event carrying no content", async () => {
    await processEmail(deps(), userId, await email("fixture-001"));
    const [job] = await repo.listJobs(userId);
    const [event] = await repo.listEventsForJob(userId, job!.id);

    expect(event?.senderDomain).toBe("greenhouse.io");
    expect(event?.reviewStatus).toBe("auto_accepted");
    expect(JSON.stringify(event)).not.toContain("online assessment");
  });
});

describe("escalation (T3.5)", () => {
  it("does not escalate a confident answer", async () => {
    const primary = new FakeEmailClassifier({ fixtures: corpus, confidenceFor: () => 0.95 });
    const escalation = new FakeEmailClassifier({ fixtures: corpus });
    const classifier = new EscalatingClassifier(primary, escalation);

    await classifier.classify(await email("fixture-001"));
    expect(classifier.getStats()).toEqual({ classified: 1, escalated: 0 });
    expect(escalation.classified).toHaveLength(0);
  });

  it("escalates below the threshold and returns the stronger answer", async () => {
    const primary = new FakeEmailClassifier({ fixtures: corpus, confidenceFor: () => 0.4 });
    const escalation = new FakeEmailClassifier({
      fixtures: corpus,
      confidenceFor: () => 0.93,
      modelFor: () => "claude-sonnet-5",
    });
    const classifier = new EscalatingClassifier(primary, escalation);

    const result = await classifier.classify(await email("fixture-001"));
    expect(result.confidence).toBe(0.93);
    expect(result.model).toBe("claude-sonnet-5");
    expect(classifier.getStats().escalated).toBe(1);
  });

  it("bills both calls, since both were made", async () => {
    const classifier = new EscalatingClassifier(
      new FakeEmailClassifier({ fixtures: corpus, confidenceFor: () => 0.3 }),
      new FakeEmailClassifier({ fixtures: corpus }),
    );
    const result = await classifier.classify(await email("fixture-001"));
    expect(result.usage).toBeDefined();
  });

  it("lets an escalated result clear the review gate the primary would have failed", async () => {
    const classifier = new EscalatingClassifier(
      new FakeEmailClassifier({ fixtures: corpus, confidenceFor: () => 0.4 }),
      new FakeEmailClassifier({ fixtures: corpus, confidenceFor: () => 0.93 }),
    );
    const outcome = await processEmail(deps({ classifier }), userId, await email("fixture-001"));
    expect(outcome.kind).toBe("created-job");
  });
});

describe("the whole corpus through the pipeline", () => {
  it("produces jobs from the positives and nothing from the negatives", async () => {
    const page = await gmail.listSince(null);
    const outcomes: string[] = [];

    for (const id of page.messageIds) {
      const outcome = await processEmail(deps(), userId, await gmail.fetchMessage(id));
      outcomes.push(outcome.kind);
    }

    expect(outcomes.filter((o) => o === "not-application")).toHaveLength(25);
    expect(outcomes.filter((o) => o === "created-job" || o === "updated-job")).toHaveLength(55);

    // 55 application emails across roughly 20 employers — the pipeline must
    // group them, not create 55 separate jobs.
    const jobs = await repo.listJobs(userId);
    expect(jobs.length).toBeLessThan(40);
    expect(jobs.length).toBeGreaterThan(10);
  });
});
