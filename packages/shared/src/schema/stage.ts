import { z } from "zod";

/**
 * The six application stages — decision D10, resolved 16 August 2026.
 *
 * These match `StageBadge` in the design system exactly, which is the single
 * source of stage colour. The brief's other two values ("Deadline Approaching",
 * "Follow-up Required") are NOT stages: they are properties of today's date
 * rather than of an email, and are computed at render time so they cannot go
 * stale. See rules.md → Business Logic.
 */
export const StageEnum = z.enum([
  "applied",
  "assessment",
  "interview",
  "offer",
  "rejected",
  "withdrawn",
]);

export type Stage = z.infer<typeof StageEnum>;

/**
 * Progression rank. A new stage is applied only if its rank exceeds the
 * current rank — a confirmation email arriving after an interview invite must
 * not regress the job.
 *
 * Terminal stages carry rank 0: they are never reached by progression, only by
 * the explicit rules below.
 */
export const STAGE_RANK: Readonly<Record<Stage, number>> = Object.freeze({
  applied: 1,
  assessment: 2,
  interview: 3,
  offer: 4,
  rejected: 0,
  withdrawn: 0,
});

/** Stages a job cannot progress out of. */
export const TERMINAL_STAGES: ReadonlySet<Stage> = new Set<Stage>([
  "rejected",
  "withdrawn",
]);

/**
 * Stages that may arrive from ANY current stage and always apply. A rejection
 * can land before the confirmation email; an offer can skip the queue.
 */
export const ALWAYS_APPLIES: ReadonlySet<Stage> = new Set<Stage>([
  "rejected",
  "offer",
]);

/** Never AI-assigned. Set only by explicit user action. */
export const USER_ONLY_STAGES: ReadonlySet<Stage> = new Set<Stage>(["withdrawn"]);

/**
 * Days without a new event before a job is flagged "follow-up required".
 * Terminal stages never go stale — there is nothing left to follow up.
 */
export const STALENESS_THRESHOLD_DAYS: Readonly<Record<Stage, number | null>> =
  Object.freeze({
    applied: 14,
    assessment: 5,
    interview: 7,
    offer: 3,
    rejected: null,
    withdrawn: null,
  });

/**
 * Urgency buckets for pipeline ranking, lowest = most urgent. Ranking is
 * lexicographic: bucket → stage rank desc → last_event_at asc → company A–Z.
 *
 * A follow-up-required job is capped at FAR (3) so staleness cannot hide
 * beneath far-future deadlines.
 */
export const URGENCY_BUCKET = Object.freeze({
  OVERDUE: 0,
  IMMINENT: 1, // <= 2 days
  SOON: 2, // 3–7 days
  FAR: 3, // 8–14 days
  NONE: 4, // no deadline, or > 14 days
} as const);

export type UrgencyBucket = (typeof URGENCY_BUCKET)[keyof typeof URGENCY_BUCKET];

/** Upper day bounds for each bucket. Consumed by the ranking function (T3.7). */
export const URGENCY_BOUNDS = Object.freeze({
  IMMINENT_MAX_DAYS: 2,
  SOON_MAX_DAYS: 7,
  FAR_MAX_DAYS: 14,
});

/**
 * Which urgency bucket a job falls into. Pure — the caller supplies `daysLeft`
 * already computed against the user's timezone, so this never reads a clock.
 *
 * A follow-up-required job is capped at FAR rather than NONE: staleness must
 * not be buried beneath jobs with far-future deadlines.
 *
 * The full ranking comparator (T3.7) is built on top of this.
 */
export function urgencyBucket(
  daysLeft: number | null,
  followUpRequired = false,
): UrgencyBucket {
  if (daysLeft === null) {
    return followUpRequired ? URGENCY_BUCKET.FAR : URGENCY_BUCKET.NONE;
  }
  if (daysLeft < 0) return URGENCY_BUCKET.OVERDUE;
  if (daysLeft <= URGENCY_BOUNDS.IMMINENT_MAX_DAYS) return URGENCY_BUCKET.IMMINENT;
  if (daysLeft <= URGENCY_BOUNDS.SOON_MAX_DAYS) return URGENCY_BUCKET.SOON;
  if (daysLeft <= URGENCY_BOUNDS.FAR_MAX_DAYS) return URGENCY_BUCKET.FAR;
  return followUpRequired ? URGENCY_BUCKET.FAR : URGENCY_BUCKET.NONE;
}

/**
 * A user's id, branded so an arbitrary string cannot be passed where scoping
 * is required. Every repository method takes one as its first argument; the
 * brand means forgetting to scope a query is a compile error rather than a
 * cross-user data leak (rules.md → Business Logic → Access control).
 */
export type UserId = string & { readonly __brand: "UserId" };

/** Widen a string into a UserId. Call this only where the id has genuinely
 *  been authenticated — the session middleware, migrations, seeds and tests. */
export const asUserId = (id: string): UserId => id as UserId;
