import { randomBytes } from "node:crypto";
import { join } from "node:path";
import { createDatabase } from "./db/client.js";
import { createApp } from "./app.js";
import type { DemoSession } from "./routes/sync.js";
import {
  DEMO_DATABASE,
  clearUserData,
  demoBackupEmails,
  migrateDemoDatabase,
  rebaseSamples,
} from "./demo.js";
import { DEMO_ACCOUNTS_FILE, DemoAccounts } from "./demo-accounts.js";
import { seed } from "./db/seed.js";
import { createDemoInbox, DemoEmailClassifier } from "./adapters/index.js";

/**
 * The presentation demo's API (D35–D40).
 *
 *   npm run demo
 *
 * Demo accounts (D40): sign up, sign in, sign out — kept in
 * `demo-accounts.json`, outside the product database. Each account has its own
 * dashboard, and accounts and dashboards survive a restart.
 *
 * Only the demo inbox's own account (GMAIL_DEMO_USER) may connect it: its
 * first sign-in scans the sample emails loaded into the inbox
 * (`npm run demo:load-inbox`), and Refresh later reads what a teammate sends.
 * Any other account has an empty dashboard.
 *
 * Never reads or writes `dev.db`.
 */

// A rehearsal sandbox (D41): `--data-dir=<folder>` keeps demo.db and the
// accounts there instead of the repository, and `--no-inbox` ignores the demo
// inbox, so the scan uses the seeded sample mailbox. Neither touches the real
// demo data.
const arg = (name: string) => process.argv.find((a) => a === name || a.startsWith(`${name}=`));
const dataDir = arg("--data-dir")?.split("=").slice(1).join("=");
const noInbox = arg("--no-inbox") !== undefined;
const inFolder = (file: string) => (dataDir ? join(dataDir, file) : file);

const url = dataDir ? `file:${inFolder(DEMO_DATABASE).split("\\").join("/")}` : `file:./${DEMO_DATABASE}`;
const port = Number(process.env["PORT"] ?? 3000);

const inbox = noInbox ? null : createDemoInbox();
const inboxAddress = noInbox ? null : process.env["GMAIL_DEMO_USER"]?.trim().toLowerCase() || null;
const { db } = createDatabase(url);
await migrateDemoDatabase(db);

// Signs session cookies. A fixed secret keeps people signed in across a
// restart; without one, a random secret means signing in again after it.
const secret = process.env["SESSION_SECRET"]?.trim() || randomBytes(32).toString("base64");

const session: DemoSession = {
  inbox,
  inboxAddress,
  classifier: new DemoEmailClassifier(),
  startedAt: new Date(),
  backupEmails: demoBackupEmails,
  rebaseSamples: (emails, now) => rebaseSamples(emails, now),
  clear: (userId) => clearUserData(db, userId),
  seed: async (userId) => {
    await clearUserData(db, userId);
    await seed(db, new Date(), userId);
  },
};

createApp({
  db,
  demo: session,
  accounts: { accounts: new DemoAccounts(inFolder(DEMO_ACCOUNTS_FILE)), secret, inboxAddress },
}).listen(port, () => {
  console.log(`GradTracker demo API on http://localhost:${port}  (db: ${url}, accounts: ${inFolder(DEMO_ACCOUNTS_FILE)})`);
  console.log(
    inbox
      ? `Only ${inboxAddress} can connect the demo inbox; its first sign-in scans it.`
      : "No demo inbox configured (GMAIL_DEMO_USER / GMAIL_DEMO_APP_PASSWORD): an account's first scan uses the seeded sample mailbox.",
  );
  console.log("Demo accounts: for the presentation only. Not for deployment.");
});
