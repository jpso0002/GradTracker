import { describe, it, expect, beforeEach, afterEach, beforeAll } from "vitest";
import request from "supertest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { migrate } from "drizzle-orm/libsql/migrator";
import { asUserId, type UserId } from "@gradtracker/shared";
import { createTestDatabase, type DatabaseHandle } from "../db/client.js";
import { createRepository, createIdentityRepository, type Repository } from "../db/repository.js";
import { createApp } from "../app.js";

const MIGRATIONS = join(dirname(fileURLToPath(import.meta.url)), "../../migrations/sqlite");
const NOW = new Date("2026-08-16T02:00:00Z");

let handle: DatabaseHandle;
let repo: Repository;
let app: ReturnType<typeof createApp>;
let userId: UserId;
let otherUserId: UserId;

beforeAll(() => {
  // demoContext refuses to start without this, deliberately.
  process.env["ALLOW_UNAUTHENTICATED"] = "1";
});

async function seedJob(id: UserId, over: Record<string, unknown> = {}) {
  return repo.insertJob(id, {
    company: "KPMG",
    companyNormalised: "kpmg",
    role: "Vacationer Program",
    stage: "assessment",
    deadlineAt: new Date("2026-08-18T13:59:00Z"),
    nextAction: "Complete online assessment",
    senderDomain: "smartrecruiters.com",
    confidence: 0.93,
    firstSeenAt: new Date("2026-08-01T00:00:00Z"),
    lastEventAt: new Date("2026-08-14T00:00:00Z"),
    ...over,
  });
}

beforeEach(async () => {
  handle = createTestDatabase();
  await migrate(handle.db, { migrationsFolder: MIGRATIONS });
  repo = createRepository(handle.db);

  const identity = createIdentityRepository(handle.db);
  const me = await identity.createUser({
    googleSub: "me",
    email: "sam@monash.edu",
    refreshTokenCiphertext: "c",
    refreshTokenIv: "i",
    refreshTokenTag: "t",
  });
  const them = await identity.createUser({
    googleSub: "them",
    email: "mallory@monash.edu",
    refreshTokenCiphertext: "c",
    refreshTokenIv: "i",
    refreshTokenTag: "t",
  });
  userId = asUserId(me!.id);
  otherUserId = asUserId(them!.id);

  app = createApp({ db: handle.db, clock: () => NOW, userId });
});

afterEach(() => handle.close());

describe("GET /api/jobs", () => {
  it("returns the ranked pipeline with stats", async () => {
    await seedJob(userId);
    const res = await request(app).get("/api/jobs").expect(200);

    expect(res.body.jobs).toHaveLength(1);
    expect(res.body.jobs[0].company).toBe("KPMG");
    expect(res.body.stats).toMatchObject({ liveApplications: 1 });
  });

  it("computes daysLeft server-side from the client's timezone (defect C2)", async () => {
    await seedJob(userId, { deadlineAt: new Date("2026-08-16T15:00:00Z") });

    // 15:00 UTC is already tomorrow in Melbourne, still today in London.
    const melbourne = await request(app).get("/api/jobs").set("x-timezone", "Australia/Melbourne");
    const london = await request(app).get("/api/jobs").set("x-timezone", "Europe/London");

    expect(melbourne.body.jobs[0].daysLeft).toBe(1);
    expect(london.body.jobs[0].daysLeft).toBe(0);
  });

  it("falls back to a default rather than crashing on a bad timezone", async () => {
    await seedJob(userId);
    await request(app).get("/api/jobs").set("x-timezone", "Not/AZone").expect(200);
  });

  it("excludes terminal stages from Active but shows them on Archived", async () => {
    await seedJob(userId, { stage: "rejected", status: "archived" });
    await repo.updateJob(userId, (await repo.listJobs(userId))[0]!.id, { status: "archived" });

    expect((await request(app).get("/api/jobs")).body.jobs).toHaveLength(0);
    expect((await request(app).get("/api/jobs?status=archived")).body.jobs).toHaveLength(1);
  });

  it("reports stats for the pipeline, not for the current tab", async () => {
    // "Live applications" must mean live applications. Measured against the
    // filtered list it counted archived jobs while the Archived tab was open.
    await seedJob(userId, { company: "Live Co", companyNormalised: "live co" });
    const rejected = await seedJob(userId, {
      company: "Gone Co",
      companyNormalised: "gone co",
      stage: "rejected",
    });
    // insertJob does not take `status`; archiving is an update.
    await repo.updateJob(userId, rejected!.id, { status: "archived" });

    const active = await request(app).get("/api/jobs").expect(200);
    const archived = await request(app).get("/api/jobs?status=archived").expect(200);

    expect(archived.body.jobs).toHaveLength(1);
    expect(archived.body.stats.liveApplications).toBe(1);
    expect(archived.body.stats.liveApplications).toBe(active.body.stats.liveApplications);
  });

  it("does not let a stage filter change the headline counts", async () => {
    await seedJob(userId, { stage: "assessment" });
    const all = await request(app).get("/api/jobs").expect(200);
    const filtered = await request(app).get("/api/jobs?stage=offer").expect(200);

    expect(filtered.body.jobs).toHaveLength(0);
    expect(filtered.body.stats.liveApplications).toBe(all.body.stats.liveApplications);
  });

  it("rejects an unknown status with 400 naming the field", async () => {
    const res = await request(app).get("/api/jobs?status=banana").expect(400);
    expect(res.body.field).toBe("status");
  });

  it("never returns another user's jobs", async () => {
    await seedJob(otherUserId);
    expect((await request(app).get("/api/jobs")).body.jobs).toHaveLength(0);
  });
});

describe("GET /api/jobs/:id", () => {
  it("returns the job with its provenance and timeline", async () => {
    const job = await seedJob(userId);
    await repo.setProvenance(userId, job!.id, "company", "ai", 0.93);
    await repo.insertEmailEvent(userId, {
      jobId: job!.id,
      gmailMessageId: "m1",
      gmailThreadId: "t1",
      receivedAt: new Date("2026-08-14T00:00:00Z"),
      senderDomain: "smartrecruiters.com",
      confidence: 0.93,
      reviewStatus: "auto_accepted",
      classifierModel: "fake",
    });

    const res = await request(app).get(`/api/jobs/${job!.id}`).expect(200);
    expect(res.body.job.provenance).toHaveLength(1);
    expect(res.body.timeline).toHaveLength(1);
    expect(res.body.timeline[0].senderDomain).toBe("smartrecruiters.com");
  });

  it("returns 404 — not 403 — for another user's job", async () => {
    // A 403 confirms the record exists, which is itself a disclosure. The
    // caller must not be able to distinguish "not yours" from "no such thing".
    const theirs = await seedJob(otherUserId);
    const res = await request(app).get(`/api/jobs/${theirs!.id}`).expect(404);
    expect(res.status).not.toBe(403);
  });

  it("returns 404 for an id that never existed", async () => {
    await request(app).get("/api/jobs/does-not-exist").expect(404);
  });

  it("carries no email content in the timeline", async () => {
    const job = await seedJob(userId);
    await repo.insertEmailEvent(userId, {
      jobId: job!.id,
      gmailMessageId: "m1",
      gmailThreadId: "t1",
      receivedAt: NOW,
      senderDomain: "smartrecruiters.com",
      confidence: 0.9,
      reviewStatus: "auto_accepted",
      classifierModel: "fake",
    });

    const res = await request(app).get(`/api/jobs/${job!.id}`);
    const body = JSON.stringify(res.body);
    expect(body).not.toContain("subject");
    expect(body).not.toContain("@smartrecruiters.com");
  });
});

describe("PATCH /api/jobs/:id", () => {
  it("marks a corrected field human and clears its confidence", async () => {
    const job = await seedJob(userId);
    const res = await request(app)
      .patch(`/api/jobs/${job!.id}`)
      .send({ company: "KPMG Australia" })
      .expect(200);

    expect(res.body.corrected).toEqual(["company"]);
    const company = res.body.job.provenance.find((p: { field: string }) => p.field === "company");
    expect(company.source).toBe("human");
    expect(company.confidence).toBeNull();
  });

  it("rejects an empty patch rather than silently doing nothing", async () => {
    const job = await seedJob(userId);
    await request(app).patch(`/api/jobs/${job!.id}`).send({}).expect(400);
  });

  it("names the offending field so the inline editor can show the error", async () => {
    const job = await seedJob(userId);
    const res = await request(app)
      .patch(`/api/jobs/${job!.id}`)
      .send({ company: "   " })
      .expect(400);
    expect(res.body.field).toBe("company");
    expect(res.body.error).toBeTruthy();
  });

  it("strips unknown fields rather than persisting them", async () => {
    // A client must not be able to smuggle `status` or `confidence` into a patch.
    const job = await seedJob(userId);
    await request(app)
      .patch(`/api/jobs/${job!.id}`)
      .send({ company: "KPMG", status: "archived", confidence: 0.1 })
      .expect(200);

    const row = await repo.findJob(userId, job!.id);
    expect(row?.status).toBe("active");
    expect(row?.confidence).toBeCloseTo(0.93);
  });

  it("returns 404 for another user's job", async () => {
    const theirs = await seedJob(otherUserId);
    await request(app).patch(`/api/jobs/${theirs!.id}`).send({ company: "Hacked" }).expect(404);
    expect((await repo.findJob(otherUserId, theirs!.id))?.company).toBe("KPMG");
  });
});

describe("POST /api/jobs/:id/withdraw", () => {
  it("sets both the stage and the archived status", async () => {
    // Setting only the stage leaves the job in the Active list — the gap the
    // real harvest surfaced on the rejected KPMG job.
    const job = await seedJob(userId);
    await request(app).post(`/api/jobs/${job!.id}/withdraw`).expect(200);

    const row = await repo.findJob(userId, job!.id);
    expect(row?.stage).toBe("withdrawn");
    expect(row?.status).toBe("archived");
    expect((await request(app).get("/api/jobs")).body.jobs).toHaveLength(0);
  });

  it("locks the stage so no later email can revive it", async () => {
    const job = await seedJob(userId);
    await request(app).post(`/api/jobs/${job!.id}/withdraw`);
    expect(await repo.isFieldLocked(userId, job!.id, "stage")).toBe(true);
  });
});

describe("review routes", () => {
  async function seedPending(over: Record<string, unknown> = {}) {
    return repo.insertEmailEvent(userId, {
      jobId: null,
      gmailMessageId: "pending-1",
      gmailThreadId: "pt-1",
      receivedAt: new Date("2026-08-15T00:00:00Z"),
      senderDomain: "boutique-consult.com.au",
      detectedCompany: "Boutique Consulting",
      detectedRole: "Graduate Analyst",
      detectedStage: "interview",
      confidence: 0.41,
      reviewStatus: "pending",
      classifierModel: "fake",
      ...over,
    });
  }

  it("lists pending items with their confidence", async () => {
    await seedPending();
    const res = await request(app).get("/api/review").expect(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].confidence).toBeCloseTo(0.41);
  });

  it("creates a job on confirm, with every confirmed field human-verified", async () => {
    const pending = await seedPending();
    const res = await request(app)
      .post(`/api/review/${pending!.id}/confirm`)
      .send({ corrections: { company: "Boutique Consulting", role: "Graduate Analyst" } })
      .expect(200);

    const provenance = await repo.listProvenance(userId, res.body.jobId);
    expect(provenance.every((p) => p.source === "human")).toBe(true);
    expect(await repo.listPendingReview(userId)).toHaveLength(0);
  });

  it("matches an existing job rather than duplicating it", async () => {
    const job = await seedJob(userId);
    const pending = await seedPending();

    const res = await request(app)
      .post(`/api/review/${pending!.id}/confirm`)
      .send({ corrections: { company: "KPMG", role: "Vacationer Program" } })
      .expect(200);

    expect(res.body.matched).toBe(true);
    expect(res.body.jobId).toBe(job!.id);
    expect(await repo.listJobs(userId)).toHaveLength(1);
  });

  it("refuses to confirm without a company, rather than inventing one", async () => {
    // Nothing detected and nothing corrected — the only remaining 400 path.
    const pending = await seedPending({ detectedCompany: null, detectedRole: null });
    const res = await request(app)
      .post(`/api/review/${pending!.id}/confirm`)
      .send({ corrections: { role: "Graduate Analyst" } })
      .expect(400);
    expect(res.body.field).toBe("company");
    expect(await repo.listJobs(userId)).toHaveLength(0);
  });

  // ── T4.8 / defect C7 ──────────────────────────────────────────────────────
  it("proposes the detected company and role, so the card is not blank", async () => {
    await seedPending();
    const res = await request(app).get("/api/review").expect(200);
    expect(res.body.items[0].company).toBe("Boutique Consulting");
    expect(res.body.items[0].role).toBe("Graduate Analyst");
  });

  it("confirms with an empty corrections object — the common case", async () => {
    // The student read the card and said yes. Before T4.8 this was a 400.
    const pending = await seedPending();
    const res = await request(app)
      .post(`/api/review/${pending!.id}/confirm`)
      .send({})
      .expect(200);

    const job = await repo.findJob(userId, res.body.jobId);
    expect(job!.company).toBe("Boutique Consulting");
    expect(job!.role).toBe("Graduate Analyst");
  });

  it("accepting an unedited card still marks the fields human, not ai", async () => {
    // The student did not type the value, but they did look at it and accept
    // it. A later sync must not overwrite that (SM-7).
    const pending = await seedPending();
    const res = await request(app).post(`/api/review/${pending!.id}/confirm`).send({}).expect(200);

    const provenance = await repo.listProvenance(userId, res.body.jobId);
    expect(provenance.length).toBeGreaterThan(0);
    expect(provenance.every((p) => p.source === "human")).toBe(true);
    expect(provenance.every((p) => p.confidence === null)).toBe(true);
  });

  it("a correction still beats the detected value", async () => {
    const pending = await seedPending();
    const res = await request(app)
      .post(`/api/review/${pending!.id}/confirm`)
      .send({ corrections: { company: "Boutique Consulting Co" } })
      .expect(200);

    const job = await repo.findJob(userId, res.body.jobId);
    expect(job!.company).toBe("Boutique Consulting Co");
    // The role was not corrected, so the detected value stands.
    expect(job!.role).toBe("Graduate Analyst");
  });

  it("dismisses without deleting, so the email can never resurface", async () => {
    const pending = await seedPending();
    await request(app).post(`/api/review/${pending!.id}/dismiss`).expect(200);

    expect(await repo.listPendingReview(userId)).toHaveLength(0);
    // The row survives, keeping its Gmail id. The unique constraint on
    // (user_id, gmail_message_id) is what stops a re-sync resurrecting it.
    expect(await repo.hasProcessedMessage(userId, "pending-1")).toBe(true);
  });

  it("returns 404 for another user's review item", async () => {
    const theirs = await repo.insertEmailEvent(otherUserId, {
      jobId: null,
      gmailMessageId: "theirs",
      gmailThreadId: "t",
      receivedAt: NOW,
      confidence: 0.4,
      reviewStatus: "pending",
      classifierModel: "fake",
    });
    await request(app).post(`/api/review/${theirs!.id}/dismiss`).expect(404);
    expect(await repo.listPendingReview(otherUserId)).toHaveLength(1);
  });
});

describe("sync routes", () => {
  it("reports status from sync_state", async () => {
    await repo.upsertSyncState(userId, { emailsReadTotal: 612, state: "idle" });
    const res = await request(app).get("/api/sync/status").expect(200);
    expect(res.body.emailsReadTotal).toBe(612);
  });

  it("returns 501 for a sync it cannot perform, rather than faking success", async () => {
    // A Refresh button that appears to work and does not is worse than one
    // that says it cannot.
    const res = await request(app).post("/api/sync").expect(501);
    expect(res.body.error).toContain("demo mode");
  });
});

describe("app basics", () => {
  it("404s an unknown route as JSON", async () => {
    const res = await request(app).get("/api/nope").expect(404);
    expect(res.body.error).toBeTruthy();
  });

  it("reports demo mode on /api/me, so the client cannot mistake it for real auth", async () => {
    const res = await request(app).get("/api/me").expect(200);
    expect(res.body.demoMode).toBe(true);
  });
});
