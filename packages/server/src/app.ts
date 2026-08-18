import express, { type Express, type Request, type Response } from "express";
import { CONFIDENCE, type MeResponse, type UserId } from "@gradtracker/shared";
import type { Database } from "./db/client.js";
import { createRepository } from "./db/repository.js";
import { demoContext } from "./middleware/context.js";
import { errorHandler } from "./middleware/validate.js";
import { jobRoutes } from "./routes/jobs.js";
import { reviewRoutes } from "./routes/review.js";
import { syncRoutes } from "./routes/sync.js";

/**
 * The Express application.
 *
 * Security middleware (HTTPS enforcement, HSTS, sessions, CORS) belongs to
 * T4.1–T4.3, deferred on the demo track. `demoContext` refuses to run in
 * production and refuses to run at all without an explicit opt-in env var, so
 * this cannot ship by accident.
 */

export interface AppOptions {
  db: Database;
  /** Injectable so tests can pin "now" and get deterministic rankings. */
  clock?: () => Date;
  /** Explicit user, so tests do not depend on which row the database returns
   *  first. Demo mode resolves the single local user when this is omitted. */
  userId?: UserId;
}

export function createApp(options: AppOptions): Express {
  const app = express();
  const repo = createRepository(options.db);

  app.use(express.json({ limit: "100kb" }));
  app.use(demoContext(options.db, options.userId));

  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  app.get("/api/me", async (req: Request, res: Response) => {
    const [sync, user] = await Promise.all([
      repo.getSyncState(req.userId),
      repo.findUser(req.userId),
    ]);
    const response: MeResponse = {
      email: user?.email ?? "",
      displayName: user?.displayName ?? null,
      gmailConnected: sync?.historyId != null,
      reviewThreshold: CONFIDENCE.DEFAULT_REVIEW_THRESHOLD,
      timeZone: req.timeZone,
      demoMode: true,
      sync: {
        state: sync?.state ?? "idle",
        lastSyncAt: sync?.lastFullScanAt?.toISOString() ?? null,
        emailsReadTotal: sync?.emailsReadTotal ?? 0,
        progress: null,
        lastError: sync?.lastError ?? null,
      },
    };
    res.json(response);
  });

  app.use("/api/jobs", jobRoutes(repo, options.clock));
  app.use("/api/review", reviewRoutes(repo));
  app.use("/api/sync", syncRoutes(repo));

  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: "Not found." });
  });

  app.use(errorHandler);

  return app;
}
