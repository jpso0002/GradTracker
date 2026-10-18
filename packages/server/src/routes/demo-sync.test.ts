import { describe, it, expect, beforeEach, afterEach, beforeAll } from "vitest";
import request from "supertest";
import type { UserId } from "@gradtracker/shared";
import { createTestDatabase, type DatabaseHandle } from "../db/client.js";
import { createRepository, type Repository } from "../db/repository.js";
import { createApp } from "../app.js";
import { buildSampleMessage, clearDemoDatabase, demoBackupEmails, rebaseSamples, resetDemoDatabase } from "../demo.js";
import { DEMO_SCRIPTS, DemoEmailClassifier, findScript, SAMPLE_CONFIDENCE } from "../adapters/index.js";
import { loadCorpus } from "../corpus/loader.js";
import { formatWallClock } from "../time/zoned-time.js";
import type { MailboxReader, RawEmail } from "../ports/index.js";
import type { DemoSession } from "./sync.js";

/**
 * The presentation demo (D36, D37), end to end: the opening scan of the sample
 * emails in the demo inbox, the emails a teammate sends, Reset — through the
 * real pipeline, with a stand-in for the inbox.
 */

const TODAY = new Date("2026-10-20T00:00:00Z");
const STARTED = new Date("2026-10-20T08:00:00Z");
const SENT = new Date("2026-10-20T09:05:00Z");

const corpus = loadCorpus();

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

/** The 80 samples as the inbox reader returns them: original dates, named by
 *  their Message-ID (D38). */
const samples = (): RawEmail[] =>
  corpus.map((f) => ({
    gmailMessageId: `${f.email.gmailMessageId}@gradtracker.demo`,
    gmailThreadId: `${f.email.gmailMessageId}-thread`,
    receivedAt: new Date(f.email.receivedAt),
    fromAddress: f.email.fromAddress,
    subject: f.email.subject,
    body: f.email.body,
  }));

function inboxOf(live: RawEmail[], loaded: RawEmail[] = samples()): MailboxReader {
  return {
    readSince: (since) => Promise.resolve(live.filter((e) => e.receivedAt > since)),
    readSamples: () => Promise.resolve(loaded),
  };
}

function sessionWith(inbox: MailboxReader | null, startedAt = STARTED): DemoSession {
  return {
    inbox,
    inboxAddress: "gradtrackerdemo@gmail.com",
    classifier: new DemoEmailClassifier(),
    startedAt,
    backupEmails: demoBackupEmails,
    rebaseSamples: (emails) => rebaseSamples(emails, TODAY),
    clear: async () => {
      await clearDemoDatabase(handle.db);
    },
    seed: async () => {
      await resetDemoDatabase(handle.db, TODAY);
    },
  };
}

const appWith = (inbox: MailboxReader | null, startedAt = STARTED) =>
  createApp({ db: handle.db, userId, demo: sessionWith(inbox, startedAt) });

async function find(company: string) {
  const all = [...(await repo.listJobs(userId, { status: "active" })), ...(await repo.listJobs(userId, { status: "archived" }))];
  return all.find((j) => j.company === company);
}

const BOTH = { emailsRead: 2, newApplications: 0, updatedApplications: 1, stageChanges: 1, needsReview: 1, ignored: 0 };
const NOTHING = { emailsRead: 0, newApplications: 0, updatedApplications: 0, stageChanges: 0, needsReview: 0, ignored: 0 };

describe("POST /api/demo/scan — the opening scan (D37)", () => {
  it("builds the dashboard from the sample emails in the inbox", async () => {
    const res = await request(appWith(inboxOf([]))).post("/api/demo/scan").expect(200);

    expect(res.body).toMatchObject({ source: "inbox", inbox: "gradtrackerdemo@gmail.com", notice: null, emailsRead: 80 });
    // The 25 non-applications are read and dropped — nothing stored.
    expect(res.body.ignored).toBe(25);

    const jobs = [...(await repo.listJobs(userId, { status: "active" })), ...(await repo.listJobs(userId, { status: "archived" }))];
    expect(jobs).toHaveLength(res.body.newApplications);
    expect(jobs.map((j) => j.company)).not.toContain("Boutique Consulting Co"); // nothing seeded
    expect((await repo.getSyncState(userId))?.emailsReadTotal).toBe(80);

    // The unsure samples wait for the student, as an unsure model's would.
    const review = await repo.listPendingReview(userId);
    expect(review).toHaveLength(res.body.needsReview);
    for (const id of Object.keys(SAMPLE_CONFIDENCE)) {
      const label = corpus.find((f) => f.email.id === id)!.expected;
      expect(review.some((r) => r.detectedCompany === label.company && r.confidence === SAMPLE_CONFIDENCE[id])).toBe(true);
    }

    // Accenture ends at assessment, ready for the live email.
    expect((await find("Accenture"))?.stage).toBe("assessment");
  });

  it("gives the client what it needs to open each email in the demo inbox (D38)", async () => {
    const app = appWith(inboxOf([]));
    await request(app).post("/api/demo/scan").expect(200);

    expect((await request(app).get("/api/me").expect(200)).body.mailbox).toBe("gradtrackerdemo@gmail.com");

    const review = (await request(app).get("/api/review").expect(200)).body.items;
    expect(review.find((i: { company: string }) => i.company === "Xero")?.gmailMessageId).toBe("fixture-039@gradtracker.demo");

    const accenture = await find("Accenture");
    const detail = (await request(app).get(`/api/jobs/${accenture!.id}`).expect(200)).body;
    const ids = detail.timeline.map((e: { gmailMessageId: string }) => e.gmailMessageId);
    expect(ids).toContain("fixture-032@gradtracker.demo");
  });

  it("brings the samples up to date: the newest arrived yesterday, deadlines moved with it", async () => {
    await request(appWith(inboxOf([]))).post("/api/demo/scan").expect(200);
    const jobs = [...(await repo.listJobs(userId, { status: "active" })), ...(await repo.listJobs(userId, { status: "archived" }))];
    const events = await Promise.all(jobs.map((j) => repo.listEventsForJob(userId, j.id)));
    const newest = Math.max(...events.flat().map((e) => e.receivedAt.getTime()));
    expect(formatWallClock(new Date(newest), "Australia/Melbourne").slice(0, 10)).toBe("2026-10-19");

    // A deadline keeps its time of day across the daylight-saving change.
    const offer = await find("Culture Amp");
    expect(formatWallClock(offer!.deadlineAt!, "Australia/Melbourne").slice(11)).toBe("23:59");
  });

  it("is the same dashboard however many times it runs", async () => {
    const app = appWith(inboxOf([]));
    const first = await request(app).post("/api/demo/scan").expect(200);
    const second = await request(app).post("/api/demo/scan").expect(200);
    expect(second.body).toEqual(first.body);
  });

  it("falls back to the seeded sample mailbox, and says why, when the inbox cannot be read", async () => {
    const broken: MailboxReader = {
      readSince: () => Promise.resolve([]),
      readSamples: () => Promise.reject(new Error("Could not sign in to the demo inbox x.")),
    };
    const res = await request(appWith(broken)).post("/api/demo/scan").expect(200);
    expect(res.body).toMatchObject({ source: "sample", emailsRead: 612, newApplications: 25, needsReview: 4 });
    expect(res.body.notice).toContain("Could not sign in");
  });

  it("falls back, and says how to fix it, when no samples were loaded", async () => {
    const res = await request(appWith(inboxOf([], []))).post("/api/demo/scan").expect(200);
    expect(res.body.source).toBe("sample");
    expect(res.body.notice).toContain("npm run demo:load-inbox");
  });

  it("uses the sample mailbox without a demo inbox, without complaint", async () => {
    const res = await request(appWith(null)).post("/api/demo/scan").expect(200);
    expect(res.body).toMatchObject({ source: "sample", notice: null, newApplications: 25 });
  });
});

describe("POST /api/sync — Refresh in the demo (D36)", () => {
  it("moves Accenture to interview and sends the unclear email to review", async () => {
    const app = appWith(inboxOf([sent("accenture-interview"), sent("kestrel-ambiguous", new Date(SENT.getTime() + 60_000))]));
    expect((await find("Accenture"))?.stage).toBe("applied");

    const res = await request(app).post("/api/sync").expect(200);
    expect(res.body).toEqual(BOTH);

    const job = await find("Accenture");
    expect(job?.stage).toBe("interview");
    expect(job?.nextAction).toBe("Book interview time");
    // "within 3 days" of 20 October in Melbourne: 23:59 on the 23rd (AEDT).
    expect(job?.deadlineAt?.toISOString()).toBe("2026-10-23T12:59:00.000Z");

    const review = await repo.listPendingReview(userId);
    expect(review).toHaveLength(5);
    expect(review.some((r) => r.detectedCompany === "Kestrel Partners")).toBe(true);
    expect((await repo.getSyncState(userId))?.emailsReadTotal).toBe(614);
  });

  it("after the opening scan, adds only what was sent afterwards", async () => {
    const app = appWith(inboxOf([sent("accenture-interview", new Date(Date.now() + 60_000))]), new Date(0));
    await request(app).post("/api/demo/scan").expect(200);

    const res = await request(app).post("/api/sync").expect(200);
    expect(res.body).toMatchObject({ emailsRead: 1, updatedApplications: 1, stageChanges: 1 });
    expect((await find("Accenture"))?.stage).toBe("interview");
  });

  it("changes nothing on a second press", async () => {
    const app = appWith(inboxOf([sent("accenture-interview")]));
    await request(app).post("/api/sync").expect(200);
    const res = await request(app).post("/api/sync").expect(200);
    expect(res.body).toEqual(NOTHING);
  });

  it("ignores mail that arrived before the demo started", async () => {
    const app = appWith(inboxOf([sent("accenture-interview", new Date(STARTED.getTime() - 60_000))]));
    const res = await request(app).post("/api/sync").expect(200);
    expect(res.body).toEqual(NOTHING);
  });

  it("sends an email it has no script for to review instead of guessing", async () => {
    const stray: RawEmail = { ...sent("accenture-interview"), gmailMessageId: "imap-stray", subject: "lunch?", body: "pizza" };
    const res = await request(appWith(inboxOf([stray]))).post("/api/sync").expect(200);
    expect(res.body).toMatchObject({ emailsRead: 1, needsReview: 1, updatedApplications: 0 });
  });

  it("says how to fix a missing inbox rather than pretending", async () => {
    const res = await request(appWith(null)).post("/api/sync").expect(503);
    expect(res.body.error).toContain("GMAIL_DEMO_APP_PASSWORD");
  });

  it("reports a failed sign-in and changes nothing", async () => {
    const broken: MailboxReader = {
      readSince: () => Promise.reject(new Error("Could not sign in to the demo inbox x.")),
      readSamples: () => Promise.resolve([]),
    };
    const res = await request(appWith(broken)).post("/api/sync").expect(502);
    expect(res.body.error).toContain("Could not sign in");
    expect((await find("Accenture"))?.stage).toBe("applied");
  });
});

describe("POST /api/sync/backup", () => {
  it("shows the room what a live Refresh would have, once", async () => {
    const app = appWith(null);
    const first = await request(app).post("/api/sync/backup").expect(200);
    expect(first.body).toEqual(BOTH);
    expect((await find("Accenture"))?.stage).toBe("interview");

    const second = await request(app).post("/api/sync/backup").expect(200);
    expect(second.body).toEqual(NOTHING);
  });

  it("does not exist outside the demo", async () => {
    await request(createApp({ db: handle.db, userId })).post("/api/sync/backup").expect(404);
  });
});

describe("POST /api/demo/reset", () => {
  it("empties the dashboard for the scan when there is an inbox, for the same student", async () => {
    // Sent during the run before the reset.
    const app = appWith(inboxOf([sent("accenture-interview", new Date(Date.now() - 60_000))]), new Date(0));
    await repo.updateSettings(userId, { reviewThreshold: 0.9 });

    await request(app).post("/api/demo/reset").expect(200);

    const me = await request(app).get("/api/me").expect(200);
    expect(me.body.reviewThreshold).toBe(0.75);
    expect(await repo.listJobs(userId)).toHaveLength(0);

    // The scan fills it again, and the email sent before the reset stays out.
    await request(app).post("/api/demo/scan").expect(200);
    expect((await find("Accenture"))?.stage).toBe("assessment");
    expect((await request(app).post("/api/sync").expect(200)).body).toEqual(NOTHING);
  });

  it("puts the seeded mailbox back when there is no inbox", async () => {
    const app = appWith(null);
    await request(app).post("/api/sync/backup").expect(200);
    await request(app).post("/api/demo/reset").expect(200);
    expect((await find("Accenture"))?.stage).toBe("applied");
    expect(await repo.listPendingReview(userId)).toHaveLength(4);
  });

  it("does not exist outside the demo", async () => {
    await request(createApp({ db: handle.db, userId })).post("/api/demo/reset").expect(404);
  });
});

describe("the demo's classifier", () => {
  it("recognises a script through a forwarded subject", () => {
    expect(findScript(`Fwd: ${DEMO_SCRIPTS[0]!.subject}`)?.id).toBe("accenture-interview");
    expect(findScript("Re: something else")).toBeUndefined();
  });

  it("never stores the email it read", async () => {
    await request(appWith(inboxOf([sent("accenture-interview")]))).post("/api/sync").expect(200);
    const job = await find("Accenture");
    const stored = JSON.stringify(await repo.listEventsForJob(userId, job!.id));
    expect(stored).not.toContain("Book your interview");
    expect(stored).not.toContain(DEMO_SCRIPTS[0]!.subject);
    expect(stored).not.toContain("teammate@gmail.com");
  });
});

describe("a sample email as loaded into the inbox (D37)", () => {
  const fixture = corpus.find((f) => f.email.id === "001-deloitte-oa-invite")!;
  const { raw, receivedAt } = buildSampleMessage(fixture, "gradtrackerdemo@gmail.com");

  it("keeps its own sender and date, and is marked as a sample", () => {
    expect(raw).toContain("From: no-reply@greenhouse.io\r\n");
    expect(raw).toContain("To: gradtrackerdemo@gmail.com\r\n");
    expect(raw).toContain("Message-ID: <fixture-001@gradtracker.demo>\r\n");
    expect(receivedAt.toISOString()).toBe(new Date(fixture.email.receivedAt).toISOString());
  });

  it("encodes a non-ASCII subject and the body so any server accepts them", () => {
    const subject = /Subject: =\?UTF-8\?B\?([^?]+)\?=/.exec(raw)![1]!;
    expect(Buffer.from(subject, "base64").toString("utf8")).toBe(fixture.email.subject);
    const body = raw.split("\r\n\r\n")[1]!.replace(/\r\n/g, "");
    expect(Buffer.from(body, "base64").toString("utf8").replace(/\r\n/g, "\n")).toBe(fixture.email.body);
  });
});
