import { Router, type NextFunction, type Request, type Response } from "express";
import {
  SignInBodySchema,
  SignUpBodySchema,
  type AuthSessionResponse,
  type UserId,
} from "@gradtracker/shared";
import type { Database } from "../db/client.js";
import type { Repository } from "../db/repository.js";
import {
  CLEARED_SESSION_COOKIE,
  SESSION_COOKIE,
  normaliseEmail,
  readCookie,
  readSession,
  sessionCookie,
  signSession,
  type DemoAccounts,
} from "../demo-accounts.js";
import { demoAccountUser } from "../demo.js";
import { requestTimeZone } from "../middleware/context.js";

/**
 * Sign up, sign in and sign out for the presentation demo (D40).
 *
 * The product's way in is Google (T4.1–T4.3, deferred). These are the demo's
 * own accounts, kept outside the product database (see demo-accounts.ts), so
 * one person can create a fresh account in front of the room, sign out, and
 * sign in to the demo inbox's account.
 */

export interface DemoAuthOptions {
  accounts: DemoAccounts;
  /** Signs session cookies. */
  secret: string;
  /** The demo inbox; only its own account may connect it. Null: no inbox, and
   *  any account may fill its dashboard from the sample mailbox. */
  inboxAddress: string | null;
}

/** Whether this account may connect the demo inbox. */
export function mayConnectInbox(email: string | undefined, inboxAddress: string | null): boolean {
  if (inboxAddress === null || email === undefined) return true;
  return normaliseEmail(email) === normaliseEmail(inboxAddress);
}

/** The same words for an unknown email and a wrong password: which one it was
 *  is exactly what someone guessing would like to know. */
const WRONG = "That email and password don't match an account.";

export function authRoutes(db: Database, repo: Repository, options: DemoAuthOptions): Router {
  const router = Router();
  const userIds = new Map<string, UserId>();

  const userFor = async (account: { email: string; name: string }) => {
    let id = userIds.get(account.email);
    if (!id) {
      id = await demoAccountUser(db, account);
      userIds.set(account.email, id);
    }
    return id;
  };

  const sessionFor = async (email: string | null): Promise<AuthSessionResponse> => {
    const account = email ? await options.accounts.find(email) : undefined;
    if (!account) return { user: null, canConnectInbox: false, scanned: false, inbox: options.inboxAddress };
    const sync = await repo.getSyncState(await userFor(account));
    return {
      user: { email: account.email, name: account.name },
      canConnectInbox: mayConnectInbox(account.email, options.inboxAddress),
      scanned: sync?.lastFullScanAt != null,
      inbox: options.inboxAddress,
    };
  };

  const signedInAs = (req: Request) => readSession(readCookie(req.header("cookie"), SESSION_COOKIE), options.secret);

  router.get("/session", async (req: Request, res: Response): Promise<void> => {
    res.json(await sessionFor(signedInAs(req)));
  });

  router.post("/signup", async (req: Request, res: Response): Promise<void> => {
    const parsed = SignUpBodySchema.safeParse(req.body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      res.status(400).json({ error: issue?.message ?? "Check the form.", field: issue?.path[0] });
      return;
    }
    const { name, email, password } = parsed.data;
    const account = await options.accounts.create(name, email, password);
    if (account === "exists") {
      res.status(409).json({ error: "There's already an account with this email — sign in instead.", field: "email" });
      return;
    }
    await userFor(account);
    res.setHeader("Set-Cookie", sessionCookie(signSession(account.email, options.secret)));
    res.status(201).json(await sessionFor(account.email));
  });

  router.post("/signin", async (req: Request, res: Response): Promise<void> => {
    const parsed = SignInBodySchema.safeParse(req.body);
    const account = parsed.success ? await options.accounts.verify(parsed.data.email, parsed.data.password) : null;
    if (!account) {
      res.status(401).json({ error: WRONG });
      return;
    }
    await userFor(account);
    res.setHeader("Set-Cookie", sessionCookie(signSession(account.email, options.secret)));
    res.json(await sessionFor(account.email));
  });

  router.post("/signout", (_req: Request, res: Response): void => {
    res.setHeader("Set-Cookie", CLEARED_SESSION_COOKIE);
    res.json({ ok: true });
  });

  return router;
}

/**
 * Who is asking, from the session cookie — the demo accounts' replacement for
 * `demoContext`. No session, no data: 401, and the client goes to Sign in.
 */
export function accountContext(db: Database, options: DemoAuthOptions) {
  if (process.env["NODE_ENV"] === "production") {
    throw new Error("Demo accounts must never run in production — the product signs in with Google (T4.1–T4.3).");
  }
  const userIds = new Map<string, UserId>();

  return async function attachAccount(req: Request, res: Response, next: NextFunction) {
    try {
      const email = readSession(readCookie(req.header("cookie"), SESSION_COOKIE), options.secret);
      const account = email ? await options.accounts.find(email) : undefined;
      if (!account) {
        res.status(401).json({ error: "Sign in first." });
        return;
      }
      let id = userIds.get(account.email);
      if (!id) {
        id = await demoAccountUser(db, account);
        userIds.set(account.email, id);
      }
      req.userId = id;
      req.accountEmail = account.email;
      req.timeZone = requestTimeZone(req);
      next();
    } catch (error) {
      next(error);
    }
  };
}
