import { Router, type Request, type Response } from "express";
import { UpdateSettingsBodySchema, type SettingsResponse, type UpdateSettingsBody } from "@gradtracker/shared";
import type { Repository } from "../db/repository.js";
import { validateBody } from "../middleware/validate.js";

/**
 * Settings routes (T4.10).
 *
 * One setting today: the review threshold, `users.review_threshold` (D28). The
 * column has existed since T1.4, but until now nothing read it — `/api/me`
 * reported the constant and the harvest importer passed its own 0.75.
 *
 * A change applies to **newly ingested mail only**. Nothing here re-routes
 * stored mail: doing so would un-assert applications the student may already
 * have acted on. The pipeline reads the threshold on every email, so the next
 * one ingested is routed by the new value.
 */

export function settingsRoutes(repo: Repository): Router {
  const router = Router();

  // ── GET /api/settings ─────────────────────────────────────────────────────
  router.get("/", async (req: Request, res: Response): Promise<void> => {
    const settings = await repo.getSettings(req.userId);
    if (!settings) {
      res.status(404).json({ error: "Not found." });
      return;
    }
    res.json({ reviewThreshold: settings.reviewThreshold } satisfies SettingsResponse);
  });

  // ── PATCH /api/settings ───────────────────────────────────────────────────
  router.patch(
    "/",
    validateBody(UpdateSettingsBodySchema),
    async (req: Request, res: Response): Promise<void> => {
      const settings = await repo.updateSettings(req.userId, req.body as UpdateSettingsBody);
      if (!settings) {
        res.status(404).json({ error: "Not found." });
        return;
      }
      res.json({ reviewThreshold: settings.reviewThreshold } satisfies SettingsResponse);
    },
  );

  return router;
}
