import {
  sqliteTable,
  text,
  real,
  integer,
  index,
  uniqueIndex,
  primaryKey,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import type {
  Stage,
  JobStatus,
  ReviewStatus,
  ExtractableField,
  ProvenanceSource,
  ClassifierModel,
} from "@gradtracker/shared";

/**
 * SQLite schema — development and test. Mirrors `schema.pg.ts` column for
 * column; `schema.parity.test.ts` fails if the two ever drift.
 *
 * Two dialect differences, both semantic no-ops at the application layer:
 *
 *   uuid        → text        (Drizzle maps both to `string`)
 *   timestamptz → integer ms  (Drizzle maps both to `Date`)
 *
 * One deliberate deviation from implementation.md §4.1, which specifies
 * `bytea` for the three refresh-token columns: they are `text` here and in
 * Postgres, holding base64. AES-256-GCM output encodes to base64 losslessly,
 * the security property is identical (the plaintext token is still never
 * stored), and it keeps the two schemas structurally identical so the parity
 * test can compare them directly. Cost: ~33% on three short values.
 */

const nowMs = sql`(unixepoch() * 1000)`;

// ── users ───────────────────────────────────────────────────────────────────
// No `password` column, deliberately (SM-5).
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  googleSub: text("google_sub").notNull().unique(),
  email: text("email").notNull(),
  displayName: text("display_name"),
  anonKey: text("anon_key").notNull().unique(),

  refreshTokenCiphertext: text("refresh_token_ciphertext").notNull(),
  refreshTokenIv: text("refresh_token_iv").notNull(),
  refreshTokenTag: text("refresh_token_tag").notNull(),

  reviewThreshold: real("review_threshold").notNull().default(0.75),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(nowMs),
  lastSyncAt: integer("last_sync_at", { mode: "timestamp_ms" }),
});

// ── jobs ────────────────────────────────────────────────────────────────────
export const jobs = sqliteTable(
  "jobs",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    company: text("company").notNull(),
    companyNormalised: text("company_normalised").notNull(),
    role: text("role").notNull(),
    stage: text("stage").$type<Stage>().notNull(),
    deadlineAt: integer("deadline_at", { mode: "timestamp_ms" }),
    nextAction: text("next_action"),
    senderDomain: text("sender_domain"),
    confidence: real("confidence").notNull(),
    status: text("status").$type<JobStatus>().notNull().default("active"),

    firstSeenAt: integer("first_seen_at", { mode: "timestamp_ms" }).notNull(),
    lastEventAt: integer("last_event_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(nowMs),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(nowMs),
  },
  (table) => [
    index("jobs_user_status_idx").on(table.userId, table.status),
    index("jobs_user_company_idx").on(table.userId, table.companyNormalised),
    index("jobs_user_deadline_idx").on(table.userId, table.deadlineAt),
  ],
);

// ── email_events ────────────────────────────────────────────────────────────
// THE RETENTION BOUNDARY. No subject, body, snippet, body_html, from_address
// or raw column may ever exist here. Enforced by schema.retention.test.ts.
export const emailEvents = sqliteTable(
  "email_events",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    jobId: text("job_id").references(() => jobs.id, { onDelete: "cascade" }),

    gmailMessageId: text("gmail_message_id").notNull(),
    gmailThreadId: text("gmail_thread_id").notNull(),
    receivedAt: integer("received_at", { mode: "timestamp_ms" }).notNull(),
    senderDomain: text("sender_domain"),

    detectedStage: text("detected_stage").$type<Stage>(),
    detectedDeadlineAt: integer("detected_deadline_at", { mode: "timestamp_ms" }),
    detectedNextAction: text("detected_next_action"),

    confidence: real("confidence").notNull(),
    reviewStatus: text("review_status").$type<ReviewStatus>().notNull(),
    classifierModel: text("classifier_model").$type<ClassifierModel>().notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(nowMs),
  },
  (table) => [
    uniqueIndex("email_events_user_message_uq").on(table.userId, table.gmailMessageId),
    index("email_events_job_idx").on(table.jobId),
    index("email_events_user_review_idx").on(table.userId, table.reviewStatus),
  ],
);

// ── job_field_provenance ────────────────────────────────────────────────────
export const jobFieldProvenance = sqliteTable(
  "job_field_provenance",
  {
    jobId: text("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    field: text("field").$type<ExtractableField>().notNull(),
    source: text("source").$type<ProvenanceSource>().notNull(),
    confidence: real("confidence"),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(nowMs),
  },
  (table) => [primaryKey({ columns: [table.jobId, table.field] })],
);

// ── sync_state ──────────────────────────────────────────────────────────────
export const syncState = sqliteTable("sync_state", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  historyId: text("history_id"),
  lastFullScanAt: integer("last_full_scan_at", { mode: "timestamp_ms" }),
  state: text("state").$type<"idle" | "running" | "failed">().notNull().default("idle"),
  lastError: text("last_error"),
  emailsReadTotal: integer("emails_read_total").notNull().default(0),
});

export const sqliteSchema = {
  users,
  jobs,
  emailEvents,
  jobFieldProvenance,
  syncState,
};
