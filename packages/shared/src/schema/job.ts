import { z } from "zod";
import { StageEnum } from "./stage.js";
import { LIMITS } from "./classification.js";

/** The five fields the AI extracts and the student may correct. Each carries a
 *  provenance row; a field marked `human` is never written by the pipeline
 *  again (SM-7). */
export const ExtractableFieldEnum = z.enum([
  "company",
  "role",
  "stage",
  "deadline_at",
  "next_action",
]);

export type ExtractableField = z.infer<typeof ExtractableFieldEnum>;

export const ProvenanceSourceEnum = z.enum(["ai", "human"]);
export type ProvenanceSource = z.infer<typeof ProvenanceSourceEnum>;

export const JobStatusEnum = z.enum(["active", "archived"]);
export type JobStatus = z.infer<typeof JobStatusEnum>;

export const ReviewStatusEnum = z.enum([
  "auto_accepted",
  "pending",
  "confirmed",
  "dismissed",
]);
export type ReviewStatus = z.infer<typeof ReviewStatusEnum>;

/** Per-field provenance, sent to the client so it can render a ConfidenceMeter
 *  (ai) or an "Edited" tag (human) — never both, never neither. */
export const FieldProvenanceSchema = z.object({
  field: ExtractableFieldEnum,
  source: ProvenanceSourceEnum,
  /** Null once the field is human-verified: a confidence score on a value a
   *  person typed is meaningless and actively misleading. */
  confidence: z.number().min(0).max(1).nullable(),
  updatedAt: z.string().datetime(),
});

export type FieldProvenance = z.infer<typeof FieldProvenanceSchema>;

/** One application, as the API returns it. */
export const JobSchema = z.object({
  id: z.string().uuid(),
  company: z.string().min(1).max(LIMITS.COMPANY_MAX),
  role: z.string().min(1).max(LIMITS.ROLE_MAX),
  stage: StageEnum,
  deadlineAt: z.string().datetime().nullable(),
  nextAction: z.string().max(LIMITS.NEXT_ACTION_MAX).nullable(),
  senderDomain: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  status: JobStatusEnum,
  firstSeenAt: z.string().datetime(),
  lastEventAt: z.string().datetime(),

  // ── Computed server-side, never stored (D10 / defect C2) ────────────────
  /** Whole days until the deadline, negative when overdue, null when there is
   *  no deadline. Computed by the SERVER against the client's IANA timezone so
   *  ranking and display cannot disagree. The client renders this and never
   *  recomputes it. */
  daysLeft: z.number().int().nullable(),
  /** True when `now - lastEventAt` exceeds this stage's staleness threshold. */
  followUpRequired: z.boolean(),

  provenance: z.array(FieldProvenanceSchema),
});

export type Job = z.infer<typeof JobSchema>;

/** One classified email attached to a job — the detail-panel timeline. Carries
 *  metadata only: no subject, no body, ever (SM-6). */
export const EmailEventSchema = z.object({
  id: z.string().uuid(),
  gmailMessageId: z.string(),
  gmailThreadId: z.string(),
  receivedAt: z.string().datetime(),
  /** e.g. "greenhouse.io" — powers "Detected from a Greenhouse email". The
   *  full sender address is never stored. */
  senderDomain: z.string().nullable(),
  detectedStage: StageEnum.nullable(),
  detectedDeadlineAt: z.string().datetime().nullable(),
  detectedNextAction: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  reviewStatus: ReviewStatusEnum,
});

export type EmailEvent = z.infer<typeof EmailEventSchema>;
