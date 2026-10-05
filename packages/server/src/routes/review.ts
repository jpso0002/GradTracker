import { Router, type Request, type Response } from "express";
import {
  ConfirmReviewBodySchema,
  USER_ONLY_STAGES,
  type ConfirmReviewBody,
  type ReviewItem,
} from "@gradtracker/shared";
import type { Repository } from "../db/repository.js";
import { findMatch, normaliseCompany, type MatchCandidate } from "../domain/matching/match.js";
import { applyCorrection, type ExtractedFields } from "../domain/provenance/apply.js";
import { applyEmailToJob } from "../domain/classify/apply-email.js";
import { validateBody, param } from "../middleware/validate.js";

/**
 * Review queue routes (T4.5).
 *
 * The queue holds emails the pipeline would not assert on its own: too little
 * confidence, a stage only the student may set, or an application it could not
 * tell apart from one already tracked (D26). Nothing here has a job yet.
 *
 * Confirming does one of two things:
 *
 *   - **Onto a new application**, the card *is* the application, so every
 *     confirmed field is written as `human` (T4.8).
 *   - **Onto an existing application**, the email is applied the way the
 *     pipeline applies any email — stage through the stage engine, older news
 *     never overriding newer — and only the fields the student changed become
 *     `human` (T3.11). Writing everything as human here once moved stages and
 *     dates backwards and locked fields for good (C16).
 */

export function reviewRoutes(repo: Repository): Router {
  const router = Router();

  // ── GET /api/review ───────────────────────────────────────────────────────
  router.get("/", async (req: Request, res: Response): Promise<void> => {
    const rows = await repo.listPendingReview(req.userId);

    const items: ReviewItem[] = await Promise.all(
      rows.map(async (row) => {
        const suggested = row.suggestedJobId ? await repo.findJob(req.userId, row.suggestedJobId) : undefined;
        return {
          eventId: row.id,
          receivedAt: row.receivedAt.toISOString(),
          senderDomain: row.senderDomain,
          company: row.detectedCompany,
          role: row.detectedRole,
          stage: row.detectedStage,
          deadlineAt: row.detectedDeadlineAt?.toISOString() ?? null,
          nextAction: row.detectedNextAction,
          confidence: row.confidence,
          suggestedJob: suggested ? { id: suggested.id, company: suggested.company, role: suggested.role } : null,
        };
      }),
    );

    res.json({ items });
  });

  // ── POST /api/review/:eventId/confirm ─────────────────────────────────────
  router.post(
    "/:eventId/confirm",
    validateBody(ConfirmReviewBodySchema),
    async (req: Request, res: Response): Promise<void> => {
      const eventId = param(req, "eventId");
      const pending = (await repo.listPendingReview(req.userId)).find((e) => e.id === eventId);

      if (!pending) {
        // Covers "not yours", "already handled" and "never existed" alike.
        res.status(404).json({ error: "Review item not found." });
        return;
      }

      const body = req.body as ConfirmReviewBody;
      // The fields the student changed on the card. An untouched card sends
      // none — the common case, meaning "yes, as shown".
      const corrections = body.corrections ?? {};

      // A suggestion is a question, and confirming has to answer it (D26).
      const suggested = pending.suggestedJobId
        ? await repo.findJob(req.userId, pending.suggestedJobId)
        : undefined;
      if (suggested && body.application === undefined) {
        res.status(400).json({
          error: "This email may belong to an application you already track. Is it the same application, or a new one?",
          field: "application",
          suggestedJobId: suggested.id,
        });
        return;
      }
      if (!suggested && body.application === "same") {
        res.status(400).json({ error: "There is no suggested application to attach this email to.", field: "application" });
        return;
      }

      const company = corrections.company ?? pending.detectedCompany;
      const role = corrections.role ?? pending.detectedRole;

      if (company === null || role === null) {
        // Reachable when the classifier extracted neither and the student
        // supplied neither. A confirmed application still needs somewhere to
        // live; rather than inventing a job called "null", say what is missing.
        res.status(400).json({
          error: "A company and role are required to confirm an application.",
          field: company === null ? "company" : "role",
        });
        return;
      }

      // Which application the email belongs to. Without a suggestion, only a
      // clear match attaches: a match on company and sender alone is not a
      // match (D26), and nothing asked the student, so it starts a new one.
      let target: string | null;
      if (body.application === "same") {
        target = suggested!.id;
      } else if (body.application === "new") {
        target = null;
      } else {
        const candidates: MatchCandidate[] = (await repo.listJobs(req.userId)).map((job) => ({
          id: job.id,
          companyNormalised: job.companyNormalised,
          role: job.role,
          senderDomain: job.senderDomain,
        }));
        const match = findMatch({ company, role, senderDomain: pending.senderDomain }, candidates);
        target = match?.kind === "match" ? match.candidate.id : null;
      }

      const correctedDeadline =
        corrections.deadlineAt === undefined
          ? undefined
          : corrections.deadlineAt === null
            ? null
            : new Date(corrections.deadlineAt);

      let jobId: string;

      if (target !== null) {
        // ── Onto an existing application (T3.11) ─────────────────────────
        const human: Partial<ExtractedFields> = {
          ...(corrections.company !== undefined ? { company: corrections.company } : {}),
          ...(corrections.role !== undefined ? { role: corrections.role } : {}),
          ...(corrections.stage !== undefined ? { stage: corrections.stage } : {}),
          ...(correctedDeadline !== undefined ? { deadlineAt: correctedDeadline } : {}),
          ...(corrections.nextAction !== undefined ? { nextAction: corrections.nextAction } : {}),
        };
        // Confirming a withdrawal *is* the student's act — the only way an
        // email ever sets a stage only the student may set (C17).
        if (human.stage === undefined && pending.detectedStage !== null && USER_ONLY_STAGES.has(pending.detectedStage)) {
          human.stage = pending.detectedStage;
        }

        // The email's own values for everything the student left alone,
        // applied exactly as the pipeline applies any email.
        await applyEmailToJob(repo, req.userId, target, {
          receivedAt: pending.receivedAt,
          company: human.company === undefined ? pending.detectedCompany : null,
          role: human.role === undefined ? pending.detectedRole : null,
          stage: human.stage === undefined ? pending.detectedStage : null,
          deadlineAt: human.deadlineAt === undefined ? pending.detectedDeadlineAt : null,
          nextAction: human.nextAction === undefined ? pending.detectedNextAction : null,
          confidence: pending.confidence,
        });
        await applyCorrection(repo, req.userId, target, human);
        jobId = target;
      } else {
        // ── A new application: the card is the application (T4.8) ─────────
        const stage = corrections.stage ?? pending.detectedStage ?? "applied";
        const deadlineAt = correctedDeadline !== undefined ? correctedDeadline : pending.detectedDeadlineAt;
        const nextAction = corrections.nextAction !== undefined ? corrections.nextAction : pending.detectedNextAction;

        const job = await repo.insertJob(req.userId, {
          company,
          companyNormalised: normaliseCompany(company),
          role,
          stage,
          deadlineAt,
          nextAction,
          senderDomain: pending.senderDomain,
          confidence: pending.confidence,
          firstSeenAt: pending.receivedAt,
          lastEventAt: pending.receivedAt,
        });
        // Everything the student saw and accepted becomes human-verified.
        await applyCorrection(repo, req.userId, job!.id, { company, role, stage, deadlineAt, nextAction });
        jobId = job!.id;
      }

      await repo.updateEmailEvent(req.userId, eventId, { jobId, reviewStatus: "confirmed" });

      res.json({ jobId, matched: target !== null });
    },
  );

  // ── POST /api/review/:eventId/dismiss ─────────────────────────────────────
  router.post("/:eventId/dismiss", async (req: Request, res: Response): Promise<void> => {
    const eventId = param(req, "eventId");
    const pending = (await repo.listPendingReview(req.userId)).find((e) => e.id === eventId);

    if (!pending) {
      res.status(404).json({ error: "Review item not found." });
      return;
    }

    // Marked dismissed, never deleted. The row keeps its Gmail message id, and
    // the unique constraint on (user_id, gmail_message_id) is what guarantees
    // a re-sync cannot resurrect an email the student has already rejected.
    await repo.updateEmailEvent(req.userId, eventId, { reviewStatus: "dismissed" });

    res.json({ ok: true });
  });

  return router;
}
