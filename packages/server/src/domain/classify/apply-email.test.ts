import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { migrate } from "drizzle-orm/libsql/migrator";
import { asUserId, type Stage, type UserId } from "@gradtracker/shared";
import { createTestDatabase, type DatabaseHandle } from "../../db/client.js";
import { createRepository, createIdentityRepository, type Repository } from "../../db/repository.js";
import { applyEmailToJob, type AppliedEmail } from "./apply-email.js";

/**
 * Applying one email to an existing application (T3.11) — the step the
 * pipeline and the review queue share. Emails do not arrive in order, and a
 * review item can be confirmed days after newer mail was processed.
 */

const MIGRATIONS = join(dirname(fileURLToPath(import.meta.url)), "../../../migrations/sqlite");

let handle: DatabaseHandle;
let repo: Repository;
let userId: UserId;

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

/** An application at interview, last heard from on 14 August. */
async function interviewJob() {
  const job = await repo.insertJob(userId, {
    company: "KPMG",
    companyNormalised: "kpmg",
    role: "Vacationer Program",
    stage: "interview",
    deadlineAt: new Date("2026-08-20T13:59:00Z"),
    nextAction: "Confirm interview time",
    senderDomain: "smartrecruiters.com",
    confidence: 0.93,
    firstSeenAt: new Date("2026-08-01T00:00:00Z"),
    lastEventAt: new Date("2026-08-14T00:00:00Z"),
  });
  for (const field of ["company", "role", "stage", "deadline_at", "next_action"] as const) {
    await repo.setProvenance(userId, job!.id, field, "ai", 0.93);
  }
  return job!;
}

const email = (over: Partial<AppliedEmail> & { receivedAt: Date; stage: Stage | null }): AppliedEmail => ({
  company: "KPMG",
  role: "Vacationer Program",
  deadlineAt: null,
  nextAction: null,
  confidence: 0.41,
  ...over,
});

const provenanceOf = async (jobId: string) =>
  (await repo.listProvenance(userId, jobId))
    .map((p) => ({ field: p.field, source: p.source, confidence: p.confidence }))
    .sort((a, b) => a.field.localeCompare(b.field));

describe("applying an email to an application (T3.11)", () => {
  it("leaves the application untouched when an older, lower-stage email arrives late (C16)", async () => {
    const job = await interviewJob();
    const before = { job: await repo.findJob(userId, job.id), provenance: await provenanceOf(job.id) };

    // "We have your application", sent 2 August, applied after the 14 August invite.
    const result = await applyEmailToJob(repo, userId, job.id, email({
      receivedAt: new Date("2026-08-02T00:00:00Z"),
      stage: "applied",
      role: "Vacationer Program 2026/27",
      deadlineAt: new Date("2026-08-05T13:59:00Z"),
      nextAction: "Wait for response",
    }));

    const after = await repo.findJob(userId, job.id);
    expect(result.stageChanged).toBe(false);
    expect(after!.stage).toBe("interview");
    expect(after!.lastEventAt.toISOString()).toBe("2026-08-14T00:00:00.000Z");
    expect(after!.role).toBe(before.job!.role);
    expect(after!.deadlineAt?.toISOString()).toBe(before.job!.deadlineAt?.toISOString());
    expect(await provenanceOf(job.id)).toEqual(before.provenance);
  });

  it("applies a newer email: the stage moves forward, fields are written as AI, the clock advances", async () => {
    const job = await interviewJob();
    const result = await applyEmailToJob(repo, userId, job.id, email({
      receivedAt: new Date("2026-08-20T00:00:00Z"),
      stage: "offer",
      deadlineAt: new Date("2026-08-27T13:59:00Z"),
    }));

    const after = await repo.findJob(userId, job.id);
    expect(result.stageChanged).toBe(true);
    expect(after!.stage).toBe("offer");
    expect(after!.deadlineAt?.toISOString()).toBe("2026-08-27T13:59:00.000Z");
    expect(after!.lastEventAt.toISOString()).toBe("2026-08-20T00:00:00.000Z");
    const deadline = (await provenanceOf(job.id)).find((p) => p.field === "deadline_at");
    expect(deadline).toEqual({ field: "deadline_at", source: "ai", confidence: 0.41 });
  });

  it("still counts an older email that moves the application forward, without moving the clock back", async () => {
    // An interview invite delivered after a later "still reviewing" note: the
    // application really did reach interview, and the invite's booking date is
    // the newest thing known about that stage.
    const job = await interviewJob();
    await repo.updateJob(userId, job.id, { stage: "applied" });

    const result = await applyEmailToJob(repo, userId, job.id, email({
      receivedAt: new Date("2026-08-10T00:00:00Z"),
      stage: "interview",
      deadlineAt: new Date("2026-08-12T13:59:00Z"),
    }));

    const after = await repo.findJob(userId, job.id);
    expect(result.stageChanged).toBe(true);
    expect(after!.stage).toBe("interview");
    expect(after!.deadlineAt?.toISOString()).toBe("2026-08-12T13:59:00.000Z");
    expect(after!.lastEventAt.toISOString()).toBe("2026-08-14T00:00:00.000Z");
  });

  it("does not let an old rejection overrule newer news", async () => {
    // A rejection applies from any stage because the newest email is the truth
    // — so a rejection older than the interview invite is not the truth.
    const job = await interviewJob();
    const result = await applyEmailToJob(repo, userId, job.id, email({
      receivedAt: new Date("2026-08-03T00:00:00Z"),
      stage: "rejected",
    }));

    expect(result.stageChanged).toBe(false);
    expect((await repo.findJob(userId, job.id))!.stage).toBe("interview");
  });
});
