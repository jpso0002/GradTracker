import { randomUUID } from "node:crypto";
import { and, eq, inArray, desc } from "drizzle-orm";
import { TERMINAL_STAGES } from "@gradtracker/shared";
import type { UserId, Stage, JobStatus, ReviewStatus, ExtractableField, ProvenanceSource, ClassifierModel } from "@gradtracker/shared";
import type { Database } from "./client.js";
import { users, jobs, emailEvents, jobFieldProvenance, syncState, jobOpenings } from "./schema.sqlite.js";

/**
 * The repository layer — the only code that talks to the database.
 *
 * **Every method takes `userId` as its first argument.** Omitting it is an
 * arity error; passing an unbranded string is a type error. Cross-user access
 * is therefore a compile failure rather than a runtime data leak, which is how
 * SM-5's "no route can return another user's data" is actually enforced.
 *
 * `job_field_provenance` has no `user_id` column of its own, so its methods
 * scope through the owning job. That indirection is the one place this
 * guarantee could be quietly lost, so it is implemented once, here, and
 * covered by tests.
 *
 * Reads that find nothing return `undefined`. Routes turn that into a **404,
 * never a 403** — a 403 confirms the record exists.
 */

// ── Identity ────────────────────────────────────────────────────────────────
// The ONLY operations that legitimately run without a UserId, because they are
// what establishes one. Deliberately tiny so it stays auditable at a glance.

export interface NewUser {
  googleSub: string;
  email: string;
  displayName?: string | undefined;
  refreshTokenCiphertext: string;
  refreshTokenIv: string;
  refreshTokenTag: string;
}

export function createIdentityRepository(db: Database) {
  return {
    async findByGoogleSub(googleSub: string) {
      const [row] = await db.select().from(users).where(eq(users.googleSub, googleSub)).limit(1);
      return row;
    },

    async createUser(input: NewUser) {
      const [row] = await db
        .insert(users)
        .values({
          id: randomUUID(),
          anonKey: randomUUID(),
          googleSub: input.googleSub,
          email: input.email,
          displayName: input.displayName ?? null,
          refreshTokenCiphertext: input.refreshTokenCiphertext,
          refreshTokenIv: input.refreshTokenIv,
          refreshTokenTag: input.refreshTokenTag,
        })
        .returning();
      return row;
    },
  };
}

// ── Scoped repository ───────────────────────────────────────────────────────

export interface NewJob {
  company: string;
  companyNormalised: string;
  role: string;
  stage: Stage;
  deadlineAt?: Date | null;
  nextAction?: string | null;
  senderDomain?: string | null;
  confidence: number;
  firstSeenAt: Date;
  lastEventAt: Date;
}

/** No `status` field, deliberately — see `statusFor()`. */
export interface JobPatch {
  company?: string;
  companyNormalised?: string;
  role?: string;
  stage?: Stage;
  deadlineAt?: Date | null;
  nextAction?: string | null;
  lastEventAt?: Date;
}

/**
 * A job's status is a function of its stage: terminal stages are archived,
 * every other stage is active. It is never set on its own.
 *
 * Ranking drops terminal stages from the Active tab, and the Archived tab
 * filters on status — so if the two ever disagree, an application is on
 * neither tab. That happened three times, on three code paths, while the rule
 * lived at the call sites (defect C11). Every stage write passes through
 * `insertJob` or `updateJob`, so this is the one place it can live.
 */
function statusFor(stage: Stage): JobStatus {
  return TERMINAL_STAGES.has(stage) ? "archived" : "active";
}

export interface NewEmailEvent {
  jobId?: string | null;
  gmailMessageId: string;
  gmailThreadId: string;
  receivedAt: Date;
  senderDomain?: string | null;
  detectedCompany?: string | null;
  detectedRole?: string | null;
  detectedStage?: Stage | null;
  detectedDeadlineAt?: Date | null;
  detectedNextAction?: string | null;
  /** A pending item's likely application, when matching found one (D26). */
  suggestedJobId?: string | null;
  confidence: number;
  reviewStatus: ReviewStatus;
  classifierModel: ClassifierModel;
}

/** One opening to save (D43). */
export interface NewOpening {
  company: string;
  companyNormalised: string;
  role: string;
  location: string | null;
  closesAt: Date | null;
  source: string | null;
  senderDomain: string | null;
  gmailMessageId: string;
  firstSeenAt: Date;
}

export function createRepository(db: Database) {
  /** Confirms a job belongs to this user. Every job-scoped operation goes
   *  through here, so the ownership check exists in exactly one place. */
  async function assertOwnsJob(userId: UserId, jobId: string): Promise<boolean> {
    const [row] = await db
      .select({ id: jobs.id })
      .from(jobs)
      .where(and(eq(jobs.userId, userId), eq(jobs.id, jobId)))
      .limit(1);
    return row !== undefined;
  }

  return {
    // ── jobs ────────────────────────────────────────────────────────────────

    async listJobs(userId: UserId, opts: { status?: JobStatus; stages?: Stage[] } = {}) {
      const filters = [eq(jobs.userId, userId)];
      if (opts.status) filters.push(eq(jobs.status, opts.status));
      if (opts.stages?.length) filters.push(inArray(jobs.stage, opts.stages));
      return db
        .select()
        .from(jobs)
        .where(and(...filters))
        .orderBy(desc(jobs.lastEventAt));
    },

    async findJob(userId: UserId, jobId: string) {
      const [row] = await db
        .select()
        .from(jobs)
        .where(and(eq(jobs.userId, userId), eq(jobs.id, jobId)))
        .limit(1);
      return row;
    },

    async insertJob(userId: UserId, input: NewJob) {
      const [row] = await db
        .insert(jobs)
        .values({
          id: randomUUID(),
          userId,
          company: input.company,
          companyNormalised: input.companyNormalised,
          role: input.role,
          stage: input.stage,
          status: statusFor(input.stage),
          deadlineAt: input.deadlineAt ?? null,
          nextAction: input.nextAction ?? null,
          senderDomain: input.senderDomain ?? null,
          confidence: input.confidence,
          firstSeenAt: input.firstSeenAt,
          lastEventAt: input.lastEventAt,
        })
        .returning();
      return row;
    },

    /** Returns undefined when the job does not belong to this user — the
     *  caller cannot tell "not yours" from "does not exist", by design. */
    async updateJob(userId: UserId, jobId: string, patch: JobPatch) {
      // `status` is not part of JobPatch, so typed callers cannot pass one. It
      // is also discarded at runtime, because test files and plain JavaScript
      // are not typechecked — the invariant must not depend on who is calling.
      const { status: _discarded, ...fields } = patch as JobPatch & { status?: unknown };
      const derived = fields.stage !== undefined ? { status: statusFor(fields.stage) } : {};

      const [row] = await db
        .update(jobs)
        .set({ ...fields, ...derived, updatedAt: new Date() })
        .where(and(eq(jobs.userId, userId), eq(jobs.id, jobId)))
        .returning();
      return row;
    },

    // ── openings (D43) ──────────────────────────────────────────────────────

    /**
     * Saves the openings one email listed. The same company and role seen
     * again is the same opening: a closing date or location it now states
     * fills in what was missing, and a dismissed or applied one stays so.
     * Returns how many were new.
     */
    async upsertOpenings(userId: UserId, openings: NewOpening[]) {
      let added = 0;
      for (const opening of openings) {
        const [existing] = await db
          .select()
          .from(jobOpenings)
          .where(
            and(
              eq(jobOpenings.userId, userId),
              eq(jobOpenings.companyNormalised, opening.companyNormalised),
              eq(jobOpenings.role, opening.role),
            ),
          )
          .limit(1);
        if (existing) {
          await db
            .update(jobOpenings)
            .set({
              location: existing.location ?? opening.location,
              closesAt: existing.closesAt ?? opening.closesAt,
              source: existing.source ?? opening.source,
            })
            .where(eq(jobOpenings.id, existing.id));
          continue;
        }
        await db.insert(jobOpenings).values({
          id: randomUUID(),
          userId,
          company: opening.company,
          companyNormalised: opening.companyNormalised,
          role: opening.role,
          location: opening.location,
          closesAt: opening.closesAt,
          source: opening.source,
          senderDomain: opening.senderDomain,
          gmailMessageId: opening.gmailMessageId,
          firstSeenAt: opening.firstSeenAt,
        });
        added += 1;
      }
      return added;
    },

    async listOpenings(userId: UserId, status: "open" | "dismissed" | "applied" = "open") {
      return db
        .select()
        .from(jobOpenings)
        .where(and(eq(jobOpenings.userId, userId), eq(jobOpenings.status, status)));
    },

    async findOpening(userId: UserId, openingId: string) {
      const [row] = await db
        .select()
        .from(jobOpenings)
        .where(and(eq(jobOpenings.userId, userId), eq(jobOpenings.id, openingId)))
        .limit(1);
      return row;
    },

    async setOpeningStatus(userId: UserId, openingId: string, status: "open" | "dismissed" | "applied") {
      const [row] = await db
        .update(jobOpenings)
        .set({ status })
        .where(and(eq(jobOpenings.userId, userId), eq(jobOpenings.id, openingId)))
        .returning();
      return row;
    },

    // ── email events ────────────────────────────────────────────────────────

    /** The idempotency check that makes a crashed sync safe to re-read. */
    async hasProcessedMessage(userId: UserId, gmailMessageId: string) {
      // An email that only listed openings (D43) left no event; its openings
      // carry its id instead.
      const [opening] = await db
        .select({ id: jobOpenings.id })
        .from(jobOpenings)
        .where(and(eq(jobOpenings.userId, userId), eq(jobOpenings.gmailMessageId, gmailMessageId)))
        .limit(1);
      if (opening) return true;
      const [row] = await db
        .select({ id: emailEvents.id })
        .from(emailEvents)
        .where(
          and(eq(emailEvents.userId, userId), eq(emailEvents.gmailMessageId, gmailMessageId)),
        )
        .limit(1);
      return row !== undefined;
    },

    async insertEmailEvent(userId: UserId, input: NewEmailEvent) {
      const [row] = await db
        .insert(emailEvents)
        .values({
          id: randomUUID(),
          userId,
          jobId: input.jobId ?? null,
          gmailMessageId: input.gmailMessageId,
          gmailThreadId: input.gmailThreadId,
          receivedAt: input.receivedAt,
          senderDomain: input.senderDomain ?? null,
          detectedCompany: input.detectedCompany ?? null,
          detectedRole: input.detectedRole ?? null,
          detectedStage: input.detectedStage ?? null,
          detectedDeadlineAt: input.detectedDeadlineAt ?? null,
          detectedNextAction: input.detectedNextAction ?? null,
          suggestedJobId: input.suggestedJobId ?? null,
          confidence: input.confidence,
          reviewStatus: input.reviewStatus,
          classifierModel: input.classifierModel,
        })
        .returning();
      return row;
    },

    async listEventsForJob(userId: UserId, jobId: string) {
      return db
        .select()
        .from(emailEvents)
        .where(and(eq(emailEvents.userId, userId), eq(emailEvents.jobId, jobId)))
        .orderBy(desc(emailEvents.receivedAt));
    },

    /** Update a review item. Scoped like everything else: an event id
     *  belonging to another user simply is not found. */
    async updateEmailEvent(
      userId: UserId,
      eventId: string,
      patch: { jobId?: string | null; reviewStatus?: ReviewStatus },
    ) {
      const [row] = await db
        .update(emailEvents)
        .set(patch)
        .where(and(eq(emailEvents.userId, userId), eq(emailEvents.id, eventId)))
        .returning();
      return row;
    },

    async listPendingReview(userId: UserId) {
      return db
        .select()
        .from(emailEvents)
        .where(and(eq(emailEvents.userId, userId), eq(emailEvents.reviewStatus, "pending")))
        .orderBy(desc(emailEvents.receivedAt));
    },

    // ── provenance ──────────────────────────────────────────────────────────
    // These scope through the owning job: job_field_provenance carries no
    // user_id of its own, so the check cannot be a simple WHERE clause.

    async listProvenance(userId: UserId, jobId: string) {
      if (!(await assertOwnsJob(userId, jobId))) return [];
      return db.select().from(jobFieldProvenance).where(eq(jobFieldProvenance.jobId, jobId));
    },

    /**
     * True when the field is human-verified and the pipeline must not touch
     * it. The check behind SM-7.
     *
     * A correction is final until the employer says something newer (D36):
     * given the received time of the email asking, the lock holds only if the
     * student's edit came after it. Without one, a human field is locked.
     */
    async isFieldLocked(userId: UserId, jobId: string, field: ExtractableField, emailReceivedAt?: Date) {
      if (!(await assertOwnsJob(userId, jobId))) return false;
      const [row] = await db
        .select({ source: jobFieldProvenance.source, updatedAt: jobFieldProvenance.updatedAt })
        .from(jobFieldProvenance)
        .where(and(eq(jobFieldProvenance.jobId, jobId), eq(jobFieldProvenance.field, field)))
        .limit(1);
      if (row?.source !== "human") return false;
      if (emailReceivedAt === undefined) return true;
      return emailReceivedAt.getTime() <= row.updatedAt.getTime();
    },

    async setProvenance(
      userId: UserId,
      jobId: string,
      field: ExtractableField,
      source: ProvenanceSource,
      confidence: number | null,
    ) {
      if (!(await assertOwnsJob(userId, jobId))) return undefined;
      const [row] = await db
        .insert(jobFieldProvenance)
        .values({
          jobId,
          field,
          source,
          // Null once human: a confidence score on a value a person typed is
          // meaningless and actively misleading.
          confidence: source === "human" ? null : confidence,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [jobFieldProvenance.jobId, jobFieldProvenance.field],
          set: { source, confidence: source === "human" ? null : confidence, updatedAt: new Date() },
        })
        .returning();
      return row;
    },

    // ── the caller themselves ───────────────────────────────────────────────

    /** The signed-in user's own row. Scoped like everything else — this can
     *  only ever return the caller, never anyone else. Credential columns are
     *  not selected: nothing outside the OAuth path has any business reading
     *  them, and a response body is exactly where they must not appear. */
    async findUser(userId: UserId) {
      const [row] = await db
        .select({
          id: users.id,
          email: users.email,
          displayName: users.displayName,
          reviewThreshold: users.reviewThreshold,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      return row;
    },

    /** The student's own settings (T4.10). Read by the pipeline on every
     *  ingest, so a change routes the next email and nothing already stored. */
    async getSettings(userId: UserId) {
      const [row] = await db
        .select({ reviewThreshold: users.reviewThreshold })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      return row;
    },

    async updateSettings(userId: UserId, patch: { reviewThreshold?: number | undefined }) {
      const [row] = await db
        .update(users)
        .set(patch)
        .where(eq(users.id, userId))
        .returning({ reviewThreshold: users.reviewThreshold });
      return row;
    },

    // ── sync state ──────────────────────────────────────────────────────────

    async getSyncState(userId: UserId) {
      const [row] = await db
        .select()
        .from(syncState)
        .where(eq(syncState.userId, userId))
        .limit(1);
      return row;
    },

    async upsertSyncState(
      userId: UserId,
      patch: {
        historyId?: string | null;
        state?: "idle" | "running" | "failed";
        lastError?: string | null;
        emailsReadTotal?: number;
        lastFullScanAt?: Date | null;
      },
    ) {
      const [row] = await db
        .insert(syncState)
        .values({ userId, ...patch })
        .onConflictDoUpdate({ target: syncState.userId, set: patch })
        .returning();
      return row;
    },
  };
}

export type Repository = ReturnType<typeof createRepository>;
export type IdentityRepository = ReturnType<typeof createIdentityRepository>;
