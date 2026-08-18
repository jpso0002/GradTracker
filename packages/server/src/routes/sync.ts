import { Router, type Request, type Response } from "express";
import type { SyncStatusResponse } from "@gradtracker/shared";
import type { Repository } from "../db/repository.js";

/**
 * Sync routes (T4.6) — **partial on the demo track.**
 *
 * `GET /api/sync/status` is fully implemented: it reads `sync_state`, which the
 * harvest populates, so the dashboard can honestly render "Synced 4 minutes
 * ago · 612 emails read".
 *
 * `POST /api/sync` is **not** implemented, because T3.8 (the sync orchestrator)
 * is deferred and the harvest replaces it. Rather than pretend — returning a
 * fake success, or silently doing nothing — it returns **501 Not Implemented**
 * with a message saying why. A "Refresh" button that appears to work and does
 * not is worse than one that says it cannot.
 */

export function syncRoutes(repo: Repository): Router {
  const router = Router();

  router.get("/status", async (req: Request, res: Response): Promise<void> => {
    const state = await repo.getSyncState(req.userId);

    const body: SyncStatusResponse = {
      state: state?.state ?? "idle",
      lastSyncAt: state?.lastFullScanAt?.toISOString() ?? null,
      emailsReadTotal: state?.emailsReadTotal ?? 0,
      progress: null,
      lastError: state?.lastError ?? null,
    };

    res.json(body);
  });

  router.post("/", (_req: Request, res: Response): void => {
    res.status(501).json({
      error:
        "Live sync is not available in demo mode. The pipeline was populated by a one-off harvest; incremental sync arrives with T3.8 and T7.2.",
    });
  });

  return router;
}
