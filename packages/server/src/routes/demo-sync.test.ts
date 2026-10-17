import { describe, it, expect, beforeEach, afterEach, beforeAll } from "vitest";
import request from "supertest";
import type { UserId } from "@gradtracker/shared";
import { createTestDatabase, type DatabaseHandle } from "../db/client.js";
import { createRepository, type Repository } from "../db/repository.js";
import { createApp } from "../app.js";
import { demoBackupEmails, resetDemoDatabase } from "../demo.js";
import { DEMO_SCRIPTS, ScriptedEmailClassifier, findScript } from "../adapters/index.js";
import type { MailboxReader, RawEmail } from "../ports/index.js";
import type { DemoSyncOptions } from "./sync.js";

/**
 * The presentation's Refresh (D36), end to end over the seeded demo mailbox:
 * the emails a teammate sends, read from a stand-in inbox, through the real
 * pipeline.
 */

const TODAY = new Date("2026-10-20T00:00:00Z");
const STARTED = new Date("2026-10-20T08:00:00Z");
const SENT = new Date("2026-10-20T09:05:00Z");

let handle: DatabaseHandle;
let repo: Repository;
let userId: UserId;

beforeAll(() => {
  process.env["ALLOW_UNAUTHENTICATED"] = "1";
});

beforeEach(async () => {
  handle = createTestDatabase();
  ({ userId } = await resetDemoDatabase(handle.db, TODAY));
  repo = createRepository(handle.db);
});

afterEach(() => handle.close());

/** What a teammate's phone would put in the demo inbox. */
function sent(scriptId: string, receivedAt = SENT, i = 0): RawEmail {
  const script = DEMO_SCRIPTS.find((s) => s.id === scriptId)!;
  return {
    gmailMessageId: `imap-${scriptId}-${i}`,
    gmailThreadId: `imap-${scriptId}`,
    receivedAt,
    fromAddress: "teammate@gmail.com",
    subject: script.subject,
    body: script.body,
  };
}

function inboxOf(emails: RawEmail[]): MailboxReader {
  return { readSince: (since) => Promise.resolve(emails.filter((e) => e.receivedAt > since)) };
}

function appWith(inbox: MailboxReader | null) {
  const demoSync: DemoSyncOptions = {
    inbox,
    classifier: new ScriptedEmailClassifier(),
    startedAt: () => STARTED,
    ownAddress: "gradtracker.demo@gmail.com",
    backupEmails: demoBackupEmails,
  };
  return createApp({ db: handle.db, userId, demoSync });
}

async function deloitte() {
  const jobs = await repo.listJobs(userId);
  return jobs.find((j) => j.company === "Deloitte" && j.role === "Audit Graduate Program")!;
}

const BOTH = { emailsRead: 2, newApplications: 0, updatedApplications: 1, stageChanges: 1, needsReview: 1, ignored: 0 };
const NOTHING = { emailsRead: 0, newApplications: 0, updatedApplications: 0, stageChanges: 0, needsReview: 0, ignored: 0 };

describe("POST /api/sync in the demo", () => {
  it("moves Deloitte to interview and sends the unclear email to review", async () => {
    const app = appWith(inboxOf([sent("deloitte-interview"), sent("kestrel-ambiguous", new Date(SENT.getTime() + 60_000))]));
    expect((await deloitte()).stage).toBe("assessment");

    const res = await request(app).post("/api/sync").expect(200);
    expect(res.body).toEqual(BOTH);

    const job = await deloitte();
    expect(job.stage).toBe("interview");
    expect(job.nextAction).toBe("Book interview time");
    // "within 3 days" of 20 October in Melbourne: 23:59 on the 23rd (AEDT).
    expect(job.deadlineAt?.toISOString()).toBe("2026-10-23T12:59:00.000Z");

    const review = await repo.listPendingReview(userId);
    expect(review).toHaveLength(5);
    expect(review.some((r) => r.detectedCompany === "Kestrel Partners")).toBe(true);

    expect((await repo.getSyncState(userId))?.emailsReadTotal).toBe(614);
  });

  it("changes nothing on a second press", async () => {
    const app = appWith(inboxOf([sent("deloitte-interview")]));
    await request(app).post("/api/sync").expect(200);
    const res = await request(app).post("/api/sync").expect(200);
    expect(res.body).toEqual(NOTHING);
  });

  it("ignores mail that arrived before the demo started", async () => {
    const app = appWith(inboxOf([sent("deloitte-interview", new Date(STARTED.getTime() - 60_000))]));
    const res = await request(app).post("/api/sync").expect(200);
    expect(res.body).toEqual(NOTHING);
    expect((await deloitte()).stage).toBe("assessment");
  });

  it("sends an email it has no script for to review instead of guessing", async () => {
    const stray: RawEmail = { ...sent("deloitte-interview"), gmailMessageId: "imap-stray", subject: "lunch?", body: "pizza" };
    const res = await request(appWith(inboxOf([stray]))).post("/api/sync").expect(200);
    expect(res.body).toMatchObject({ emailsRead: 1, needsReview: 1, updatedApplications: 0 });
    expect((await deloitte()).stage).toBe("assessment");
  });

  it("says how to fix a missing inbox rather than pretending", async () => {
    const res = await request(appWith(null)).post("/api/sync").expect(503);
    expect(res.body.error).toContain("GMAIL_DEMO_APP_PASSWORD");
  });

  it("reports a failed sign-in and changes nothing", async () => {
    const broken: MailboxReader = { readSince: () => Promise.reject(new Error("Could not sign in to the demo inbox x.")) };
    const res = await request(appWith(broken)).post("/api/sync").expect(502);
    expect(res.body.error).toContain("Could not sign in");
    expect((await deloitte()).stage).toBe("assessment");
  });
});

describe("POST /api/sync/backup", () => {
  it("shows the room what a live Refresh would have, once", async () => {
    const app = appWith(null);
    const first = await request(app).post("/api/sync/backup").expect(200);
    expect(first.body).toEqual(BOTH);
    expect((await deloitte()).stage).toBe("interview");

    const second = await request(app).post("/api/sync/backup").expect(200);
    expect(second.body).toEqual(NOTHING);
  });

  it("does not exist outside the demo", async () => {
    await request(createApp({ db: handle.db, userId })).post("/api/sync/backup").expect(404);
  });
});

describe("the scripted classifier", () => {
  it("recognises a script through a forwarded subject", () => {
    expect(findScript(`Fwd: ${DEMO_SCRIPTS[0]!.subject}`)?.id).toBe("deloitte-interview");
    expect(findScript("Re: something else")).toBeUndefined();
  });

  it("never stores the email it read", async () => {
    await request(appWith(inboxOf([sent("deloitte-interview")]))).post("/api/sync").expect(200);
    const job = await deloitte();
    const events = await repo.listEventsForJob(userId, job.id);
    const stored = JSON.stringify(events);
    expect(stored).not.toContain("Book your interview");
    expect(stored).not.toContain(DEMO_SCRIPTS[0]!.subject);
    expect(stored).not.toContain("teammate@gmail.com");
  });
});

describe("POST /api/demo/reset", () => {
  it("puts the sample mailbox back for the same student, and only new mail counts", async () => {
    let since = STARTED;
    const inbox = inboxOf([sent("deloitte-interview")]);
    const app = createApp({
      db: handle.db,
      demoSync: {
        inbox,
        classifier: new ScriptedEmailClassifier(),
        startedAt: () => since,
        ownAddress: null,
        backupEmails: demoBackupEmails,
      },
      demoReset: async () => {
        await resetDemoDatabase(handle.db, TODAY);
        since = new Date(SENT.getTime() + 1);
      },
    });

    await request(app).post("/api/sync").expect(200);
    await repo.updateSettings(userId, { reviewThreshold: 0.9 });
    expect((await deloitte()).stage).toBe("interview");

    await request(app).post("/api/demo/reset").expect(200);

    // The server's remembered student is still the student.
    const me = await request(app).get("/api/me").expect(200);
    expect(me.body.reviewThreshold).toBe(0.75);
    const jobs = await request(app).get("/api/jobs").expect(200);
    expect(jobs.body.jobs.length).toBeGreaterThan(0);
    expect((await deloitte()).stage).toBe("assessment");
    expect(await repo.listPendingReview(userId)).toHaveLength(4);

    // The email shown before the reset is not brought back.
    const again = await request(app).post("/api/sync").expect(200);
    expect(again.body).toEqual(NOTHING);
  });

  it("does not exist outside the demo", async () => {
    await request(createApp({ db: handle.db, userId })).post("/api/demo/reset").expect(404);
  });
});
