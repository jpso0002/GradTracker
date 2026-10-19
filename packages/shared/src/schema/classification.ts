import { z } from "zod";
import { StageEnum } from "./stage.js";

/** Field length limits — rules.md → Business Logic → Access control and validation. */
export const LIMITS = Object.freeze({
  COMPANY_MAX: 160,
  ROLE_MAX: 160,
  NEXT_ACTION_MAX: 120,
  DEADLINE_MAX_YEARS: 2,
});

/**
 * What the classifier returns for a single email.
 *
 * This schema is the contract in three places at once: it constrains the model
 * output (via `output_config.format` + `zodOutputFormat`, decision D19), it
 * validates the adapter's response, and it types the pipeline. Defined once,
 * here — never restated in server or client (rules.md → Architecture).
 */
/**
 * A job the student could apply for, read from an email that is not about
 * their own application — a job-board alert, an "applications are open"
 * announcement, a careers newsletter (D43). Fields only, never the email.
 */
export const OpeningSchema = z.object({
  company: z.string().min(1).max(LIMITS.COMPANY_MAX),
  role: z.string().min(1).max(LIMITS.ROLE_MAX),
  /** As the email gives it: "Sydney", "Melbourne VIC", "Remote". */
  location: z.string().max(80).nullable(),
  /** ISO 8601, by the deadline rules. Null when no closing date is stated. */
  closesAt: z.string().datetime({ offset: true }).nullable(),
  /** The board or sender: "LinkedIn", "SEEK", "EY". */
  source: z.string().max(60).nullable(),
});

export type Opening = z.infer<typeof OpeningSchema>;

export const ClassificationSchema = z.object({
  /** False for anything that is not a job application email. The pipeline
   *  discards these without writing a row. When unsure the model must answer
   *  false rather than guess — a false positive is visible and correctable, a
   *  false negative is a silently missed application. */
  isApplication: z.boolean(),

  company: z.string().min(1).max(LIMITS.COMPANY_MAX).nullable(),
  role: z.string().min(1).max(LIMITS.ROLE_MAX).nullable(),
  stage: StageEnum.nullable(),

  /** ISO 8601. Resolved against the email's received date, not today's. */
  deadlineAt: z.string().datetime().nullable(),

  /** Imperative and specific: "Complete online assessment", not "Action
   *  required". Sentence case, no trailing period. */
  nextAction: z.string().max(LIMITS.NEXT_ACTION_MAX).nullable(),

  /** 0–1. Below 0.6 escalates to Sonnet 5; below the user's review threshold
   *  (default 0.75) the email is queued for review instead of entering the
   *  pipeline as fact. `>=` accepts at the boundary. */
  confidence: z.number().min(0).max(1),

  /** Jobs this email offers to apply for (D43). Only on emails that are not
   *  about the student's own application; absent or empty otherwise. */
  openings: z.array(OpeningSchema).max(20).optional(),

  /**
   * DEV-ONLY (defect C1). This field quotes the email, so persisting it —
   * including to a log file — violates SM-6 exactly as a database column would.
   * Requested only when CLASSIFIER_DEBUG=1, never logged, never returned by the
   * API, and discarded along with the body when classifyOne() returns.
   */
  reasoning: z.string().max(300).optional(),
});

export type Classification = z.infer<typeof ClassificationSchema>;

/** Confidence thresholds — rules.md → Business Logic → Classification. */
export const CONFIDENCE = Object.freeze({
  /** Below this, re-run on the escalation model. */
  ESCALATE_BELOW: 0.6,
  /** Default review gate. Per-user, stored on `users.review_threshold`. */
  DEFAULT_REVIEW_THRESHOLD: 0.75,
});

/** Which model produced a classification. Recorded per email so the accuracy
 *  harness can report per-model figures and evidence the cost/quality tradeoff
 *  rather than asserting it. */
export const ClassifierModelEnum = z.enum([
  "claude-haiku-4-5",
  "claude-sonnet-5",
  "fake",
]);

export type ClassifierModel = z.infer<typeof ClassifierModelEnum>;
