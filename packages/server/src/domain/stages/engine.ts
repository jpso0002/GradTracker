import {
  STAGE_RANK,
  ALWAYS_APPLIES,
  USER_ONLY_STAGES,
  TERMINAL_STAGES,
  STALENESS_THRESHOLD_DAYS,
  type Stage,
} from "@gradtracker/shared";

/**
 * Stage progression (T3.2).
 *
 * Emails do not arrive in order. Gmail can deliver a confirmation after an
 * interview invite, a rejection can land before the acknowledgement it
 * supersedes, and a re-sync replays history. The engine's whole job is to make
 * the job's stage independent of arrival order.
 *
 * @see implementation.md §7.5
 */

export type StageRejection =
  | "would-regress"
  | "already-terminal"
  | "user-only"
  | "human-locked"
  | "no-stage-detected";

export type StageDecision =
  | { applies: true; stage: Stage; reason: "advance" | "always-applies" }
  | { applies: false; reason: StageRejection };

export interface StageContext {
  current: Stage;
  /** What this email said. Null when the classifier detected no stage. */
  detected: Stage | null;
  /** True once the student has corrected the stage by hand. The pipeline never
   *  overrides that — SM-7. */
  humanLocked: boolean;
}

export function decideStage(context: StageContext): StageDecision {
  const { current, detected, humanLocked } = context;

  if (detected === null) return { applies: false, reason: "no-stage-detected" };

  // A human decision outranks every rule below it.
  if (humanLocked) return { applies: false, reason: "human-locked" };

  // The AI may never withdraw an application on the student's behalf.
  if (USER_ONLY_STAGES.has(detected)) return { applies: false, reason: "user-only" };

  // Withdrawn is final; the student chose it. A rejection arriving afterwards
  // does not overwrite their decision.
  if (current === "withdrawn") return { applies: false, reason: "already-terminal" };

  // An offer and a rejection can arrive from anywhere, including after each
  // other — an offer following a rejection is a real sequence (a role reopens,
  // a candidate is reconsidered), and the newest email is the truth.
  if (ALWAYS_APPLIES.has(detected)) {
    return detected === current
      ? { applies: false, reason: "would-regress" }
      : { applies: true, stage: detected, reason: "always-applies" };
  }

  // Past a rejection, ordinary progression emails are stale replays.
  if (TERMINAL_STAGES.has(current)) return { applies: false, reason: "already-terminal" };

  // Forward only. A confirmation arriving after an interview invite must not
  // drag the job backwards.
  const currentRank = STAGE_RANK[current];
  const detectedRank = STAGE_RANK[detected];

  return detectedRank > currentRank
    ? { applies: true, stage: detected, reason: "advance" }
    : { applies: false, reason: "would-regress" };
}

/**
 * Whether a job needs chasing: no email for longer than this stage tolerates.
 *
 * Computed, never stored — a stored flag is wrong by the following morning.
 * Terminal stages never go stale; there is nothing left to follow up.
 */
export function isFollowUpRequired(stage: Stage, lastEventAt: Date, now: Date): boolean {
  const thresholdDays = STALENESS_THRESHOLD_DAYS[stage];
  if (thresholdDays === null) return false;

  const elapsedDays = (now.getTime() - lastEventAt.getTime()) / 86_400_000;
  return elapsedDays > thresholdDays;
}

/**
 * The single next action, derived from stage and deadline.
 *
 * Precedence: an AI-extracted action wins, because it came from the email and
 * is specific ("Complete the numerical reasoning test"). Otherwise a
 * stage-derived default. Staleness overrides both — if nothing has happened
 * for weeks, chasing it is the next action regardless of what the last email
 * asked for.
 */
export function deriveNextAction(input: {
  stage: Stage;
  extracted: string | null;
  followUpRequired: boolean;
  daysSinceLastEvent: number;
}): string | null {
  if (TERMINAL_STAGES.has(input.stage)) return null;

  if (input.followUpRequired) {
    const days = Math.floor(input.daysSinceLastEvent);
    return `Follow up — no reply in ${days} days`;
  }

  if (input.extracted !== null && input.extracted.trim() !== "") return input.extracted;

  switch (input.stage) {
    case "applied":
      return "Wait for response";
    case "assessment":
      return "Complete online assessment";
    case "interview":
      return "Confirm interview time";
    case "offer":
      return "Respond to offer";
    default:
      return null;
  }
}
