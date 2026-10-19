import { Router, type Request, type Response } from "express";
import type { ListOpeningsResponse, OpeningItem } from "@gradtracker/shared";
import type { Repository } from "../db/repository.js";
import { daysUntil } from "../domain/ranking/rank.js";
import { findMatch, normaliseCompany, type MatchCandidate } from "../domain/matching/match.js";

/**
 * Openings (D43): jobs a student could apply for, read from job alerts and
 * careers emails.
 *
 *   GET  /api/openings              open ones, soonest closing first
 *   POST /api/openings/:id/dismiss  not interested
 *   POST /api/openings/:id/applied  "I've applied" — becomes an application
 *
 * A closed opening is not shown: there is nothing left to do with it. Nor is
 * one the student has already applied for — that is an application now, and
 * listing it twice would say otherwise.
 */
export function openingRoutes(repo: Repository, clock: () => Date = () => new Date()): Router {
  const router = Router();

  const candidates = async (req: Request): Promise<MatchCandidate[]> =>
    (await repo.listJobs(req.userId)).map((job) => ({
      id: job.id,
      companyNormalised: job.companyNormalised,
      role: job.role,
      senderDomain: job.senderDomain,
    }));

  router.get("/", async (req: Request, res: Response): Promise<void> => {
    const now = clock();
    const [rows, jobs] = await Promise.all([repo.listOpenings(req.userId), candidates(req)]);

    const openings: OpeningItem[] = rows
      .map((row) => ({
        row,
        daysLeft: row.closesAt ? daysUntil(row.closesAt, now, req.timeZone) : null,
      }))
      .filter(({ daysLeft }) => daysLeft === null || daysLeft >= 0)
      .filter(({ row }) => findMatch({ company: row.company, role: row.role, senderDomain: null }, jobs)?.kind !== "match")
      // Soonest closing first; those with no closing date after, newest first.
      .sort((a, b) => {
        if (a.daysLeft !== null && b.daysLeft !== null) return a.daysLeft - b.daysLeft;
        if (a.daysLeft !== null) return -1;
        if (b.daysLeft !== null) return 1;
        return b.row.firstSeenAt.getTime() - a.row.firstSeenAt.getTime();
      })
      .map(({ row, daysLeft }) => ({
        id: row.id,
        company: row.company,
        role: row.role,
        location: row.location,
        closesAt: row.closesAt?.toISOString() ?? null,
        daysLeft,
        source: row.source,
        senderDomain: row.senderDomain,
        gmailMessageId: row.gmailMessageId,
        firstSeenAt: row.firstSeenAt.toISOString(),
      }));

    const body: ListOpeningsResponse = { openings };
    res.json(body);
  });

  router.post("/:id/dismiss", async (req: Request, res: Response): Promise<void> => {
    const row = await repo.setOpeningStatus(req.userId, String(req.params["id"]), "dismissed");
    if (!row) {
      res.status(404).json({ error: "No such opening." });
      return;
    }
    res.json({ ok: true });
  });

  /**
   * "I've applied": the opening becomes an application at Applied — the
   * student's own statement, so its company, role and stage are theirs
   * (human provenance), and no email will overrule them except a newer one
   * (D36). An application already tracked for the same job is used instead.
   */
  router.post("/:id/applied", async (req: Request, res: Response): Promise<void> => {
    const opening = await repo.findOpening(req.userId, String(req.params["id"]));
    if (!opening) {
      res.status(404).json({ error: "No such opening." });
      return;
    }

    const existing = findMatch({ company: opening.company, role: opening.role, senderDomain: null }, await candidates(req));
    let jobId: string;
    if (existing?.kind === "match") {
      jobId = existing.candidate.id;
    } else {
      const now = clock();
      const job = await repo.insertJob(req.userId, {
        company: opening.company,
        companyNormalised: normaliseCompany(opening.company),
        role: opening.role,
        stage: "applied",
        deadlineAt: null,
        nextAction: null,
        // The job board is not the employer: its domain would mislead matching.
        senderDomain: null,
        confidence: 1,
        firstSeenAt: now,
        lastEventAt: now,
      });
      jobId = job!.id;
      for (const field of ["company", "role", "stage"] as const) {
        await repo.setProvenance(req.userId, jobId, field, "human", null);
      }
    }

    await repo.setOpeningStatus(req.userId, opening.id, "applied");
    res.json({ jobId, created: existing?.kind !== "match" });
  });

  return router;
}
