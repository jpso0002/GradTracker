import { createDatabase } from "./db/client.js";
import { createApp } from "./app.js";
import type { DemoSession } from "./routes/sync.js";
import { DEMO_DATABASE, clearDemoDatabase, demoBackupEmails, rebaseSamples, resetDemoDatabase } from "./demo.js";
import { createDemoInbox, DemoEmailClassifier } from "./adapters/index.js";

/**
 * The presentation demo's API (D35, D36, D37).
 *
 *   npm run demo
 *
 * With the demo inbox configured (GMAIL_DEMO_USER / GMAIL_DEMO_APP_PASSWORD),
 * the dashboard starts empty: the sign-in walkthrough's scan reads the sample
 * emails loaded into the inbox (`npm run demo:load-inbox`) and builds it, and
 * Refresh later reads what a teammate sends. Without one — or if the inbox
 * cannot be read — it is the seeded sample mailbox, as before.
 *
 * Never reads or writes `dev.db`.
 */

const url = `file:./${DEMO_DATABASE}`;
const port = Number(process.env["PORT"] ?? 3000);

const inbox = createDemoInbox();
const { db } = createDatabase(url);

const session: DemoSession = {
  inbox,
  inboxAddress: process.env["GMAIL_DEMO_USER"]?.trim() || null,
  classifier: new DemoEmailClassifier(),
  startedAt: new Date(),
  backupEmails: demoBackupEmails,
  rebaseSamples: (emails, now) => rebaseSamples(emails, now),
  clear: async () => {
    await clearDemoDatabase(db);
  },
  seed: async () => {
    await resetDemoDatabase(db);
  },
};

if (inbox) {
  await session.clear();
  console.log(`Demo database emptied: ${DEMO_DATABASE} — the sign-in scan fills it from ${session.inboxAddress}.`);
} else {
  const result = await resetDemoDatabase(db);
  console.log(
    `Demo database rebuilt: ${DEMO_DATABASE} — ${result.jobsCreated} sample applications, ` +
      `${result.reviewItemsCreated} awaiting review, deadlines relative to today.`,
  );
}

createApp({ db, demo: session }).listen(port, () => {
  console.log(`GradTracker demo API on http://localhost:${port}  (db: ${url})`);
  console.log(
    inbox
      ? `Refresh reads ${session.inboxAddress} — mail sent after the sign-in scan only.`
      : "No demo inbox configured (GMAIL_DEMO_USER / GMAIL_DEMO_APP_PASSWORD): the seeded sample mailbox. The backup shortcut still works.",
  );
  console.log("Demo mode: no authentication. Not for deployment.");
});
