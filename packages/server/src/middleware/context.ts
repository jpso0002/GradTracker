import type { Request, Response, NextFunction } from "express";
import { asUserId, type UserId } from "@gradtracker/shared";
import type { Database } from "../db/client.js";
import { users } from "../db/schema.sqlite.js";

/**
 * Request context — who is asking, and in what timezone.
 *
 * **Demo mode has no authentication.** T4.1–T4.3 (OAuth, sessions, token
 * encryption) are deferred on the demo track, so this resolves the single
 * local user rather than reading a session cookie.
 *
 * That is a deliberate, recorded gap, not an oversight — but it is exactly the
 * kind of gap that quietly ships. So:
 *
 *   - it refuses to run unless `ALLOW_UNAUTHENTICATED=1` is set,
 *   - and it refuses outright when `NODE_ENV=production`.
 *
 * Everything downstream still takes a branded `UserId` and every repository
 * call is still scoped, so restoring real auth means replacing this one
 * function and nothing else.
 */

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId: UserId;
      /** IANA timezone from the client, for ranking (defect C2). */
      timeZone: string;
    }
  }
}

export class NoDemoUserError extends Error {
  constructor() {
    super(
      "No user in the database. Run `npm run db:migrate` then `npm run db:seed` or `npm run harvest`.",
    );
    this.name = "NoDemoUserError";
  }
}

const DEFAULT_TIME_ZONE = "Australia/Melbourne";

/**
 * Resolves the single local user. Cached after the first lookup — the user
 * cannot change without a restart in demo mode.
 */
export function demoContext(db: Database, explicitUserId?: UserId) {
  if (process.env["NODE_ENV"] === "production") {
    throw new Error(
      "demoContext must never run in production — it bypasses authentication entirely. Restore T4.1–T4.3 before deploying.",
    );
  }
  if (process.env["ALLOW_UNAUTHENTICATED"] !== "1") {
    throw new Error(
      "Refusing to start without authentication. Set ALLOW_UNAUTHENTICATED=1 to run the local demo, or implement T4.1–T4.3.",
    );
  }

  let cached: UserId | null = null;

  return async function attachContext(
    req: Request,
    _res: Response,
    next: NextFunction,
  ) {
    try {
      if (cached === null) {
        if (explicitUserId) {
          cached = explicitUserId;
        } else {
          const [row] = await db.select({ id: users.id }).from(users).limit(1);
          if (!row) throw new NoDemoUserError();
          cached = asUserId(row.id);
        }
      }

      req.userId = cached;

      // The client tells the server which day it is where the student is, so
      // ranking and display cannot disagree about a deadline.
      const header = req.header("x-timezone");
      req.timeZone = isValidTimeZone(header) ? header : DEFAULT_TIME_ZONE;

      next();
    } catch (error) {
      next(error);
    }
  };
}

/** A bad timezone from a client must not crash ranking — fall back instead. */
function isValidTimeZone(value: string | undefined): value is string {
  if (!value) return false;
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}
