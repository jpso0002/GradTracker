import type { Classification, ClassifierModel, ReviewStatus, UserId } from "@gradtracker/shared";
import type { EmailClassifier, RawEmail } from "../../ports/index.js";
import { senderDomain } from "../../ports/index.js";
import type { Repository } from "../../db/repository.js";
import { findMatch, normaliseCompany, type MatchCandidate } from "../matching/match.js";
import { decideStage } from "../stages/engine.js";
import { applyExtraction } from "../provenance/apply.js";

/**
 * The classification pipeline (T3.4).
 *
 * @see implementation.md §7.2
 */

// ── The retention boundary ──────────────────────────────────────────────────

/**
 * What survives classification.
 *
 * Deliberately has **no `subject`, no `body`, and no `fromAddress`** — only the
 * domain. `classifyOne()` below is handed the only reference to the email body
 * the pipeline will ever hold, and returns one of these. Everything downstream
 * is therefore structurally incapable of persisting content it cannot see.
 *
 * SM-6 is enforced by this type, not by remembering to be careful.
 */
export interface ClassifiedEmail {
  gmailMessageId: string;
  gmailThreadId: string;
  receivedAt: Date;
  senderDomain: string | null;
  classification: Omit<Classification, "reasoning">;
  model: ClassifierModel;
}

// ── Pre-filter ──────────────────────────────────────────────────────────────

export type PreFilterReason = "own-address" | "calendar-notification" | "system-message";

export interface PreFilterResult {
  skip: boolean;
  reason?: PreFilterReason;
}

/**
 * A cheap deterministic pass before the model, purely to avoid paying for
 * emails that cannot possibly be application updates.
 *
 * **It must never make a classification judgement.** A keyword-based skip
 * ("no 'application' in the subject, drop it") would create false negatives,
 * and a false negative is a silently missed application — the costly failure
 * SM-2 exists to track. When in any doubt, the email goes to the model.
 *
 * @see implementation.md §7.3
 */
export function preFilter(email: RawEmail, ownAddress: string | null): PreFilterResult {
  const from = email.fromAddress.toLowerCase();

  if (ownAddress !== null && from.includes(ownAddress.toLowerCase())) {
    return { skip: true, reason: "own-address" };
  }

  // Calendar invitations are machine traffic about a meeting, not a status
  // change. The interview invitation that generated them is a separate email
  // and is classified normally.
  if (/calendar-notification@|calendar-noreply@|@calendar\./.test(from)) {
    return { skip: true, reason: "calendar-notification" };
  }

  // Bounce and delivery notifications only. There is deliberately NO rule for
  // google.com: Google is both a mail provider and a major graduate employer,
  // and an earlier version of this filter dropped a genuine
  // "careers-noreply@google.com" application confirmation. That is the exact
  // failure this function is warned against — a false negative created before
  // the model ever sees the email, invisible in the accuracy figures because
  // the email never reached the classifier to be scored.
  if (/^mailer-daemon@|^postmaster@/.test(from)) {
    return { skip: true, reason: "system-message" };
  }

  return { skip: false };
}

// ── Classification ──────────────────────────────────────────────────────────

/**
 * Classifies one email and discards its content.
 *
 * The single narrowest point in the system: `raw` comes in carrying a subject
 * and body, a `ClassifiedEmail` goes out carrying neither. Callers never touch
 * `raw` again.
 */
export async function classifyOne(
  raw: RawEmail,
  classifier: EmailClassifier,
): Promise<ClassifiedEmail> {
  const result = await classifier.classify(raw);

  // `reasoning` is destructured out here and never returned — it quotes the
  // email, so letting it travel further would put content into anything that
  // logs a pipeline result (defect C1).
  const { reasoning: _discarded, model, usage: _usage, ...classification } = result;
  void _discarded;
  void _usage;

  return {
    gmailMessageId: raw.gmailMessageId,
    gmailThreadId: raw.gmailThreadId,
    receivedAt: raw.receivedAt,
    senderDomain: senderDomain(raw.fromAddress),
    classification,
    model,
  };
}

// ── Persistence ─────────────────────────────────────────────────────────────

export type ProcessOutcome =
  | { kind: "skipped"; reason: PreFilterReason }
  | { kind: "already-processed" }
  | { kind: "not-application" }
  | { kind: "queued-for-review"; eventId: string }
  | { kind: "created-job"; jobId: string }
  | { kind: "updated-job"; jobId: string; stageChanged: boolean; matchReason: string };

export interface PipelineDeps {
  repo: Repository;
  classifier: EmailClassifier;
  /** The student's own address, so their sent mail is skipped. */
  ownAddress: string | null;
  /** Below this, the email is queued for review rather than entering the
   *  pipeline as fact. Per-user; defaults to 0.75. */
  reviewThreshold: number;
}

/**
 * Runs one email end to end.
 *
 * Ordering is deliberate: the idempotency check comes **first**, before any
 * model call, so a re-read after a crash costs nothing and changes nothing.
 */
export async function processEmail(
  deps: PipelineDeps,
  userId: UserId,
  raw: RawEmail,
): Promise<ProcessOutcome> {
  const filtered = preFilter(raw, deps.ownAddress);
  if (filtered.skip) return { kind: "skipped", reason: filtered.reason! };

  // The unique constraint would catch this anyway, but checking first avoids
  // paying a model call to re-derive an answer already stored.
  if (await deps.repo.hasProcessedMessage(userId, raw.gmailMessageId)) {
    return { kind: "already-processed" };
  }

  const classified = await classifyOne(raw, deps.classifier);
  const c = classified.classification;

  // Not an application: counted, not stored. Nothing about this email is
  // written anywhere — no row, no id, no domain.
  if (!c.isApplication) return { kind: "not-application" };

  const common = {
    gmailMessageId: classified.gmailMessageId,
    gmailThreadId: classified.gmailThreadId,
    receivedAt: classified.receivedAt,
    senderDomain: classified.senderDomain,
    // Recorded per-email, not just per-job. A review item has no job yet, so
    // without these the student is asked to confirm a blank card (defect C7).
    detectedCompany: c.company,
    detectedRole: c.role,
    detectedStage: c.stage,
    detectedDeadlineAt: c.deadlineAt ? new Date(c.deadlineAt) : null,
    detectedNextAction: c.nextAction,
    confidence: c.confidence,
    classifierModel: classified.model,
  };

  // Below the gate the model is not confident enough for this to enter the
  // pipeline as fact. It becomes a question for the student instead — with no
  // job attached, so nothing is asserted until they confirm.
  if (c.confidence < deps.reviewThreshold) {
    const event = await deps.repo.insertEmailEvent(userId, {
      ...common,
      jobId: null,
      reviewStatus: "pending" satisfies ReviewStatus,
    });
    return { kind: "queued-for-review", eventId: event!.id };
  }

  // An application with no company cannot be matched or displayed usefully —
  // treat it as a question rather than inventing a job called "null".
  if (c.company === null || c.role === null) {
    const event = await deps.repo.insertEmailEvent(userId, {
      ...common,
      jobId: null,
      reviewStatus: "pending",
    });
    return { kind: "queued-for-review", eventId: event!.id };
  }

  const candidates: MatchCandidate[] = (await deps.repo.listJobs(userId)).map((job) => ({
    id: job.id,
    companyNormalised: job.companyNormalised,
    role: job.role,
    senderDomain: job.senderDomain,
  }));

  const match = findMatch(
    { company: c.company, role: c.role, senderDomain: classified.senderDomain },
    candidates,
  );

  if (match === null) {
    const job = await deps.repo.insertJob(userId, {
      company: c.company,
      companyNormalised: normaliseCompany(c.company),
      role: c.role,
      stage: c.stage ?? "applied",
      deadlineAt: common.detectedDeadlineAt,
      nextAction: c.nextAction,
      senderDomain: classified.senderDomain,
      confidence: c.confidence,
      firstSeenAt: classified.receivedAt,
      lastEventAt: classified.receivedAt,
    });

    for (const field of ["company", "role", "stage", "deadline_at", "next_action"] as const) {
      await deps.repo.setProvenance(userId, job!.id, field, "ai", c.confidence);
    }

    await deps.repo.insertEmailEvent(userId, {
      ...common,
      jobId: job!.id,
      reviewStatus: "auto_accepted",
    });

    return { kind: "created-job", jobId: job!.id };
  }

  const existing = await deps.repo.findJob(userId, match.candidate.id);
  const stageLocked = await deps.repo.isFieldLocked(userId, match.candidate.id, "stage");

  const stageDecision = decideStage({
    current: existing!.stage,
    detected: c.stage,
    humanLocked: stageLocked,
  });

  // The stage engine owns whether the stage moves. Passing it through to
  // applyExtraction unchanged would let a stale email drag a job backwards.
  await applyExtraction(
    deps.repo,
    userId,
    match.candidate.id,
    {
      company: c.company,
      role: c.role,
      stage: stageDecision.applies ? stageDecision.stage : null,
      deadlineAt: common.detectedDeadlineAt,
      nextAction: c.nextAction,
    },
    c.confidence,
  );

  // `lastEventAt` advances on every accepted email, including ones that changed
  // no field — an employer replying "still reviewing" is not a stale job.
  await deps.repo.updateJob(userId, match.candidate.id, {
    lastEventAt: classified.receivedAt,
  });

  await deps.repo.insertEmailEvent(userId, {
    ...common,
    jobId: match.candidate.id,
    reviewStatus: "auto_accepted",
  });

  return {
    kind: "updated-job",
    jobId: match.candidate.id,
    stageChanged: stageDecision.applies,
    matchReason: match.reason,
  };
}
