import { Router, type Request, type Response } from "express";
import { z } from "zod";
import {
  UpdateJobBodySchema,
  StageEnum,
  JobStatusEnum,
  type Job,
  type FieldProvenance,
  type EmailEvent,
} from "@gradtracker/shared";
import type { Repository } from "../db/repository.js";
import { rankJobs, pipelineStats, type RankedJob } from "../domain/ranking/rank.js";
import { deriveNextAction } from "../domain/stages/engine.js";
import { applyCorrection } from "../domain/provenance/apply.js";
import { validateBody, validateQuery, validated, param } from "../middleware/validate.js";

/**
 * Job routes (T4.4).
 *
 * Two behaviours worth stating outright, because both look like bugs to
 * someone who does not know why:
 *
 *   - A job belonging to another user returns **404, not 403**. A 403 confirms
 *     the record exists, which is itself a disclosure.
 *   - The ranking is **not** overridable by the client. There is no `?sort=`.
 *     A student who can sort by company name has rebuilt their spreadsheet,
 *     which is the thing this product exists to replace.
 */

const ListQuerySchema = z.object({
  status: JobStatusEnum.default("active"),
  stage: z
    .union([StageEnum, z.array(StageEnum)])
    .optional()
    .transform((v) => (v === undefined ? undefined : Array.isArray(v) ? v : [v])),
});

type DbJob = Awaited<ReturnType<Repository["listJobs"]>>[number];

function toJob(ranked: RankedJob<DbJob>, provenance: FieldProvenance[], now: Date): Job {
  const job = ranked.job;
  return {
    id: job.id,
    company: job.company,
    role: job.role,
    stage: job.stage,
    deadlineAt: job.deadlineAt?.toISOString() ?? null,
    nextAction: deriveNextAction({
      stage: job.stage,
      extracted: job.nextAction,
      followUpRequired: ranked.followUpRequired,
      daysSinceLastEvent: (now.getTime() - job.lastEventAt.getTime()) / 86_400_000,
    }),
    senderDomain: job.senderDomain,
    confidence: job.confidence,
    status: job.status,
    firstSeenAt: job.firstSeenAt.toISOString(),
    lastEventAt: job.lastEventAt.toISOString(),
    daysLeft: ranked.daysLeft,
    followUpRequired: ranked.followUpRequired,
    provenance,
  };
}

function toProvenance(rows: Awaited<ReturnType<Repository["listProvenance"]>>): FieldProvenance[] {
  return rows.map((r) => ({
    field: r.field,
    source: r.source,
    confidence: r.confidence,
    updatedAt: r.updatedAt.toISOString(),
  }));
}

function toEvent(row: Awaited<ReturnType<Repository["listEventsForJob"]>>[number]): EmailEvent {
  return {
    id: row.id,
    gmailMessageId: row.gmailMessageId,
    gmailThreadId: row.gmailThreadId,
    receivedAt: row.receivedAt.toISOString(),
    senderDomain: row.senderDomain,
    detectedStage: row.detectedStage,
    detectedDeadlineAt: row.detectedDeadlineAt?.toISOString() ?? null,
    detectedNextAction: row.detectedNextAction,
    confidence: row.confidence,
    reviewStatus: row.reviewStatus,
  };
}

export function jobRoutes(repo: Repository, clock: () => Date = () => new Date()): Router {
  const router = Router();

  // ── GET /api/jobs ─────────────────────────────────────────────────────────
  router.get(
    "/",
    validateQuery(ListQuerySchema),
    async (req: Request, res: Response): Promise<void> => {
      const query = validated<z.infer<typeof ListQuerySchema>>(req);
      const now = clock();

      const rows = await repo.listJobs(req.userId, {
        status: query.status,
        ...(query.stage ? { stages: query.stage } : {}),
      });

      // Terminal stages are excluded from Active but must appear on Archived,
      // otherwise a rejected job vanishes from the product entirely.
      const ranked = rankJobs(rows, {
        now,
        timeZone: req.timeZone,
        includeTerminal: query.status === "archived",
      });

      const jobs = await Promise.all(
        ranked.map(async (r) => toJob(r, toProvenance(await repo.listProvenance(req.userId, r.job.id)), now)),
      );

      const sync = await repo.getSyncState(req.userId);
      res.json({
        jobs,
        stats: pipelineStats(ranked, {
          needsReview: (await repo.listPendingReview(req.userId)).length,
          emailsRead: sync?.emailsReadTotal ?? 0,
        }),
      });
    },
  );

  // ── GET /api/jobs/:id ─────────────────────────────────────────────────────
  router.get("/:id", async (req: Request, res: Response): Promise<void> => {
    const row = await repo.findJob(req.userId, param(req, "id"));
    if (!row) {
      // 404 for "not yours" as well as "does not exist". The caller must not be
      // able to tell the two apart.
      res.status(404).json({ error: "Application not found." });
      return;
    }

    const now = clock();
    const [ranked] = rankJobs([row], { now, timeZone: req.timeZone, includeTerminal: true });
    const provenance = toProvenance(await repo.listProvenance(req.userId, row.id));
    const timeline = (await repo.listEventsForJob(req.userId, row.id)).map(toEvent);

    res.json({ job: toJob(ranked!, provenance, now), timeline });
  });

  // ── PATCH /api/jobs/:id ───────────────────────────────────────────────────
  // The only path that may overwrite a human-locked field, because a human is
  // the one doing it.
  router.patch(
    "/:id",
    validateBody(UpdateJobBodySchema),
    async (req: Request, res: Response): Promise<void> => {
      const jobId = param(req, "id");
      if (!(await repo.findJob(req.userId, jobId))) {
        res.status(404).json({ error: "Application not found." });
        return;
      }

      const body = req.body as z.infer<typeof UpdateJobBodySchema>;
      const corrected = await applyCorrection(repo, req.userId, jobId, {
        ...(body.company !== undefined ? { company: body.company } : {}),
        ...(body.role !== undefined ? { role: body.role } : {}),
        ...(body.stage !== undefined ? { stage: body.stage } : {}),
        ...(body.deadlineAt !== undefined
          ? { deadlineAt: body.deadlineAt === null ? null : new Date(body.deadlineAt) }
          : {}),
        ...(body.nextAction !== undefined ? { nextAction: body.nextAction } : {}),
      });

      const row = (await repo.findJob(req.userId, jobId))!;
      const now = clock();
      const [ranked] = rankJobs([row], { now, timeZone: req.timeZone, includeTerminal: true });

      res.json({
        job: toJob(ranked!, toProvenance(await repo.listProvenance(req.userId, jobId)), now),
        corrected,
      });
    },
  );

  // ── POST /api/jobs/:id/withdraw ───────────────────────────────────────────
  router.post("/:id/withdraw", async (req: Request, res: Response): Promise<void> => {
    const jobId = param(req, "id");
    if (!(await repo.findJob(req.userId, jobId))) {
      res.status(404).json({ error: "Application not found." });
      return;
    }

    // Withdrawing sets BOTH the stage and the archived status. The stage is
    // what the timeline and badge show; the status is what the Active tab
    // filters on. Setting only one leaves the job visible in a list it should
    // have left — the gap the harvest surfaced on the rejected KPMG job.
    await applyCorrection(repo, req.userId, jobId, { stage: "withdrawn" });
    await repo.updateJob(req.userId, jobId, { status: "archived" });

    res.json({ ok: true });
  });

  return router;
}
