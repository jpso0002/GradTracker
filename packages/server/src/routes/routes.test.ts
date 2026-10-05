import { describe, it, expect, beforeEach, afterEach, beforeAll } from "vitest";
import request from "supertest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { migrate } from "drizzle-orm/libsql/migrator";
import { asUserId, type Fixture, type UserId } from "@gradtracker/shared";
import { createTestDatabase, type DatabaseHandle } from "../db/client.js";
import { createRepository, createIdentityRepository, type Repository } from "../db/repository.js";
import { createApp } from "../app.js";
import { processEmail } from "../domain/classify/pipeline.js";
import { FakeEmailClassifier } from "../adapters/classifier/fake.js";

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
    // No status is passed: a job inserted at a terminal stage is archived by
    // the repository itself (T4.9). This test used to set the status by hand,
    // which masked the defect instead of testing the behaviour.
    await seedJob(userId, { stage: "rejected" });

    expect((await request(app).get("/api/jobs")).body.jobs).toHaveLength(0);
    expect((await request(app).get("/api/jobs?status=archived")).body.jobs).toHaveLength(1);
  });

  it("reports stats for the pipeline, not for the current tab", async () => {
    // "Live applications" must mean live applications. Measured against the
    // filtered list it counted archived jobs while the Archived tab was open.
    await seedJob(userId, { company: "Live Co", companyNormalised: "live co" });
    await seedJob(userId, {
      company: "Gone Co",
      companyNormalised: "gone co",
      stage: "rejected",
    });

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
    // Shown beneath the field as written, so it has to read as a sentence —
    // not "String must contain at least 1 character(s)".
    expect(res.body.error).toBe("Company cannot be empty.");
  });

  it("shows a next action the student typed, though the application has gone quiet (C23)", async () => {
    // 46 days without an email: an assessment is long past its five-day
    // staleness threshold, so the derived action is "Follow up".
    const job = await seedJob(userId, { lastEventAt: new Date("2026-07-01T00:00:00Z") });
    expect((await request(app).get(`/api/jobs/${job!.id}`)).body.job.nextAction).toMatch(/^Follow up/);

    const res = await request(app)
      .patch(`/api/jobs/${job!.id}`)
      .send({ nextAction: "Email Priya about the test link" })
      .expect(200);

    expect(res.body.job.nextAction).toBe("Email Priya about the test link");
  });

  it("keeps a cleared next action clear instead of restoring the stage default (C23)", async () => {
    const job = await seedJob(userId);
    const res = await request(app).patch(`/api/jobs/${job!.id}`).send({ nextAction: null }).expect(200);
    expect(res.body.job.nextAction).toBeNull();
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

  // ── T4.9 / defect C11 ─────────────────────────────────────────────────────
  it("archives an application when a correction sets a terminal stage", async () => {
    // Before T4.9 the status stayed 'active'. Ranking drops terminal stages
    // from Active and the Archived tab filters on status — so the application
    // was on neither tab.
    const job = await seedJob(userId);
    await request(app).patch(`/api/jobs/${job!.id}`).send({ stage: "rejected" }).expect(200);

    expect((await request(app).get("/api/jobs")).body.jobs).toHaveLength(0);
    const archived = await request(app).get("/api/jobs?status=archived");
    expect(archived.body.jobs.map((j: { id: string }) => j.id)).toEqual([job!.id]);
  });

  it("returns an application to Active when a correction reverses a terminal stage", async () => {
    // The undo path: a mistaken "rejected" must be recoverable by correcting it.
    const job = await seedJob(userId);
    await request(app).patch(`/api/jobs/${job!.id}`).send({ stage: "rejected" }).expect(200);
    await request(app).patch(`/api/jobs/${job!.id}`).send({ stage: "interview" }).expect(200);

    const active = await request(app).get("/api/jobs");
    expect(active.body.jobs.map((j: { id: string }) => j.id)).toEqual([job!.id]);
    expect((await request(app).get("/api/jobs?status=archived")).body.jobs).toHaveLength(0);
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

  it("archives an application confirmed from review at a terminal stage (T4.9)", async () => {
    // Defect C11 on a third path: a low-confidence rejection email, confirmed
    // by the student, created an application that appeared on neither tab.
    const pending = await seedPending({ detectedStage: "rejected" });
    const res = await request(app).post(`/api/review/${pending!.id}/confirm`).send({}).expect(200);

    expect((await request(app).get("/api/jobs")).body.jobs).toHaveLength(0);
    const archived = await request(app).get("/api/jobs?status=archived");
    expect(archived.body.jobs.map((j: { id: string }) => j.id)).toEqual([res.body.jobId]);
  });

  it("applies a withdrawal the model detected only when the student confirms it (C17)", async () => {
    // The pipeline never applies `withdrawn`; it queues the email. Confirming
    // is the student's act, so the stage is human and the application archives.
    const job = await seedJob(userId);
    const pending = await seedPending({
      detectedCompany: "KPMG",
      detectedRole: "Vacationer Program",
      detectedStage: "withdrawn",
      senderDomain: "smartrecruiters.com",
      confidence: 0.95,
    });
    const res = await request(app).post(`/api/review/${pending!.id}/confirm`).send({}).expect(200);

    expect(res.body.jobId).toBe(job!.id);
    const withdrawn = await repo.findJob(userId, job!.id);
    expect(withdrawn!.stage).toBe("withdrawn");
    expect(withdrawn!.status).toBe("archived");
    expect(await repo.isFieldLocked(userId, job!.id, "stage")).toBe(true);
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

  // ── T3.10 / D26 — suggested applications ──────────────────────────────────
  describe("an item suggesting an existing application (T3.10)", () => {
    async function suggested() {
      const job = await seedJob(userId);
      const pending = await seedPending({
        suggestedJobId: job!.id,
        detectedCompany: "KPMG",
        detectedRole: "Graduate Program, Audit",
        detectedStage: "applied",
        senderDomain: "smartrecruiters.com",
        confidence: 0.9,
      });
      return { job: job!, pending: pending! };
    }

    it("names the suggested application on the card", async () => {
      const { job } = await suggested();
      const res = await request(app).get("/api/review").expect(200);
      expect(res.body.items[0].suggestedJob).toEqual({ id: job.id, company: "KPMG", role: "Vacationer Program" });
    });

    it("asks for an answer — same or new — before confirming", async () => {
      const { pending } = await suggested();
      const res = await request(app).post(`/api/review/${pending.id}/confirm`).send({}).expect(400);
      expect(res.body.field).toBe("application");
      expect(await repo.listPendingReview(userId)).toHaveLength(1);
    });

    it("'same application' attaches the email to the suggested application and creates nothing", async () => {
      const { job, pending } = await suggested();
      const res = await request(app)
        .post(`/api/review/${pending.id}/confirm`)
        .send({ application: "same" })
        .expect(200);

      expect(res.body).toEqual({ jobId: job.id, matched: true });
      expect(await repo.listJobs(userId)).toHaveLength(1);
      const [event] = await repo.listEventsForJob(userId, job.id);
      expect(event?.reviewStatus).toBe("confirmed");
    });

    it("'new application' creates one and leaves the suggested application alone", async () => {
      const { job, pending } = await suggested();
      const res = await request(app)
        .post(`/api/review/${pending.id}/confirm`)
        .send({ application: "new" })
        .expect(200);

      expect(res.body.matched).toBe(false);
      expect(res.body.jobId).not.toBe(job.id);
      const roles = (await repo.listJobs(userId)).map((j) => j.role).sort();
      expect(roles).toEqual(["Graduate Program, Audit", "Vacationer Program"]);
    });

    it("without a suggestion, never merges on company and sender alone", async () => {
      // Nothing asked the student, so a domain-only match is not a match (D26):
      // confirming starts a new application rather than merging silently.
      await seedJob(userId);
      const pending = await seedPending({
        detectedCompany: "KPMG",
        detectedRole: "Graduate Program, Audit",
        senderDomain: "smartrecruiters.com",
      });
      const res = await request(app).post(`/api/review/${pending!.id}/confirm`).send({}).expect(200);

      expect(res.body.matched).toBe(false);
      expect(await repo.listJobs(userId)).toHaveLength(2);
    });

    it("marks the suggested application's row while the question is open", async () => {
      const { job, pending } = await suggested();
      const open = await request(app).get("/api/jobs").expect(200);
      expect(open.body.jobs.find((j: { id: string }) => j.id === job.id).pendingReviewId).toBe(pending.id);

      await request(app).post(`/api/review/${pending.id}/dismiss`).expect(200);
      const closed = await request(app).get("/api/jobs").expect(200);
      expect(closed.body.jobs.find((j: { id: string }) => j.id === job.id).pendingReviewId).toBeNull();
    });
  });

  // ── T3.11 / C16 — confirming onto an existing application ─────────────────
  it("confirming an older email onto a later-stage application changes nothing it should not (C16)", async () => {
    // The application is at interview, last heard from on 14 August. An older,
    // low-confidence "application received" email (2 August) is confirmed onto
    // it. It used to move the stage back to applied, move lastEventAt back and
    // lock every field as human, so no later email could ever move it again.
    const job = await seedJob(userId, { stage: "interview" });
    for (const field of ["company", "role", "stage", "deadline_at", "next_action"] as const) {
      await repo.setProvenance(userId, job!.id, field, "ai", 0.93);
    }
    const provenance = async () =>
      (await repo.listProvenance(userId, job!.id))
        .map((p) => `${p.field}:${p.source}:${p.confidence}`)
        .sort();
    const before = await provenance();

    const pending = await seedPending({
      detectedCompany: "KPMG",
      detectedRole: "Vacationer Program",
      detectedStage: "applied",
      senderDomain: "smartrecruiters.com",
      receivedAt: new Date("2026-08-02T00:00:00Z"),
      confidence: 0.41,
    });
    const res = await request(app).post(`/api/review/${pending!.id}/confirm`).send({}).expect(200);

    expect(res.body).toEqual({ jobId: job!.id, matched: true });
    const after = await repo.findJob(userId, job!.id);
    expect(after!.stage).toBe("interview");
    expect(after!.lastEventAt.toISOString()).toBe("2026-08-14T00:00:00.000Z");
    expect(await provenance()).toEqual(before);

    // And a later offer email still moves it — nothing was locked.
    const offer: Fixture = {
      email: {
        id: "offer-1",
        gmailMessageId: "offer-1",
        gmailThreadId: "offer-t1",
        receivedAt: "2026-08-20T00:00:00+00:00",
        fromAddress: "noreply@smartrecruiters.com",
        subject: "s",
        body: "b",
      },
      expected: {
        isApplication: true,
        company: "KPMG",
        role: "Vacationer Program",
        stage: "offer",
        deadlineAt: null,
        hasExplicitDeadlineLanguage: false,
      },
    };
    await processEmail(
      { repo, classifier: new FakeEmailClassifier({ fixtures: [offer] }), ownAddress: null },
      userId,
      { ...offer.email, receivedAt: new Date(offer.email.receivedAt) },
    );
    expect((await repo.findJob(userId, job!.id))!.stage).toBe("offer");
  });

  it("makes only the fields the student changed human when confirming onto an application", async () => {
    const job = await seedJob(userId);
    const pending = await seedPending({
      detectedCompany: "KPMG",
      detectedRole: "Vacationer Program",
      detectedStage: "interview",
      senderDomain: "smartrecruiters.com",
      receivedAt: new Date("2026-08-15T00:00:00Z"),
      confidence: 0.6,
    });
    await request(app)
      .post(`/api/review/${pending!.id}/confirm`)
      .send({ corrections: { nextAction: "Book the panel interview" } })
      .expect(200);

    const sources = Object.fromEntries(
      (await repo.listProvenance(userId, job!.id)).map((p) => [p.field, p.source]),
    );
    expect(sources["next_action"]).toBe("human");
    expect(sources["stage"]).toBe("ai"); // the email's own stage, through the stage engine
    expect((await repo.findJob(userId, job!.id))!.stage).toBe("interview");
  });
});

describe("settings (T4.10)", () => {
  it("reads the student's own review threshold — 0.75 until they change it", async () => {
    const res = await request(app).get("/api/settings").expect(200);
    expect(res.body).toEqual({ reviewThreshold: 0.75 });
  });

  it("persists a new threshold, and /api/me reports it rather than the constant", async () => {
    await request(app).patch("/api/settings").send({ reviewThreshold: 0.9 }).expect(200);
    expect((await request(app).get("/api/settings")).body.reviewThreshold).toBeCloseTo(0.9);
    expect((await request(app).get("/api/me")).body.reviewThreshold).toBeCloseTo(0.9);
  });

  it("refuses a threshold outside 0–1, and an empty change", async () => {
    await request(app).patch("/api/settings").send({ reviewThreshold: 1.5 }).expect(400);
    await request(app).patch("/api/settings").send({}).expect(400);
    expect((await request(app).get("/api/settings")).body.reviewThreshold).toBe(0.75);
  });

  it("changes only this student's threshold", async () => {
    await request(app).patch("/api/settings").send({ reviewThreshold: 0.6 }).expect(200);
    expect((await repo.getSettings(otherUserId))?.reviewThreshold).toBe(0.75);
  });

  it("routes the next ingest by a threshold set through the API, and re-routes nothing stored (T6.4)", async () => {
    // The Settings slider's whole contract, end to end: PATCH, then ingest.
    const fixture = (id: string, company: string): Fixture => ({
      email: {
        id,
        gmailMessageId: id,
        gmailThreadId: `${id}-t`,
        receivedAt: "2026-08-15T00:00:00+00:00",
        fromAddress: `careers@${company.toLowerCase()}.com`,
        subject: "s",
        body: "b",
      },
      expected: {
        isApplication: true,
        company,
        role: "Graduate Program",
        stage: "applied",
        deadlineAt: null,
        hasExplicitDeadlineLanguage: false,
      },
    });
    const first = fixture("ingest-1", "Optiver");
    const second = fixture("ingest-2", "Canva");
    // The model is 80% sure of both: asserted at 0.75, asked about at 0.9.
    const deps = {
      repo,
      classifier: new FakeEmailClassifier({ fixtures: [first, second], confidenceFor: () => 0.8 }),
      ownAddress: null,
    };
    const ingest = (f: Fixture) =>
      processEmail(deps, userId, { ...f.email, receivedAt: new Date(f.email.receivedAt) });

    expect((await ingest(first)).kind).toBe("created-job");
    await request(app).patch("/api/settings").send({ reviewThreshold: 0.9 }).expect(200);
    expect((await ingest(second)).kind).toBe("queued-for-review");

    expect((await request(app).get("/api/jobs")).body.jobs.map((j: { company: string }) => j.company)).toEqual([
      "Optiver",
    ]);
    expect((await request(app).get("/api/review")).body.items.map((i: { company: string }) => i.company)).toEqual([
      "Canva",
    ]);
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
