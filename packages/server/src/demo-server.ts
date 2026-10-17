import { createDatabase } from "./db/client.js";
import { createApp } from "./app.js";
import { DEMO_DATABASE, demoBackupEmails, resetDemoDatabase } from "./demo.js";
import { createDemoInbox, ScriptedEmailClassifier } from "./adapters/index.js";

/**
 * The presentation demo's API (D35, D36).
 *
 *   npm run demo
 *
 * Rebuilds `demo.db` from the seed, then serves it. Pair it with the client and
 * open the app: it starts at the simulated sign-in, "scans" this sample
 * mailbox, and lands on the dashboard. Never reads or writes `dev.db`.
 *
 * Refresh reads the demo inbox (GMAIL_DEMO_USER / GMAIL_DEMO_APP_PASSWORD) for
 * mail that arrived after this process started, and classifies it with the
 * scripted classifier. Start the demo before the email is sent.
 */

const url = `file:./${DEMO_DATABASE}`;
const port = Number(process.env["PORT"] ?? 3000);

const reset = createDatabase(url);
const result = await resetDemoDatabase(reset.db);
reset.close();
console.log(
  `Demo database rebuilt: ${DEMO_DATABASE} — ${result.jobsCreated} sample applications, ` +
    `${result.reviewItemsCreated} awaiting review, deadlines relative to today.`,
);

const inbox = createDemoInbox();
const ownAddress = process.env["GMAIL_DEMO_USER"]?.trim() || null;
let startedAt = new Date();

const { db } = createDatabase(url);
createApp({
  db,
  demoSync: {
    inbox,
    classifier: new ScriptedEmailClassifier(),
    startedAt: () => startedAt,
    ownAddress,
    backupEmails: demoBackupEmails,
  },
  // Reset demo: the sample mailbox as it started, and only mail sent from now
  // on counts — an email already shown must be sent again, not resurrected.
  demoReset: async () => {
    await resetDemoDatabase(db);
    startedAt = new Date();
    console.log(`Demo reset at ${startedAt.toLocaleTimeString()} — send the emails again.`);
  },
}).listen(port, () => {
  console.log(`GradTracker demo API on http://localhost:${port}  (db: ${url})`);
  console.log(
    inbox
      ? `Refresh reads ${ownAddress} — mail received after ${startedAt.toLocaleTimeString()} only.`
      : "Refresh: no demo inbox configured (GMAIL_DEMO_USER / GMAIL_DEMO_APP_PASSWORD). The backup shortcut still works.",
  );
  console.log("Demo mode: no authentication. Not for deployment.");
});
