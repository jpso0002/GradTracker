import { describe, it, expect, beforeAll, beforeEach, afterEach } from "vitest";
import request from "supertest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { migrate } from "drizzle-orm/libsql/migrator";
import { getTableConfig as pgConfig } from "drizzle-orm/pg-core";
import { getTableConfig as sqliteConfig } from "drizzle-orm/sqlite-core";
import { asUserId, UpdateJobBodySchema, type UserId } from "@gradtracker/shared";
import { createTestDatabase, type DatabaseHandle } from "./db/client.js";
import { createRepository, createIdentityRepository, type Repository } from "./db/repository.js";
import { pgSchema } from "./db/schema.pg.js";
import { sqliteSchema } from "./db/schema.sqlite.js";
import { createApp } from "./app.js";

/**
 * T4.7 — SM-5's owning test: "zero credentials stored".
 *
 * Written for what exists on the demo track (28 September): no credential is
 * stored, every editable field is validated, and one student can never reach
 * another's data. The transport, session and token clauses belong to the
 * deferred T4.1–T4.3; they are listed below as `todo`, so the gap shows in
 * every test run rather than only in prose.
 */

const MIGRATIONS = join(dirname(fileURLToPath(import.meta.url)), "../migrations/sqlite");

let handle: DatabaseHandle;
let repo: Repository;
let app: ReturnType<typeof createApp>;
let me: UserId;
let them: UserId;

beforeAll(() => {
  process.env["ALLOW_UNAUTHENTICATED"] = "1";
});

beforeEach(async () => {
  handle = createTestDatabase();
  await migrate(handle.db, { migrationsFolder: MIGRATIONS });
  repo = createRepository(handle.db);
  const identity = createIdentityRepository(handle.db);
  const user = (sub: string) =>
    identity.createUser({ googleSub: sub, email: `${sub}@monash.edu`, refreshTokenCiphertext: "c", refreshTokenIv: "i", refreshTokenTag: "t" });
  me = asUserId((await user("me"))!.id);
  them = asUserId((await user("them"))!.id);
  app = createApp({ db: handle.db, userId: me });
});

afterEach(() => handle.close());

async function jobFor(userId: UserId) {
  return (await repo.insertJob(userId, {
    company: "KPMG",
    companyNormalised: "kpmg",
    role: "Vacationer Program",
    stage: "assessment",
    confidence: 0.9,
    firstSeenAt: new Date("2026-08-01T00:00:00Z"),
    lastEventAt: new Date("2026-08-14T00:00:00Z"),
  }))!;
}

async function pendingFor(userId: UserId) {
  return (await repo.insertEmailEvent(userId, {
    jobId: null,
    gmailMessageId: `pending-${userId}`,
    gmailThreadId: "t",
    receivedAt: new Date("2026-08-15T00:00:00Z"),
    detectedCompany: "Boutique Consulting",
    detectedRole: "Graduate Analyst",
    confidence: 0.4,
    reviewStatus: "pending",
    classifierModel: "fake",
  }))!;
}

// ── No credential is stored ─────────────────────────────────────────────────

describe("no credential is stored (SM-5)", () => {
  const columns = (dialect: "pg" | "sqlite") =>
    Object.values(dialect === "pg" ? pgSchema : sqliteSchema).flatMap((table) =>
      (dialect === "pg" ? pgConfig(table as never) : sqliteConfig(table as never)).columns.map((c) => c.name),
    );

  it.each(["pg", "sqlite"] as const)("%s: no password, secret or plaintext token column exists", (dialect) => {
    const forbidden = /password|passwd|secret|api_key|^access_token$|^refresh_token$|^token$/;
    expect(columns(dialect).filter((name) => forbidden.test(name))).toEqual([]);
  });

  it.each(["pg", "sqlite"] as const)("%s: a refresh token can only be held as ciphertext, IV and tag", (dialect) => {
    expect(columns(dialect).filter((name) => name.startsWith("refresh_token")).sort()).toEqual([
      "refresh_token_ciphertext",
      "refresh_token_iv",
      "refresh_token_tag",
    ]);
  });

  it("never returns a credential column in a response", async () => {
    const body = JSON.stringify((await request(app).get("/api/me").expect(200)).body);
    expect(body).not.toMatch(/refresh|ciphertext|google_?sub/i);
  });
});

// ── Validation on every user-editable field ─────────────────────────────────

describe("every user-editable field is validated (SM-5)", () => {
  /** One invalid value per editable field. The coverage check below fails if a
   *  field is added to the schema without one. */
  const INVALID: Record<string, unknown> = {
    company: "   ",
    role: "x".repeat(161),
    stage: "hired",
    deadlineAt: "next Friday",
    nextAction: "x".repeat(121),
  };

  it("has an invalid case for every field the schema lets a student edit", () => {
    expect(Object.keys(INVALID).sort()).toEqual(Object.keys(UpdateJobBodySchema.innerType().shape).sort());
  });

  it.each(Object.entries(INVALID))("rejects an invalid %s with 400, names it, and stores nothing", async (field, value) => {
    const job = await jobFor(me);
    const res = await request(app).patch(`/api/jobs/${job.id}`).send({ [field]: value }).expect(400);
    expect(res.body.field).toBe(field);
    const after = await repo.findJob(me, job.id);
    expect(after).toMatchObject({ company: "KPMG", role: "Vacationer Program", stage: "assessment" });
    expect(await repo.listProvenance(me, job.id)).toEqual([]);
  });

  it("validates a review correction the same way", async () => {
    const pending = await pendingFor(me);
    const res = await request(app)
      .post(`/api/review/${pending.id}/confirm`)
      .send({ corrections: { company: "   " } })
      .expect(400);
    expect(res.body.field).toBe("corrections.company");
  });

  it("validates the review threshold", async () => {
    const res = await request(app).patch("/api/settings").send({ reviewThreshold: 2 }).expect(400);
    expect(res.body.field).toBe("reviewThreshold");
  });

  it("strips fields a student may not set, rather than storing them", async () => {
    const job = await jobFor(me);
    await request(app)
      .patch(`/api/jobs/${job.id}`)
      .send({ company: "KPMG Australia", status: "archived", userId: them, confidence: 0.01 })
      .expect(200);
    const after = await repo.findJob(me, job.id);
    expect(after).toMatchObject({ status: "active", userId: me, confidence: 0.9 });
  });

  it("refuses an oversized or malformed body as the client's error, in fixed words", async () => {
    const job = await jobFor(me);
    const big = await request(app).patch(`/api/jobs/${job.id}`).send({ company: "x".repeat(200_000) });
    expect(big.status).toBe(413);
    expect(big.body).toEqual({ error: "Request body too large." });

    const malformed = await request(app)
      .patch(`/api/jobs/${job.id}`)
      .set("content-type", "application/json")
      .send("{ not json");
    expect(malformed.status).toBe(400);
    expect(malformed.body).toEqual({ error: "Malformed request." });
  });
});

// ── Per-user isolation ──────────────────────────────────────────────────────

describe("one student can never reach another's data (SM-5)", () => {
  it("answers 404 — never 403 — on every route that takes another student's id", async () => {
    const job = await jobFor(them);
    const pending = await pendingFor(them);

    const attempts = [
      request(app).get(`/api/jobs/${job.id}`),
      request(app).patch(`/api/jobs/${job.id}`).send({ company: "Hacked" }),
      request(app).post(`/api/jobs/${job.id}/withdraw`),
      request(app).post(`/api/review/${pending.id}/confirm`).send({}),
      request(app).post(`/api/review/${pending.id}/dismiss`),
    ];
    for (const res of await Promise.all(attempts)) expect(res.status).toBe(404);

    // And nothing of theirs changed.
    expect(await repo.findJob(them, job.id)).toMatchObject({ company: "KPMG", stage: "assessment" });
    expect((await repo.listPendingReview(them)).map((p) => p.id)).toEqual([pending.id]);
  });

  it("never lists another student's applications, questions or settings", async () => {
    await jobFor(them);
    await pendingFor(them);
    await repo.updateSettings(them, { reviewThreshold: 0.2 });

    expect((await request(app).get("/api/jobs")).body.jobs).toEqual([]);
    expect((await request(app).get("/api/jobs?status=archived")).body.jobs).toEqual([]);
    expect((await request(app).get("/api/review")).body.items).toEqual([]);
    expect((await request(app).get("/api/settings")).body.reviewThreshold).toBe(0.75);
  });
});

// ── The demo seam cannot ship ───────────────────────────────────────────────

describe("demo-mode authentication cannot ship (SM-5)", () => {
  afterEach(() => {
    process.env["NODE_ENV"] = "test";
    process.env["ALLOW_UNAUTHENTICATED"] = "1";
  });

  it("refuses to run in production", () => {
    process.env["NODE_ENV"] = "production";
    expect(() => createApp({ db: handle.db, userId: me })).toThrow(/production/);
  });

  it("refuses to run without an explicit opt-in", () => {
    delete process.env["ALLOW_UNAUTHENTICATED"];
    expect(() => createApp({ db: handle.db, userId: me })).toThrow(/ALLOW_UNAUTHENTICATED/);
  });
});

describe("errors disclose nothing (SM-5)", () => {
  it("answers a failure with a generic message, never its cause", async () => {
    handle.close(); // every query now throws inside the route
    const res = await request(app).get("/api/jobs");
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "Internal server error." });
    handle = createTestDatabase(); // so afterEach has something to close
  });
});

// ── Deferred with T4.1–T4.3 (D23) ───────────────────────────────────────────

describe("deferred with hosted sign-in (T4.1–T4.3)", () => {
  it.todo("OAuth 2.0 is the only way in — no password route exists");
  it.todo("a refresh token is AES-256-GCM encrypted at rest and never persisted in plaintext");
  it.todo("HTTPS is enforced, with HSTS");
  it.todo("session cookies are httpOnly, secure, sameSite=lax and signed; logout destroys the session");
  it.todo("Gmail is requested with the read-only scope only");
});
