import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { migrate } from "drizzle-orm/libsql/migrator";
import { asUserId, type UserId } from "@gradtracker/shared";
import { createTestDatabase, type DatabaseHandle } from "../../db/client.js";
import { createRepository, createIdentityRepository, type Repository } from "../../db/repository.js";
import { applyExtraction, applyCorrection, type ExtractedFields } from "./apply.js";

const MIGRATIONS = join(dirname(fileURLToPath(import.meta.url)), "../../../migrations/sqlite");

let handle: DatabaseHandle;
let repo: Repository;
let userId: UserId;
let jobId: string;

const extraction = (over: Partial<ExtractedFields> = {}): ExtractedFields => ({
  company: "Deloitte",
  role: "Audit Graduate Program",
  stage: "assessment",
  deadlineAt: new Date("2026-05-23T13:59:00Z"),
  nextAction: "Complete online assessment",
  ...over,
});

beforeEach(async () => {
  handle = createTestDatabase();
  await migrate(handle.db, { migrationsFolder: MIGRATIONS });
  repo = createRepository(handle.db);

  const user = await createIdentityRepository(handle.db).createUser({
    googleSub: "sub",
    email: "sam@monash.edu",
    refreshTokenCiphertext: "ct",
    refreshTokenIv: "iv",
    refreshTokenTag: "tag",
  });
  userId = asUserId(user!.id);

  const job = await repo.insertJob(userId, {
    company: "Deloite", // misspelled, as the AI first extracted it
    companyNormalised: "deloite",
    role: "Audit Grad",
    stage: "applied",
    confidence: 0.7,
    firstSeenAt: new Date("2026-05-01T00:00:00Z"),
    lastEventAt: new Date("2026-05-01T00:00:00Z"),
  });
  jobId = job!.id;
});

afterEach(() => handle.close());

describe("applyExtraction", () => {
  it("writes every field when nothing is locked", async () => {
    const result = await applyExtraction(repo, userId, jobId, extraction(), 0.92);

    expect(result.written).toEqual(["company", "role", "stage", "deadline_at", "next_action"]);
    expect(result.skippedHumanLocked).toEqual([]);

    const job = await repo.findJob(userId, jobId);
    expect(job?.company).toBe("Deloitte");
    expect(job?.stage).toBe("assessment");
  });

  it("recomputes the matching key when the company changes", async () => {
    // Without this, a corrected job stops matching its own future emails and
    // silently spawns a duplicate.
    await applyExtraction(repo, userId, jobId, extraction(), 0.92);
    expect((await repo.findJob(userId, jobId))?.companyNormalised).toBe("deloitte");
  });

  it("skips fields the classifier had nothing to say about", async () => {
    const result = await applyExtraction(
      repo,
      userId,
      jobId,
      extraction({ deadlineAt: null, nextAction: null }),
      0.9,
    );
    expect(result.skippedNoValue).toEqual(["deadline_at", "next_action"]);
    expect((await repo.findJob(userId, jobId))?.deadlineAt).toBeNull();
  });

  it("records AI provenance with the confidence", async () => {
    await applyExtraction(repo, userId, jobId, extraction(), 0.83);
    const provenance = await repo.listProvenance(userId, jobId);
    expect(provenance).toHaveLength(5);
    expect(provenance.every((p) => p.source === "ai")).toBe(true);
    expect(provenance[0]?.confidence).toBeCloseTo(0.83);
  });
});

describe("SM-7 — a correction survives the next sync", () => {
  it("refuses to overwrite a human-locked field", async () => {
    await applyCorrection(repo, userId, jobId, { company: "Deloitte" });

    // A later email insists on the misspelling.
    const result = await applyExtraction(
      repo,
      userId,
      jobId,
      extraction({ company: "Deloite" }),
      0.97,
    );

    expect(result.skippedHumanLocked).toContain("company");
    expect((await repo.findJob(userId, jobId))?.company).toBe("Deloitte");
  });

  it("holds even when the later classification is more confident", async () => {
    // Confidence is irrelevant against a human answer. There is no score at
    // which the pipeline gets to overrule the student.
    await applyCorrection(repo, userId, jobId, { role: "Audit Graduate Program" });
    await applyExtraction(repo, userId, jobId, extraction({ role: "Something Else" }), 1.0);
    expect((await repo.findJob(userId, jobId))?.role).toBe("Audit Graduate Program");
  });

  it("survives repeated syncs, not just the next one", async () => {
    await applyCorrection(repo, userId, jobId, { company: "Deloitte" });
    for (let i = 0; i < 5; i += 1) {
      await applyExtraction(repo, userId, jobId, extraction({ company: "Deloite" }), 0.95);
    }
    expect((await repo.findJob(userId, jobId))?.company).toBe("Deloitte");
  });

  it("locks only the corrected field, leaving the rest updatable", async () => {
    // A student who fixes one company name has not opted out of automation.
    await applyCorrection(repo, userId, jobId, { company: "Deloitte" });
    const result = await applyExtraction(repo, userId, jobId, extraction({ company: "Deloite" }), 0.9);

    expect(result.skippedHumanLocked).toEqual(["company"]);
    expect(result.written).toContain("stage");
    expect((await repo.findJob(userId, jobId))?.stage).toBe("assessment");
  });

  it("keeps the corrected company as the matching key", async () => {
    await applyCorrection(repo, userId, jobId, { company: "Deloitte" });
    expect((await repo.findJob(userId, jobId))?.companyNormalised).toBe("deloitte");
  });
});

describe("applyCorrection", () => {
  it("marks corrected fields human and clears their confidence", async () => {
    // A confidence score on a value a person typed is meaningless, and showing
    // one would imply the system is unsure about something it was told.
    await applyCorrection(repo, userId, jobId, { company: "Deloitte", stage: "interview" });

    const provenance = await repo.listProvenance(userId, jobId);
    const human = provenance.filter((p) => p.source === "human");
    expect(human.map((p) => p.field).sort()).toEqual(["company", "stage"]);
    expect(human.every((p) => p.confidence === null)).toBe(true);
  });

  it("does nothing when given no corrections", async () => {
    expect(await applyCorrection(repo, userId, jobId, {})).toEqual([]);
    expect(await repo.listProvenance(userId, jobId)).toHaveLength(0);
  });

  it("can clear a deadline the AI wrongly extracted", async () => {
    await applyExtraction(repo, userId, jobId, extraction(), 0.9);
    expect((await repo.findJob(userId, jobId))?.deadlineAt).not.toBeNull();

    await applyCorrection(repo, userId, jobId, { deadlineAt: null });
    const job = await repo.findJob(userId, jobId);
    expect(job?.deadlineAt).toBeNull();

    // And the cleared deadline must stick, not be refilled next sync.
    await applyExtraction(repo, userId, jobId, extraction(), 0.99);
    expect((await repo.findJob(userId, jobId))?.deadlineAt).toBeNull();
  });
});
