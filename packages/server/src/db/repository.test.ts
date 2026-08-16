import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { migrate } from "drizzle-orm/libsql/migrator";
import { asUserId, type UserId } from "@gradtracker/shared";
import { createTestDatabase, type DatabaseHandle } from "./client.js";
import { createRepository, createIdentityRepository, type Repository } from "./repository.js";

const MIGRATIONS = join(dirname(fileURLToPath(import.meta.url)), "../../migrations/sqlite");

let handle: DatabaseHandle;
let repo: Repository;
let alice: UserId;
let mallory: UserId;

beforeEach(async () => {
  handle = createTestDatabase();
  await migrate(handle.db, { migrationsFolder: MIGRATIONS });

  const identity = createIdentityRepository(handle.db);
  repo = createRepository(handle.db);

  const a = await identity.createUser({
    googleSub: "sub-alice",
    email: "alice@monash.edu",
    refreshTokenCiphertext: "ct-a",
    refreshTokenIv: "iv-a",
    refreshTokenTag: "tag-a",
  });
  const m = await identity.createUser({
    googleSub: "sub-mallory",
    email: "mallory@monash.edu",
    refreshTokenCiphertext: "ct-m",
    refreshTokenIv: "iv-m",
    refreshTokenTag: "tag-m",
  });
  alice = asUserId(a!.id);
  mallory = asUserId(m!.id);
});

afterEach(() => handle.close());

async function seedJob(userId: UserId, company = "Deloitte") {
  const job = await repo.insertJob(userId, {
    company,
    companyNormalised: company.toLowerCase(),
    role: "Audit Graduate Program",
    stage: "applied",
    confidence: 0.9,
    firstSeenAt: new Date("2026-05-01T00:00:00Z"),
    lastEventAt: new Date("2026-05-01T00:00:00Z"),
  });
  return job!;
}

describe("cross-user isolation", () => {
  it("does not list another user's jobs", async () => {
    await seedJob(alice);
    expect(await repo.listJobs(mallory)).toHaveLength(0);
    expect(await repo.listJobs(alice)).toHaveLength(1);
  });

  it("returns undefined rather than another user's job by id", async () => {
    const job = await seedJob(alice);
    // Undefined, not a thrown error — routes turn this into 404, never 403,
    // because a 403 confirms the record exists.
    expect(await repo.findJob(mallory, job.id)).toBeUndefined();
    expect(await repo.findJob(alice, job.id)).toBeDefined();
  });

  it("silently refuses to update another user's job", async () => {
    const job = await seedJob(alice);
    expect(await repo.updateJob(mallory, job.id, { company: "Hacked" })).toBeUndefined();
    expect((await repo.findJob(alice, job.id))?.company).toBe("Deloitte");
  });

  it("does not leak another user's email events", async () => {
    const job = await seedJob(alice);
    await repo.insertEmailEvent(alice, {
      jobId: job.id,
      gmailMessageId: "msg-1",
      gmailThreadId: "thread-1",
      receivedAt: new Date(),
      confidence: 0.9,
      reviewStatus: "auto_accepted",
      classifierModel: "fake",
    });
    expect(await repo.listEventsForJob(mallory, job.id)).toHaveLength(0);
    expect(await repo.listEventsForJob(alice, job.id)).toHaveLength(1);
  });

  it("scopes provenance through the owning job", async () => {
    // job_field_provenance has no user_id column, so this is the one place the
    // scoping guarantee could be quietly lost.
    const job = await seedJob(alice);
    await repo.setProvenance(alice, job.id, "company", "human", null);

    expect(await repo.listProvenance(mallory, job.id)).toHaveLength(0);
    expect(await repo.setProvenance(mallory, job.id, "role", "human", null)).toBeUndefined();
    expect(await repo.isFieldLocked(mallory, job.id, "company")).toBe(false);

    expect(await repo.listProvenance(alice, job.id)).toHaveLength(1);
    expect(await repo.isFieldLocked(alice, job.id, "company")).toBe(true);
  });

  it("scopes sync state per user", async () => {
    await repo.upsertSyncState(alice, { historyId: "hist-alice" });
    expect((await repo.getSyncState(mallory))?.historyId).toBeUndefined();
    expect((await repo.getSyncState(alice))?.historyId).toBe("hist-alice");
  });

  it("treats the same Gmail message id as unprocessed for a different user", async () => {
    await repo.insertEmailEvent(alice, {
      gmailMessageId: "shared-id",
      gmailThreadId: "t",
      receivedAt: new Date(),
      confidence: 0.9,
      reviewStatus: "pending",
      classifierModel: "fake",
    });
    expect(await repo.hasProcessedMessage(alice, "shared-id")).toBe(true);
    expect(await repo.hasProcessedMessage(mallory, "shared-id")).toBe(false);
  });
});

describe("provenance semantics (SM-7)", () => {
  it("clears confidence when a field becomes human-verified", async () => {
    const job = await seedJob(alice);
    await repo.setProvenance(alice, job.id, "company", "ai", 0.62);
    expect((await repo.listProvenance(alice, job.id))[0]?.confidence).toBe(0.62);

    await repo.setProvenance(alice, job.id, "company", "human", 0.62);
    const [row] = await repo.listProvenance(alice, job.id);
    // A confidence score on a value a person typed is meaningless.
    expect(row?.confidence).toBeNull();
    expect(row?.source).toBe("human");
  });

  it("reports a field as locked only once it is human-verified", async () => {
    const job = await seedJob(alice);
    expect(await repo.isFieldLocked(alice, job.id, "company")).toBe(false);
    await repo.setProvenance(alice, job.id, "company", "ai", 0.9);
    expect(await repo.isFieldLocked(alice, job.id, "company")).toBe(false);
    await repo.setProvenance(alice, job.id, "company", "human", null);
    expect(await repo.isFieldLocked(alice, job.id, "company")).toBe(true);
  });

  it("keeps one provenance row per field, not one per write", async () => {
    const job = await seedJob(alice);
    await repo.setProvenance(alice, job.id, "role", "ai", 0.5);
    await repo.setProvenance(alice, job.id, "role", "ai", 0.8);
    await repo.setProvenance(alice, job.id, "role", "human", null);
    expect(await repo.listProvenance(alice, job.id)).toHaveLength(1);
  });
});

describe("idempotency", () => {
  it("rejects a duplicate Gmail message id for the same user", async () => {
    const insert = () =>
      repo.insertEmailEvent(alice, {
        gmailMessageId: "dup",
        gmailThreadId: "t",
        receivedAt: new Date(),
        confidence: 0.9,
        reviewStatus: "auto_accepted",
        classifierModel: "fake",
      });
    await insert();
    await expect(insert()).rejects.toThrow();
  });
});
