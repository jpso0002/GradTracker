import { Router, type Request, type Response } from "express";
import type { DemoScanResponse, SyncResult, SyncStatusResponse, UserId } from "@gradtracker/shared";
import type { Repository } from "../db/repository.js";
import type { EmailClassifier, MailboxReader, RawEmail } from "../ports/index.js";
import { ingestEmails } from "../domain/classify/ingest.js";
import { mayConnectInbox } from "./auth.js";

/**
 * Sync routes (T4.6, D36, D37).
 *
 * `GET /api/sync/status` reads `sync_state`, so the dashboard can honestly
 * render "Synced 4 minutes ago · 612 emails read".
 *
 * `POST /api/sync` is the Refresh button. In the presentation demo it reads the
 * demo inbox over IMAP and runs whatever a person sent since the demo started
 * through the real pipeline (D36). Anywhere else — the dev server over a
 * harvested `dev.db` — there is no inbox to read, so it returns **501** with a
 * message saying why. A Refresh button that appears to work and does not is
 * worse than one that says it cannot.
 *
 * `POST /api/sync/backup` is the presenter's fallback when Gmail or the
 * venue's network fails: it feeds the same pre-written emails through the same
 * pipeline, so the room sees exactly what a live Refresh would have shown.
 *
 * `demoRoutes` — `/api/demo/scan` and `/api/demo/reset` — start the
 * presentation over: the opening scan reads the sample emails loaded into the
 * demo inbox (D37), and reset empties the dashboard for it.
 */

/** Everything the presentation demo needs between requests. */
export interface DemoSession {
  /** Null when GMAIL_DEMO_USER / GMAIL_DEMO_APP_PASSWORD are not set. */
  inbox: MailboxReader | null;
  /** The demo inbox's address — skipped as a sender, and named on screen. */
  inboxAddress: string | null;
  classifier: EmailClassifier;
  /** Mail a person sent before this is not the demo's business. Moved on by
   *  the opening scan and by reset. */
  startedAt: Date;
  /** The pre-written emails, stamped with the time of the press. */
  backupEmails: (now: Date) => RawEmail[];
  /** The loaded samples, brought up to date (D37). */
  rebaseSamples: (emails: RawEmail[], now: Date) => RawEmail[];
  /** Empties this student's dashboard; every other account is untouched. */
  clear: (userId: UserId) => Promise<void>;
  /** Fills it with the seeded sample mailbox instead (D35). */
  seed: (userId: UserId) => Promise<void>;
}

/** Only the demo inbox's own account may read it (D40). Answers for the
 *  request and says so when it may not; true when it may. */
function ownsInbox(req: Request, res: Response, demo: DemoSession): boolean {
  if (mayConnectInbox(req.accountEmail, demo.inboxAddress)) return true;
  res.status(403).json({ error: `Only ${demo.inboxAddress} can connect the demo inbox. This account's Gmail isn't connected in the demo.` });
  return false;
}

const NO_INBOX =
  "The demo inbox is not configured. Set GMAIL_DEMO_USER and GMAIL_DEMO_APP_PASSWORD in .env and restart npm run demo.";

export function syncRoutes(repo: Repository, demo?: DemoSession): Router {
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

  const deps = { repo, classifier: demo.classifier, ownAddress: demo.inboxAddress };

  router.post("/", async (req: Request, res: Response): Promise<void> => {
    if (!ownsInbox(req, res, demo)) return;
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
    if (!ownsInbox(req, res, demo)) return;
    const result: SyncResult = await ingestEmails(deps, req.userId, demo.backupEmails(new Date()));
    res.json(result);
  });

  return router;
}

export function demoRoutes(repo: Repository, demo: DemoSession): Router {
  const router = Router();
  const deps = { repo, classifier: demo.classifier, ownAddress: demo.inboxAddress };

  // One at a time: the scan empties the dashboard first, so two overlapping
  // scans (a double-mounted screen in development) would interleave.
  let queue: Promise<unknown> = Promise.resolve();
  const serially = <T>(work: () => Promise<T>): Promise<T> => {
    const next = queue.then(work, work);
    queue = next.catch(() => undefined);
    return next;
  };

  /** The seeded sample mailbox, counted as a scan would report it. */
  const fromSample = async (userId: UserId, notice: string | null): Promise<DemoScanResponse> => {
    await demo.seed(userId);
    const [active, archived, review, sync] = await Promise.all([
      repo.listJobs(userId, { status: "active" }),
      repo.listJobs(userId, { status: "archived" }),
      repo.listPendingReview(userId),
      repo.getSyncState(userId),
    ]);
    return {
      emailsRead: sync?.emailsReadTotal ?? 0,
      newApplications: active.length + archived.length,
      updatedApplications: 0,
      stageChanges: 0,
      newOpenings: 0,
      needsReview: review.length,
      ignored: 0,
      source: "sample",
      inbox: null,
      notice,
    };
  };

  /**
   * The opening scan: the sample emails in the demo inbox, through the real
   * pipeline, onto an empty dashboard. When the inbox cannot be read, the
   * seeded sample mailbox instead — and the response says so.
   */
  router.post("/scan", async (req: Request, res: Response): Promise<void> => {
    if (!ownsInbox(req, res, demo)) return;
    const body = await serially(async (): Promise<DemoScanResponse> => {
      const now = new Date();
      await demo.clear(req.userId);
      demo.startedAt = now;

      if (!demo.inbox) return fromSample(req.userId, null);

      let samples: RawEmail[];
      try {
        samples = await demo.inbox.readSamples();
      } catch (error) {
        const reason = error instanceof Error ? error.message : "Could not read the demo inbox.";
        return fromSample(req.userId, `${reason} Showing the sample mailbox instead.`);
      }
      if (samples.length === 0) {
        return fromSample(
          req.userId,
          "The demo inbox has no sample emails yet. Run npm run demo:load-inbox. Showing the sample mailbox instead.",
        );
      }

      const result = await ingestEmails(deps, req.userId, demo.rebaseSamples(samples, now), now);
      return { ...result, source: "inbox", inbox: demo.inboxAddress, notice: null };
    });
    res.json(body);
  });

  /** Back to the start of the presentation: an empty dashboard for the scan to
   *  fill, or the seeded sample mailbox when there is no inbox to scan. */
  /** Empties the signed-in account's dashboard. For the demo inbox's account
   *  that re-arms the opening scan; without an inbox, the sample mailbox. */
  router.post("/reset", async (req: Request, res: Response): Promise<void> => {
    await serially(async () => {
      if (demo.inbox || !mayConnectInbox(req.accountEmail, demo.inboxAddress)) await demo.clear(req.userId);
      else await demo.seed(req.userId);
      demo.startedAt = new Date();
    });
    res.json({ ok: true });
  });

  return router;
}
