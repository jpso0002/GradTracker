import {
  pgTable,
  uuid,
  text,
  real,
  integer,
  timestamp,
  index,
  uniqueIndex,
  primaryKey,
} from "drizzle-orm/pg-core";
import type {
  Stage,
  JobStatus,
  ReviewStatus,
  ExtractableField,
  ProvenanceSource,
  ClassifierModel,
} from "@gradtracker/shared";

/**
 * Postgres schema — production. Mirrors `schema.sqlite.ts` column for column;
 * `schema.parity.test.ts` fails if the two ever drift.
 *
 * Spec: implementation.md §4.
 */

// ── users ───────────────────────────────────────────────────────────────────
// NOTE: there is deliberately no `password` column. "Zero credentials stored"
// (SM-5) is enforced by the absence of the column, not by a policy document.
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** Google's stable subject id — the identity key. */
  googleSub: text("google_sub").notNull().unique(),
  email: text("email").notNull(),
  displayName: text("display_name"),
  /** Stable anonymous key for any future aggregate query. Never leaves the
   *  server, never joined to `email` outside this table. */
  anonKey: uuid("anon_key").notNull().unique().defaultRandom(),

  // AES-256-GCM, base64-encoded (see the note in schema.sqlite.ts on why text
  // rather than bytea/blob). The plaintext refresh token is never stored.
  refreshTokenCiphertext: text("refresh_token_ciphertext").notNull(),
  refreshTokenIv: text("refresh_token_iv").notNull(),
  refreshTokenTag: text("refresh_token_tag").notNull(),

  reviewThreshold: real("review_threshold").notNull().default(0.75),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
});

// ── jobs ────────────────────────────────────────────────────────────────────
export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    company: text("company").notNull(),
    /** Lowercased, legal suffixes stripped — the job-matching key. */
    companyNormalised: text("company_normalised").notNull(),
    role: text("role").notNull(),
    stage: text("stage").$type<Stage>().notNull(),
    deadlineAt: timestamp("deadline_at", { withTimezone: true }),
    nextAction: text("next_action"),
    /** e.g. "greenhouse.io". Matching tiebreak and provenance display. The
     *  full sender address is never stored. */
    senderDomain: text("sender_domain"),
    confidence: real("confidence").notNull(),
    status: text("status").$type<JobStatus>().notNull().default("active"),

    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull(),
    /** Drives the follow-up staleness flag. */
    lastEventAt: timestamp("last_event_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("jobs_user_status_idx").on(table.userId, table.status),
    index("jobs_user_company_idx").on(table.userId, table.companyNormalised),
    index("jobs_user_deadline_idx").on(table.userId, table.deadlineAt),
  ],
);

// ── email_events ────────────────────────────────────────────────────────────
// THE RETENTION BOUNDARY. Columns that must never exist here: subject, body,
// snippet, body_html, from_address, raw. Enforced by schema.retention.test.ts.
export const emailEvents = pgTable(
  "email_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Null while the event is queued for review and has no job yet. */
    jobId: uuid("job_id").references(() => jobs.id, { onDelete: "cascade" }),

    gmailMessageId: text("gmail_message_id").notNull(),
    gmailThreadId: text("gmail_thread_id").notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull(),
    senderDomain: text("sender_domain"),

    /** What the classifier read off this one email, before matching decided
     *  which job it belongs to. Extracted fields, not raw content — `jobs`
     *  stores the same two values — so the retention boundary is unaffected.
     *  Without these a review card can only show a sender domain (defect C7). */
    detectedCompany: text("detected_company"),
    detectedRole: text("detected_role"),
    detectedStage: text("detected_stage").$type<Stage>(),
    detectedDeadlineAt: timestamp("detected_deadline_at", { withTimezone: true }),
    detectedNextAction: text("detected_next_action"),

    confidence: real("confidence").notNull(),
    reviewStatus: text("review_status").$type<ReviewStatus>().notNull(),
    /** Which model produced this, so the harness can report per-model accuracy. */
    classifierModel: text("classifier_model").$type<ClassifierModel>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    /** The idempotency guarantee: re-processing an email is always a no-op,
     *  which is what makes a crashed sync safe to re-read. */
    uniqueIndex("email_events_user_message_uq").on(table.userId, table.gmailMessageId),
    index("email_events_job_idx").on(table.jobId),
    index("email_events_user_review_idx").on(table.userId, table.reviewStatus),
  ],
);

// ── job_field_provenance ────────────────────────────────────────────────────
// The mechanism behind SM-7: a field whose source is 'human' is never written
// by the classification pipeline again.
export const jobFieldProvenance = pgTable(
  "job_field_provenance",
  {
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    field: text("field").$type<ExtractableField>().notNull(),
    source: text("source").$type<ProvenanceSource>().notNull(),
    /** Null once human — a confidence score on a value a person typed is
     *  meaningless and actively misleading. */
    confidence: real("confidence"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.jobId, table.field] })],
);

// ── sync_state ──────────────────────────────────────────────────────────────
export const syncState = pgTable("sync_state", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  /** Gmail cursor. Null = never synced. Advanced ONLY inside the transaction
   *  that commits the batch — a crash must re-read, never skip. */
  historyId: text("history_id"),
  lastFullScanAt: timestamp("last_full_scan_at", { withTimezone: true }),
  state: text("state").$type<"idle" | "running" | "failed">().notNull().default("idle"),
  lastError: text("last_error"),
  /** Powers "612 emails read". */
  emailsReadTotal: integer("emails_read_total").notNull().default(0),
});

export const pgSchema = {
  users,
  jobs,
  emailEvents,
  jobFieldProvenance,
  syncState,
};
