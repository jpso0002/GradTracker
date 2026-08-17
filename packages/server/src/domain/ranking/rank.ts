import {
  STAGE_RANK,
  TERMINAL_STAGES,
  urgencyBucket,
  type Stage,
  type UrgencyBucket,
} from "@gradtracker/shared";
import { isFollowUpRequired } from "../stages/engine.js";

/**
 * Pipeline ranking (T3.7) — the pure function behind SM-4.
 *
 * "A student with 20+ active applications can identify their most urgent item
 * within one screen and no searching" reduces entirely to this comparator being
 * right. No I/O, so it is exhaustively testable against fixture pipelines with
 * known correct orderings.
 *
 * @see implementation.md §7.9
 */

export interface RankableJob {
  id: string;
  company: string;
  stage: Stage;
  deadlineAt: Date | null;
  lastEventAt: Date;
}

export interface RankedJob<T extends RankableJob = RankableJob> {
  job: T;
  /** Whole days until the deadline in the student's timezone. Negative when
   *  overdue, null when there is no deadline. */
  daysLeft: number | null;
  followUpRequired: boolean;
  bucket: UrgencyBucket;
}

/**
 * Whole calendar days between two instants **in a given timezone** — defect C2.
 *
 * Not `(deadline - now) / 86400000`, which measures elapsed time rather than
 * calendar days: at 11pm on Thursday a Friday 9am deadline is 0.4 elapsed days
 * away but is *tomorrow*, and a student reading "0 days" for something due
 * tomorrow is being told the wrong thing.
 *
 * The timezone comes from the client and the server ranks with it, so ranking
 * and display can never disagree about which day it is.
 */
export function daysUntil(deadline: Date, now: Date, timeZone: string): number {
  const startOfDay = (date: Date): number => {
    // en-CA gives ISO-ordered YYYY-MM-DD, which parses back as a UTC midnight.
    const local = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
    return Date.parse(`${local}T00:00:00Z`);
  };

  return Math.round((startOfDay(deadline) - startOfDay(now)) / 86_400_000);
}

/** Attaches the computed fields a job needs before it can be ordered. */
export function score<T extends RankableJob>(job: T, now: Date, timeZone: string): RankedJob<T> {
  const daysLeft = job.deadlineAt === null ? null : daysUntil(job.deadlineAt, now, timeZone);
  const followUpRequired = isFollowUpRequired(job.stage, job.lastEventAt, now);

  return {
    job,
    daysLeft,
    followUpRequired,
    bucket: urgencyBucket(daysLeft, followUpRequired),
  };
}

/**
 * The comparator. Lexicographic, in the order the brief specifies:
 *
 *   1. urgency bucket ascending  — overdue first
 *   2. stage rank descending     — an offer outranks an application
 *   3. lastEventAt ascending     — stalest first
 *   4. company A–Z               — a stable, reproducible tiebreak
 *
 * The fourth key exists so the same pipeline always renders in the same order.
 * Without it, two jobs identical on the first three keys would swap places
 * between requests, which reads as a bug and destroys trust in the ordering.
 */
export function compareRanked(a: RankedJob, b: RankedJob): number {
  if (a.bucket !== b.bucket) return a.bucket - b.bucket;

  const stageDelta = STAGE_RANK[b.job.stage] - STAGE_RANK[a.job.stage];
  if (stageDelta !== 0) return stageDelta;

  const staleness = a.job.lastEventAt.getTime() - b.job.lastEventAt.getTime();
  if (staleness !== 0) return staleness;

  return a.job.company.localeCompare(b.job.company);
}

export interface RankOptions {
  now: Date;
  /** IANA timezone from the client. */
  timeZone: string;
  /** Terminal jobs are excluded by default — the Active tab. */
  includeTerminal?: boolean;
}

/** Ranks a pipeline. Input order never affects output. */
export function rankJobs<T extends RankableJob>(jobs: T[], options: RankOptions): RankedJob<T>[] {
  const visible = options.includeTerminal
    ? jobs
    : jobs.filter((job) => !TERMINAL_STAGES.has(job.stage));

  return visible.map((job) => score(job, options.now, options.timeZone)).sort(compareRanked);
}

/** The four counts in the dashboard stat strip. */
export function pipelineStats(
  ranked: RankedJob[],
  counts: { needsReview: number; emailsRead: number },
) {
  return {
    liveApplications: ranked.length,
    dueThisWeek: ranked.filter((r) => r.daysLeft !== null && r.daysLeft >= 0 && r.daysLeft <= 7)
      .length,
    needsReview: counts.needsReview,
    emailsRead: counts.emailsRead,
  };
}
