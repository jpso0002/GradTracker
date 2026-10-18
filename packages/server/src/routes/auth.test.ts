import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import { createTestDatabase, type DatabaseHandle } from "../db/client.js";
import { createApp } from "../app.js";
import { clearUserData, demoBackupEmails, migrateDemoDatabase, rebaseSamples } from "../demo.js";
import { DemoAccounts, readSession, signSession } from "../demo-accounts.js";
import { seed } from "../db/seed.js";
import { DemoEmailClassifier } from "../adapters/index.js";
import { loadCorpus } from "../corpus/loader.js";
import type { MailboxReader } from "../ports/index.js";
import type { DemoSession } from "./sync.js";

/**
 * The presentation demo's own accounts (D40): a fresh account made in front of
 * the room, signed out of, and the demo inbox's account signed in to.
 */

const INBOX = "gradtrackerdemo@gmail.com";
const SECRET = "test-secret";

let handle: DatabaseHandle;
let accounts: DemoAccounts;

const samples = () =>
  loadCorpus().map((f) => ({
    gmailMessageId: `${f.email.gmailMessageId}@gradtracker.demo`,
    gmailThreadId: `${f.email.gmailMessageId}-thread`,
    receivedAt: new Date(f.email.receivedAt),
    fromAddress: f.email.fromAddress,
    subject: f.email.subject,
    body: f.email.body,
  }));

function app() {
  const inbox: MailboxReader = { readSince: () => Promise.resolve([]), readSamples: () => Promise.resolve(samples()) };
  const demo: DemoSession = {
    inbox,
    inboxAddress: INBOX,
    classifier: new DemoEmailClassifier(),
    startedAt: new Date(0),
    backupEmails: demoBackupEmails,
    rebaseSamples: (emails, now) => rebaseSamples(emails, now),
    clear: (userId) => clearUserData(handle.db, userId),
    seed: async (userId) => {
      await clearUserData(handle.db, userId);
      await seed(handle.db, new Date(), userId);
    },
  };
  return createApp({ db: handle.db, demo, accounts: { accounts, secret: SECRET, inboxAddress: INBOX } });
}

beforeEach(async () => {
  handle = createTestDatabase();
  await migrateDemoDatabase(handle.db);
  accounts = new DemoAccounts(null);
});

afterEach(() => handle.close());

const signUp = (agent: ReturnType<typeof request.agent>, email: string, name = "Jordan Psomas") =>
  agent.post("/api/auth/signup").send({ name, email, password: "correct-horse" });

describe("signing up (D40)", () => {
  it("creates the account, signs it in, and keeps no password", async () => {
    const agent = request.agent(app());
    const res = await signUp(agent, "Jordan@Student.Monash.edu").expect(201);

    expect(res.body).toMatchObject({ user: { email: "jordan@student.monash.edu", name: "Jordan Psomas" }, scanned: false });
    expect(res.headers["set-cookie"]?.[0]).toMatch(/gt_session=.+HttpOnly/);

    const stored = await accounts.find("jordan@student.monash.edu");
    expect(JSON.stringify(stored)).not.toContain("correct-horse");
    expect(stored?.hash).toBeTruthy();
  });

  it("refuses a second account with the same email, and says to sign in", async () => {
    const agent = request.agent(app());
    await signUp(agent, "jordan@student.monash.edu").expect(201);
    const res = await signUp(request.agent(app()), "JORDAN@student.monash.edu").expect(409);
    expect(res.body).toMatchObject({ field: "email" });
    expect(res.body.error).toMatch(/sign in instead/);
  });

  it("checks the form like the screen does", async () => {
    const res = await request(app()).post("/api/auth/signup").send({ name: "J", email: "j@x.com", password: "short" }).expect(400);
    expect(res.body).toMatchObject({ field: "password", error: "Use at least 8 characters" });
  });
});

describe("signing in and out (D40)", () => {
  it("answers nothing without a session, and the account's own data with one", async () => {
    const server = app();
    await request(server).get("/api/jobs").expect(401);

    const agent = request.agent(server);
    await signUp(agent, "jordan@student.monash.edu").expect(201);
    const jobs = await agent.get("/api/jobs").expect(200);
    expect(jobs.body.jobs).toEqual([]);
    expect((await agent.get("/api/me").expect(200)).body.email).toBe("jordan@student.monash.edu");
  });

  it("signs out, then signs back in with the right password only", async () => {
    const server = app();
    const agent = request.agent(server);
    await signUp(agent, "jordan@student.monash.edu").expect(201);

    await agent.post("/api/auth/signout").expect(200);
    await agent.get("/api/jobs").expect(401);
    expect((await agent.get("/api/auth/session").expect(200)).body.user).toBeNull();

    const wrong = await agent.post("/api/auth/signin").send({ email: "jordan@student.monash.edu", password: "nope-nope" }).expect(401);
    const unknown = await agent.post("/api/auth/signin").send({ email: "who@x.com", password: "correct-horse" }).expect(401);
    expect(wrong.body.error).toBe(unknown.body.error);

    await agent.post("/api/auth/signin").send({ email: "JORDAN@student.monash.edu", password: "correct-horse" }).expect(200);
    await agent.get("/api/jobs").expect(200);
  });

  it("refuses a forged or expired session", async () => {
    await signUp(request.agent(app()), "jordan@student.monash.edu").expect(201);
    const forged = signSession("jordan@student.monash.edu", "another-secret");
    await request(app()).get("/api/jobs").set("Cookie", `gt_session=${forged}`).expect(401);

    const old = signSession("jordan@student.monash.edu", SECRET, new Date("2020-01-01"));
    expect(readSession(old, SECRET)).toBeNull();
  });
});

describe("the demo inbox belongs to its own account (D40)", () => {
  it("lets a new account see an empty dashboard, but not connect the inbox", async () => {
    const agent = request.agent(app());
    const res = await signUp(agent, "jordan@student.monash.edu").expect(201);
    expect(res.body).toMatchObject({ canConnectInbox: false, inbox: INBOX });

    const scan = await agent.post("/api/demo/scan").expect(403);
    expect(scan.body.error).toContain(INBOX);
    await agent.post("/api/sync").expect(403);
    await agent.post("/api/sync/backup").expect(403);
  });

  it("scans on the inbox account's first sign-in, keeps it, and Reset re-arms the scan", async () => {
    const server = app();
    const agent = request.agent(server);
    const created = await signUp(agent, INBOX, "GradTracker Demo").expect(201);
    expect(created.body).toMatchObject({ canConnectInbox: true, scanned: false });

    await agent.post("/api/demo/scan").expect(200);
    expect((await agent.get("/api/auth/session").expect(200)).body.scanned).toBe(true);

    // Signing out and in again goes straight back to the same dashboard.
    await agent.post("/api/auth/signout").expect(200);
    await agent.post("/api/auth/signin").send({ email: INBOX, password: "correct-horse" }).expect(200);
    const jobs = (await agent.get("/api/jobs").expect(200)).body.jobs;
    expect(jobs.length).toBeGreaterThan(0);

    await agent.post("/api/demo/reset").expect(200);
    expect((await agent.get("/api/auth/session").expect(200)).body.scanned).toBe(false);
    expect((await agent.get("/api/jobs").expect(200)).body.jobs).toEqual([]);
  });

  it("keeps each account's dashboard to itself", async () => {
    const server = app();
    const demo = request.agent(server);
    await signUp(demo, INBOX).expect(201);
    await demo.post("/api/demo/scan").expect(200);

    const other = request.agent(server);
    await signUp(other, "jordan@student.monash.edu").expect(201);
    expect((await other.get("/api/jobs").expect(200)).body.jobs).toEqual([]);
    expect((await other.get("/api/review").expect(200)).body.items).toEqual([]);

    // Resetting one account leaves the other's dashboard alone.
    await other.post("/api/demo/reset").expect(200);
    expect((await demo.get("/api/jobs").expect(200)).body.jobs.length).toBeGreaterThan(0);
  });
});
