import { randomUUID } from "node:crypto";
import type { Stage, ClassifierModel } from "@gradtracker/shared";
import { asUserId, type UserId } from "@gradtracker/shared";
import type { Database } from "./client.js";
import { createIdentityRepository, createRepository } from "./repository.js";

/**
 * Seed data — a pipeline that exercises every ranking bucket and every stage
 * colour, so the dashboard can be built and judged against something that
 * looks like a real inbox rather than three rows of Lorem Ipsum.
 *
 * Deadlines are expressed as **offsets from a supplied "today"**, never as
 * fixed dates. A seed with hardcoded dates silently stops covering the overdue
 * and imminent buckets the week after it is written, which is exactly when
 * someone would be relying on it to check the ranking.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const days = (from: Date, n: number) => new Date(from.getTime() + n * DAY_MS);

export interface SeedSpec {
  company: string;
  role: string;
  stage: Stage;
  /** Days from "today". Negative = overdue. Null = no deadline. */
  deadlineInDays: number | null;
  /** Days since the last email arrived — drives the staleness flag. */
  lastEventDaysAgo: number;
  nextAction: string | null;
  senderDomain: string | null;
  confidence: number;
  /** Fields the student has corrected. These must survive a later sync. */
  humanVerified?: ("company" | "role" | "stage" | "deadline_at" | "next_action")[];
  archived?: boolean;
}

/**
 * 25 applications. Bucket coverage is asserted by seed.test.ts rather than
 * trusted — it is easy to edit this list and quietly lose a bucket.
 */
export const SEED_JOBS: SeedSpec[] = [
  // ── Overdue (bucket 0) — the most urgent thing the product can show ──────
  { company: "Deloitte", role: "Audit Graduate Program", stage: "assessment", deadlineInDays: -2, lastEventDaysAgo: 6, nextAction: "Complete online assessment", senderDomain: "greenhouse.io", confidence: 0.94 },
  { company: "Atlassian", role: "Graduate Software Engineer", stage: "assessment", deadlineInDays: -1, lastEventDaysAgo: 4, nextAction: "Finish coding challenge", senderDomain: "lever.co", confidence: 0.91 },

  // ── Imminent, ≤2 days (bucket 1) ─────────────────────────────────────────
  { company: "Canva", role: "Product Design Intern", stage: "interview", deadlineInDays: 1, lastEventDaysAgo: 1, nextAction: "Confirm Thursday 14:00 slot", senderDomain: "canva.com", confidence: 0.96 },
  { company: "KPMG", role: "Consulting Graduate", stage: "assessment", deadlineInDays: 2, lastEventDaysAgo: 3, nextAction: "Complete numerical test", senderDomain: "workday.com", confidence: 0.88 },
  { company: "Commonwealth Bank", role: "Technology Graduate", stage: "interview", deadlineInDays: 2, lastEventDaysAgo: 2, nextAction: "Book assessment centre", senderDomain: "smartrecruiters.com", confidence: 0.93 },

  // ── Soon, 3–7 days (bucket 2) ────────────────────────────────────────────
  { company: "PwC", role: "Assurance Graduate", stage: "assessment", deadlineInDays: 4, lastEventDaysAgo: 2, nextAction: "Complete online assessment", senderDomain: "workday.com", confidence: 0.9 },
  { company: "Macquarie Group", role: "Analyst Program", stage: "interview", deadlineInDays: 5, lastEventDaysAgo: 1, nextAction: "Prepare for panel interview", senderDomain: "macquarie.com", confidence: 0.87 },
  { company: "REA Group", role: "Graduate Data Analyst", stage: "assessment", deadlineInDays: 7, lastEventDaysAgo: 5, nextAction: "Submit take-home task", senderDomain: "greenhouse.io", confidence: 0.82 },

  // ── Far, 8–14 days (bucket 3) ────────────────────────────────────────────
  { company: "EY", role: "Technology Consulting Graduate", stage: "interview", deadlineInDays: 9, lastEventDaysAgo: 3, nextAction: "Confirm interview time", senderDomain: "ey.com", confidence: 0.85 },
  { company: "Telstra", role: "Graduate Engineer", stage: "assessment", deadlineInDays: 12, lastEventDaysAgo: 8, nextAction: "Complete video interview", senderDomain: "workday.com", confidence: 0.79 },

  // ── No deadline or far future (bucket 4) ─────────────────────────────────
  { company: "Google", role: "Software Engineer, University Graduate", stage: "applied", deadlineInDays: null, lastEventDaysAgo: 3, nextAction: "Wait for response", senderDomain: "google.com", confidence: 0.95 },
  { company: "Optiver", role: "Graduate Trader", stage: "applied", deadlineInDays: null, lastEventDaysAgo: 5, nextAction: "Wait for response", senderDomain: "optiver.com", confidence: 0.89 },
  { company: "Woolworths Group", role: "Retail Leadership Graduate", stage: "applied", deadlineInDays: 30, lastEventDaysAgo: 2, nextAction: "Wait for response", senderDomain: "workday.com", confidence: 0.84 },
  { company: "NAB", role: "Graduate Program, Technology", stage: "applied", deadlineInDays: null, lastEventDaysAgo: 1, nextAction: "Wait for response", senderDomain: "nab.com.au", confidence: 0.86 },

  // ── Stale — no deadline, but past the staleness threshold ────────────────
  // These must be capped at bucket 3, not sink to bucket 4 where a student
  // would never scroll to them.
  { company: "ANZ", role: "Graduate Analyst", stage: "applied", deadlineInDays: null, lastEventDaysAgo: 21, nextAction: "Follow up — no reply in 21 days", senderDomain: "anz.com", confidence: 0.81 },
  { company: "Xero", role: "Graduate Developer", stage: "applied", deadlineInDays: null, lastEventDaysAgo: 17, nextAction: "Follow up — no reply in 17 days", senderDomain: "lever.co", confidence: 0.83 },
  { company: "SEEK", role: "Associate Product Manager", stage: "interview", deadlineInDays: null, lastEventDaysAgo: 11, nextAction: "Follow up on interview outcome", senderDomain: "seek.com.au", confidence: 0.88 },

  // ── Offers — highest stage rank ──────────────────────────────────────────
  { company: "Culture Amp", role: "Graduate Engineer", stage: "offer", deadlineInDays: 6, lastEventDaysAgo: 1, nextAction: "Respond to offer", senderDomain: "cultureamp.com", confidence: 0.97 },
  { company: "Zip Co", role: "Graduate Data Scientist", stage: "offer", deadlineInDays: 10, lastEventDaysAgo: 4, nextAction: "Respond to offer", senderDomain: "zip.co", confidence: 0.92 },

  // ── Corrected by the student — must survive the next sync (SM-7) ─────────
  { company: "Deloitte Digital", role: "Technology Analyst", stage: "interview", deadlineInDays: 3, lastEventDaysAgo: 2, nextAction: "Confirm Tuesday 10:00 slot", senderDomain: "greenhouse.io", confidence: 0.58, humanVerified: ["company", "role"] },
  { company: "IBM", role: "Graduate Consultant", stage: "assessment", deadlineInDays: 8, lastEventDaysAgo: 6, nextAction: "Complete cognitive assessment", senderDomain: "ibm.com", confidence: 0.61, humanVerified: ["deadline_at"] },
  { company: "Accenture", role: "Technology Graduate", stage: "applied", deadlineInDays: null, lastEventDaysAgo: 9, nextAction: "Wait for response", senderDomain: "accenture.com", confidence: 0.64, humanVerified: ["next_action", "stage"] },

  // ── Terminal — excluded from the Active tab, still needed for the badges ─
  { company: "Amazon", role: "SDE Intern", stage: "rejected", deadlineInDays: null, lastEventDaysAgo: 14, nextAction: null, senderDomain: "amazon.com", confidence: 0.98, archived: true },
  { company: "Bain & Company", role: "Associate Consultant Intern", stage: "rejected", deadlineInDays: null, lastEventDaysAgo: 30, nextAction: null, senderDomain: "bain.com", confidence: 0.96, archived: true },
  { company: "Qantas", role: "Graduate Program", stage: "withdrawn", deadlineInDays: null, lastEventDaysAgo: 25, nextAction: null, senderDomain: "qantas.com.au", confidence: 0.9, archived: true },
];

/** Low-confidence detections awaiting review — they have no job yet. */
export const SEED_REVIEW_ITEMS = [
  { company: "Boutique Consulting Co", stage: "interview" as Stage, senderDomain: "boutique-consult.com.au", confidence: 0.41, daysAgo: 1 },
  { company: "Nine Entertainment", stage: "applied" as Stage, senderDomain: "nine.com.au", confidence: 0.52, daysAgo: 2 },
  { company: "Grok Academy", stage: "assessment" as Stage, senderDomain: "grokacademy.org", confidence: 0.48, daysAgo: 3 },
  { company: "Unknown Sender", stage: "applied" as Stage, senderDomain: "mail.startup.io", confidence: 0.38, daysAgo: 5 },
];

export function normaliseCompany(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(pty|ltd|limited|inc|llc|group|australia|co)\b/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export interface SeedResult {
  userId: UserId;
  jobsCreated: number;
  reviewItemsCreated: number;
}

/** `today` is injectable so tests get deterministic offsets. */
export async function seed(db: Database, today: Date = new Date()): Promise<SeedResult> {
  const identity = createIdentityRepository(db);
  const repo = createRepository(db);

  const existing = await identity.findByGoogleSub("seed-student");
  const user =
    existing ??
    (await identity.createUser({
      googleSub: "seed-student",
      email: "student@student.monash.edu",
      displayName: "Sam Nguyen",
      // Placeholder ciphertext. The seed never touches Gmail, and the columns
      // are NOT NULL because a real user always has an encrypted token.
      refreshTokenCiphertext: "seed-not-a-real-token",
      refreshTokenIv: "seed-iv",
      refreshTokenTag: "seed-tag",
    }));

  const userId = asUserId(user!.id);

  for (const spec of SEED_JOBS) {
    const lastEventAt = days(today, -spec.lastEventDaysAgo);
    const job = await repo.insertJob(userId, {
      company: spec.company,
      companyNormalised: normaliseCompany(spec.company),
      role: spec.role,
      stage: spec.stage,
      deadlineAt: spec.deadlineInDays === null ? null : days(today, spec.deadlineInDays),
      nextAction: spec.nextAction,
      senderDomain: spec.senderDomain,
      confidence: spec.confidence,
      firstSeenAt: days(today, -(spec.lastEventDaysAgo + 14)),
      lastEventAt,
    });
    if (!job) continue;

    if (spec.archived) {
      await repo.updateJob(userId, job.id, { status: "archived" });
    }

    const human = new Set(spec.humanVerified ?? []);
    for (const field of ["company", "role", "stage", "deadline_at", "next_action"] as const) {
      const isHuman = human.has(field);
      await repo.setProvenance(
        userId,
        job.id,
        field,
        isHuman ? "human" : "ai",
        isHuman ? null : spec.confidence,
      );
    }

    await repo.insertEmailEvent(userId, {
      jobId: job.id,
      gmailMessageId: `seed-${randomUUID()}`,
      gmailThreadId: `seed-thread-${randomUUID()}`,
      receivedAt: lastEventAt,
      senderDomain: spec.senderDomain,
      detectedStage: spec.stage,
      detectedDeadlineAt: spec.deadlineInDays === null ? null : days(today, spec.deadlineInDays),
      detectedNextAction: spec.nextAction,
      confidence: spec.confidence,
      reviewStatus: "auto_accepted",
      classifierModel: "fake" satisfies ClassifierModel,
    });
  }

  for (const item of SEED_REVIEW_ITEMS) {
    await repo.insertEmailEvent(userId, {
      jobId: null,
      gmailMessageId: `seed-review-${randomUUID()}`,
      gmailThreadId: `seed-review-thread-${randomUUID()}`,
      receivedAt: days(today, -item.daysAgo),
      senderDomain: item.senderDomain,
      detectedStage: item.stage,
      detectedNextAction: null,
      confidence: item.confidence,
      reviewStatus: "pending",
      classifierModel: "fake",
    });
  }

  await repo.upsertSyncState(userId, {
    historyId: "seed-history-id",
    state: "idle",
    emailsReadTotal: 612,
    lastFullScanAt: days(today, -1),
  });

  return {
    userId,
    jobsCreated: SEED_JOBS.length,
    reviewItemsCreated: SEED_REVIEW_ITEMS.length,
  };
}
