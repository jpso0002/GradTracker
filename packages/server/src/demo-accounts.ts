import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { readFile, rename, writeFile } from "node:fs/promises";

/**
 * Accounts for the presentation demo (D40): sign up, sign in, sign out.
 *
 * **Not the product's sign-in.** The product signs in with Google (T4.1–T4.3,
 * deferred) and stores no credential at all — SM-5, enforced by tests that fail
 * if any table gains a password column. So these accounts live **outside the
 * product database**, in their own file next to `demo.db` (gitignored), and
 * each maps to an ordinary `users` row. The product schema never changes.
 *
 * A password is never stored: only a salted scrypt hash, compared in constant
 * time. A session is a signed cookie — no server-side store — so a restart
 * does not sign anyone out.
 */

export const DEMO_ACCOUNTS_FILE = "demo-accounts.json";

export interface DemoAccount {
  email: string;
  name: string;
  /** base64 */
  salt: string;
  /** base64 scrypt(password, salt) */
  hash: string;
  createdAt: string;
}

const KEY_LENGTH = 64;

function scrypt(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scryptCallback(password, salt, KEY_LENGTH, (error, key) => (error ? reject(error) : resolve(key))),
  );
}

export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

export class DemoAccounts {
  private accounts: Map<string, DemoAccount> | null = null;

  /** `file` null keeps accounts in memory only — for tests. */
  constructor(private readonly file: string | null) {}

  private async all(): Promise<Map<string, DemoAccount>> {
    if (this.accounts) return this.accounts;
    this.accounts = new Map();
    if (this.file) {
      try {
        const stored = JSON.parse(await readFile(this.file, "utf8")) as { accounts?: DemoAccount[] };
        for (const account of stored.accounts ?? []) this.accounts.set(account.email, account);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
    }
    return this.accounts;
  }

  private async save(): Promise<void> {
    if (!this.file || !this.accounts) return;
    // Write then rename, so a crash mid-write never leaves half a file.
    const temp = `${this.file}.tmp`;
    await writeFile(temp, JSON.stringify({ accounts: [...this.accounts.values()] }, null, 2), "utf8");
    await rename(temp, this.file);
  }

  async find(email: string): Promise<DemoAccount | undefined> {
    return (await this.all()).get(normaliseEmail(email));
  }

  /** The new account, or "exists" when the email already has one. */
  async create(name: string, email: string, password: string): Promise<DemoAccount | "exists"> {
    const accounts = await this.all();
    const key = normaliseEmail(email);
    if (accounts.has(key)) return "exists";

    const salt = randomBytes(16);
    const account: DemoAccount = {
      email: key,
      name: name.trim(),
      salt: salt.toString("base64"),
      hash: (await scrypt(password, salt)).toString("base64"),
      createdAt: new Date().toISOString(),
    };
    accounts.set(key, account);
    await this.save();
    return account;
  }

  /** The account, if the password is right. The same answer, in the same
   *  time, whether the email is unknown or the password wrong. */
  async verify(email: string, password: string): Promise<DemoAccount | null> {
    const account = await this.find(email);
    const salt = account ? Buffer.from(account.salt, "base64") : randomBytes(16);
    const expected = account ? Buffer.from(account.hash, "base64") : randomBytes(KEY_LENGTH);
    const actual = await scrypt(password, salt);
    return account && timingSafeEqual(actual, expected) ? account : null;
  }
}

// ── Sessions — a signed cookie ──────────────────────────────────────────────

export const SESSION_COOKIE = "gt_session";
const SESSION_DAYS = 7;

function signature(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

/** `email.expiry.signature`, all base64url. */
export function signSession(email: string, secret: string, now: Date = new Date()): string {
  const expires = now.getTime() + SESSION_DAYS * 86_400_000;
  const payload = `${Buffer.from(normaliseEmail(email)).toString("base64url")}.${expires}`;
  return `${payload}.${signature(payload, secret)}`;
}

/** The signed-in email, or null for a missing, forged or expired session. */
export function readSession(token: string | undefined, secret: string, now: Date = new Date()): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [email, expires, given] = parts as [string, string, string];
  const wanted = signature(`${email}.${expires}`, secret);
  if (given.length !== wanted.length || !timingSafeEqual(Buffer.from(given), Buffer.from(wanted))) return null;
  if (!(Number(expires) > now.getTime())) return null;
  return Buffer.from(email, "base64url").toString("utf8");
}

export function readCookie(header: string | undefined, name: string): string | undefined {
  for (const part of (header ?? "").split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return undefined;
}

export function sessionCookie(token: string): string {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_DAYS * 86_400}`;
}

export const CLEARED_SESSION_COOKIE = `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;
