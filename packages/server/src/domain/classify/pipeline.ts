import {
  USER_ONLY_STAGES,
  type Classification,
  type ClassifierModel,
  type ReviewStatus,
  type UserId,
} from "@gradtracker/shared";
import type { EmailClassifier, RawEmail } from "../../ports/index.js";
import { senderDomain } from "../../ports/index.js";
import type { Repository } from "../../db/repository.js";
import { findMatch, normaliseCompany, type MatchCandidate } from "../matching/match.js";
import { applyEmailToJob } from "./apply-email.js";

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
  | { kind: "updated-job"; jobId: string; stageChanged: boolean };

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
 *
 * Nothing here archives a job. A job reaching a terminal stage is archived by
 * the repository, which derives status from stage on every write (T4.9).
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

  // Where the email would go, worked out before the review gates: an email
  // sent to review can then name the application it probably belongs to.
  const match =
    c.company !== null && c.role !== null
      ? findMatch(
          { company: c.company, role: c.role, senderDomain: classified.senderDomain },
          (await deps.repo.listJobs(userId)).map(
            (job): MatchCandidate => ({
              id: job.id,
              companyNormalised: job.companyNormalised,
              role: job.role,
              senderDomain: job.senderDomain,
            }),
          ),
        )
      : null;

  // A question for the student instead of a fact — with no job attached, so
  // nothing is asserted until they confirm. One helper for every reason to ask,
  // and each question names the likely application, so the card can ask "the
  // same application, or a new one?" (D26).
  const askTheStudent = async (): Promise<ProcessOutcome> => {
    const event = await deps.repo.insertEmailEvent(userId, {
      ...common,
      jobId: null,
      reviewStatus: "pending" satisfies ReviewStatus,
      suggestedJobId: match?.candidate.id ?? null,
    });
    return { kind: "queued-for-review", eventId: event!.id };
  };

  // Below the gate the model is not confident enough for this to enter the
  // pipeline as fact.
  if (c.confidence < deps.reviewThreshold) return askTheStudent();

  // The model may recognise a withdrawal; only the student may apply one.
  // Checked before matching, so it holds on every path — a new application
  // was once created straight into `withdrawn` (defect C17).
  if (c.stage !== null && USER_ONLY_STAGES.has(c.stage)) return askTheStudent();

  // An application with no company cannot be matched or displayed usefully —
  // treat it as a question rather than inventing a job called "null".
  if (c.company === null || c.role === null) return askTheStudent();

  // The same company and sender but a clearly different role: a renamed role,
  // or a second application through the same employer's system. Never merged
  // on that alone (D26) — that merge once overwrote an application (C18).
  if (match?.kind === "ambiguous") return askTheStudent();

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

  // The stage engine, the human locks and the order of arrival are all handled
  // in the one step the review queue shares (T3.11).
  const applied = await applyEmailToJob(deps.repo, userId, match.candidate.id, {
    receivedAt: classified.receivedAt,
    company: c.company,
    role: c.role,
    stage: c.stage,
    deadlineAt: common.detectedDeadlineAt,
    nextAction: c.nextAction,
    confidence: c.confidence,
  });

  await deps.repo.insertEmailEvent(userId, {
    ...common,
    jobId: match.candidate.id,
    reviewStatus: "auto_accepted",
  });

  return { kind: "updated-job", jobId: match.candidate.id, stageChanged: applied.stageChanged };
}
