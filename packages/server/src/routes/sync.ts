import { Router, type Request, type Response } from "express";
import type { SyncResult, SyncStatusResponse } from "@gradtracker/shared";
import type { Repository } from "../db/repository.js";
import type { EmailClassifier, MailboxReader, RawEmail } from "../ports/index.js";
import { ingestEmails } from "../domain/classify/ingest.js";

/**
 * Sync routes (T4.6, D36).
 *
 * `GET /api/sync/status` reads `sync_state`, so the dashboard can honestly
 * render "Synced 4 minutes ago · 612 emails read".
 *
 * `POST /api/sync` is the Refresh button. In the presentation demo it reads the
 * demo inbox over IMAP and runs whatever arrived through the real pipeline
 * (D36). Anywhere else — the dev server over a harvested `dev.db` — there is no
 * inbox to read, so it returns **501** with a message saying why. A Refresh
 * button that appears to work and does not is worse than one that says it
 * cannot.
 *
 * `POST /api/sync/backup` is the presenter's fallback when Gmail or the
 * venue's network fails: it feeds the same pre-written emails through the same
 * pipeline, so the room sees exactly what a live Refresh would have shown.
 */

export interface DemoSyncOptions {
  /** Null when GMAIL_DEMO_USER / GMAIL_DEMO_APP_PASSWORD are not set. */
  inbox: MailboxReader | null;
  classifier: EmailClassifier;
  /** Mail that arrived before the demo started is not the demo's business. */
  startedAt: Date;
  /** The demo inbox's own address, so its sent mail is skipped. */
  ownAddress: string | null;
  /** The pre-written emails, stamped with the time of the press. */
  backupEmails: (now: Date) => RawEmail[];
}

const NO_INBOX =
  "The demo inbox is not configured. Set GMAIL_DEMO_USER and GMAIL_DEMO_APP_PASSWORD in .env and restart npm run demo.";

export function syncRoutes(repo: Repository, demo?: DemoSyncOptions): Router {
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

  if (!demo) {
    router.post("/", (_req: Request, res: Response): void => {
      res.status(501).json({
        error:
          "Live sync is not available here. The pipeline was populated by a one-off harvest; Refresh reads mail only in the presentation demo (npm run demo).",
      });
    });
    return router;
  }

  const deps = { repo, classifier: demo.classifier, ownAddress: demo.ownAddress };

  router.post("/", async (req: Request, res: Response): Promise<void> => {
    if (!demo.inbox) {
      res.status(503).json({ error: NO_INBOX });
      return;
    }

    let emails: RawEmail[];
    try {
      emails = await demo.inbox.readSince(demo.startedAt);
    } catch (error) {
      // The message names the account and the setting, never the password.
      res.status(502).json({ error: error instanceof Error ? error.message : "Could not read the demo inbox." });
      return;
    }

    const result: SyncResult = await ingestEmails(deps, req.userId, emails);
    res.json(result);
  });

  router.post("/backup", async (req: Request, res: Response): Promise<void> => {
    const result: SyncResult = await ingestEmails(deps, req.userId, demo.backupEmails(new Date()));
    res.json(result);
  });

  return router;
}
