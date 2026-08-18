import { Router, type Request, type Response } from "express";
import { ConfirmReviewBodySchema, type ReviewItem } from "@gradtracker/shared";
import type { Repository } from "../db/repository.js";
import { findMatch, normaliseCompany, type MatchCandidate } from "../domain/matching/match.js";
import { applyCorrection } from "../domain/provenance/apply.js";
import { validateBody, param } from "../middleware/validate.js";

/**
 * Review queue routes (T4.5).
 *
 * The queue holds emails the classifier was not confident enough about to
 * assert. Nothing here has a job yet — that is the point. Confirming is the
 * moment a machine guess becomes a human fact, so **every field the student
 * confirms is written as `human`**, not `ai`: they looked at it and said yes,
 * and a later sync must not overwrite that.
 */

export function reviewRoutes(repo: Repository): Router {
  const router = Router();

  // ── GET /api/review ───────────────────────────────────────────────────────
  router.get("/", async (req: Request, res: Response): Promise<void> => {
    const rows = await repo.listPendingReview(req.userId);

    const items: ReviewItem[] = rows.map((row) => ({
      eventId: row.id,
      receivedAt: row.receivedAt.toISOString(),
      senderDomain: row.senderDomain,
      company: row.detectedCompany,
      role: row.detectedRole,
      stage: row.detectedStage,
      deadlineAt: row.detectedDeadlineAt?.toISOString() ?? null,
      nextAction: row.detectedNextAction,
      confidence: row.confidence,
    }));

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

      const corrections = (req.body as { corrections?: Record<string, unknown> }).corrections ?? {};

      // A correction wins; otherwise the detected value stands. Confirming a
      // card the student did not edit is the common case, so an empty
      // `corrections` object must succeed — it means "yes, as shown".
      const company = (corrections["company"] as string | undefined) ?? pending.detectedCompany;
      const role = (corrections["role"] as string | undefined) ?? pending.detectedRole;

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

      const candidates: MatchCandidate[] = (await repo.listJobs(req.userId)).map((job) => ({
        id: job.id,
        companyNormalised: job.companyNormalised,
        role: job.role,
        senderDomain: job.senderDomain,
      }));

      const match = findMatch({ company, role, senderDomain: pending.senderDomain }, candidates);
      const stage = (corrections["stage"] as never) ?? pending.detectedStage ?? "applied";
      const deadline = corrections["deadlineAt"] as string | null | undefined;
      const deadlineAt =
        deadline !== undefined
          ? deadline === null
            ? null
            : new Date(deadline)
          : pending.detectedDeadlineAt;

      let jobId: string;

      if (match) {
        jobId = match.candidate.id;
        await repo.updateJob(req.userId, jobId, { lastEventAt: pending.receivedAt });
      } else {
        const job = await repo.insertJob(req.userId, {
          company,
          companyNormalised: normaliseCompany(company),
          role,
          stage,
          deadlineAt,
          nextAction: (corrections["nextAction"] as string | undefined) ?? pending.detectedNextAction,
          senderDomain: pending.senderDomain,
          confidence: pending.confidence,
          firstSeenAt: pending.receivedAt,
          lastEventAt: pending.receivedAt,
        });
        jobId = job!.id;
      }

      // Everything the student saw and accepted becomes human-verified. They
      // reviewed it; the pipeline does not get to revisit it.
      await applyCorrection(repo, req.userId, jobId, {
        company,
        role,
        stage,
        deadlineAt,
        nextAction: (corrections["nextAction"] as string | undefined) ?? pending.detectedNextAction,
      });

      await repo.updateEmailEvent(req.userId, eventId, {
        jobId,
        reviewStatus: "confirmed",
      });

      res.json({ jobId, matched: match !== null });
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
