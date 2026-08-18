import { z } from "zod";
import { StageEnum } from "./stage.js";
import { JobSchema, EmailEventSchema, JobStatusEnum } from "./job.js";
import { LIMITS, CONFIDENCE } from "./classification.js";

/**
 * API request and response contracts. Every route validates its body against
 * one of these at the boundary; unknown fields are stripped, never persisted.
 *
 * Wire format is camelCase; the repository layer maps to snake_case columns
 * (rules.md → Naming Conventions).
 */

/** IANA timezone, sent by the client on **every** request as the `x-timezone`
 *  header — not a query parameter — so the server can compute `daysLeft` and
 *  rank with one clock (defect C2). A header applies to every route without
 *  each one having to remember to ask for it. */
export const TimezoneSchema = z
  .string()
  .min(1)
  .max(64)
  .describe("IANA timezone, e.g. Australia/Melbourne");

// ── GET /api/jobs ───────────────────────────────────────────────────────────

export const ListJobsQuerySchema = z.object({
  status: JobStatusEnum.default("active"),
  /** Multi-select stage filter chips. Filters re-filter but never re-sort:
   *  urgency order is the product's one opinion (rules.md → Ranking). */
  stage: z.array(StageEnum).optional(),
});

export type ListJobsQuery = z.infer<typeof ListJobsQuerySchema>;

export const PipelineStatsSchema = z.object({
  liveApplications: z.number().int().nonnegative(),
  dueThisWeek: z.number().int().nonnegative(),
  needsReview: z.number().int().nonnegative(),
  emailsRead: z.number().int().nonnegative(),
});

export const ListJobsResponseSchema = z.object({
  jobs: z.array(JobSchema),
  stats: PipelineStatsSchema,
});

export type ListJobsResponse = z.infer<typeof ListJobsResponseSchema>;

// ── GET /api/jobs/:id ───────────────────────────────────────────────────────

export const JobDetailResponseSchema = z.object({
  job: JobSchema,
  timeline: z.array(EmailEventSchema),
});

export type JobDetailResponse = z.infer<typeof JobDetailResponseSchema>;

// ── PATCH /api/jobs/:id ─────────────────────────────────────────────────────

/**
 * Inline correction. Every supplied field flips to `source: 'human'` and is
 * never overwritten by a later sync. At least one field must be present —
 * an empty patch is a 400, not a silent no-op.
 */
export const UpdateJobBodySchema = z
  .object({
    company: z.string().trim().min(1).max(LIMITS.COMPANY_MAX).optional(),
    role: z.string().trim().min(1).max(LIMITS.ROLE_MAX).optional(),
    stage: StageEnum.optional(),
    deadlineAt: z.string().datetime().nullable().optional(),
    nextAction: z.string().trim().max(LIMITS.NEXT_ACTION_MAX).nullable().optional(),
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: "At least one field must be supplied.",
  });

export type UpdateJobBody = z.infer<typeof UpdateJobBodySchema>;

// ── Review queue ────────────────────────────────────────────────────────────

export const ReviewItemSchema = z.object({
  eventId: z.string().uuid(),
  receivedAt: z.string().datetime(),
  senderDomain: z.string().nullable(),
  company: z.string().nullable(),
  role: z.string().nullable(),
  stage: StageEnum.nullable(),
  deadlineAt: z.string().datetime().nullable(),
  nextAction: z.string().nullable(),
  confidence: z.number().min(0).max(1),
});

export type ReviewItem = z.infer<typeof ReviewItemSchema>;

/** Confirm, optionally with corrections. Any field supplied here is treated as
 *  human-verified on the resulting job. */
export const ConfirmReviewBodySchema = z.object({
  corrections: UpdateJobBodySchema.optional(),
});

export type ConfirmReviewBody = z.infer<typeof ConfirmReviewBodySchema>;

// ── Sync ────────────────────────────────────────────────────────────────────

export const SyncStateEnum = z.enum(["idle", "running", "failed"]);

export const SyncStatusResponseSchema = z.object({
  state: SyncStateEnum,
  lastSyncAt: z.string().datetime().nullable(),
  emailsReadTotal: z.number().int().nonnegative(),
  /** Populated only while a scan is running, for the honest progress count. */
  progress: z
    .object({
      read: z.number().int().nonnegative(),
      total: z.number().int().nonnegative(),
    })
    .nullable(),
  lastError: z.string().nullable(),
});

export type SyncStatusResponse = z.infer<typeof SyncStatusResponseSchema>;

export const SyncResultSchema = z.object({
  emailsRead: z.number().int().nonnegative(),
  newApplications: z.number().int().nonnegative(),
  stageChanges: z.number().int().nonnegative(),
  needsReview: z.number().int().nonnegative(),
});

export type SyncResult = z.infer<typeof SyncResultSchema>;

// ── Settings ────────────────────────────────────────────────────────────────

export const UpdateSettingsBodySchema = z.object({
  reviewThreshold: z.number().min(0).max(1).optional(),
});

export type UpdateSettingsBody = z.infer<typeof UpdateSettingsBodySchema>;

export const MeResponseSchema = z.object({
  email: z.string().email(),
  displayName: z.string().nullable(),
  gmailConnected: z.boolean(),
  reviewThreshold: z.number().min(0).max(1).default(CONFIDENCE.DEFAULT_REVIEW_THRESHOLD),
  /** The timezone the server actually used, echoed back. If the client sent
   *  something unparseable it will not match what was sent — which is how the
   *  client finds out, rather than silently ranking against Melbourne. */
  timeZone: TimezoneSchema,
  /** True while T4.1–T4.3 are deferred. The client must be able to say so out
   *  loud; a demo that looks like a logged-in product is a demo that misleads. */
  demoMode: z.boolean(),
  sync: SyncStatusResponseSchema,
});

export type MeResponse = z.infer<typeof MeResponseSchema>;

// ── Errors ──────────────────────────────────────────────────────────────────

/** Validation failures name the offending field so the inline editor can show
 *  the error beneath it without discarding what the student typed. */
export const ApiErrorSchema = z.object({
  error: z.string(),
  field: z.string().optional(),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;
