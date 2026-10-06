import { createDatabase } from "./db/client.js";
import { DEMO_DATABASE, resetDemoDatabase } from "./demo.js";

/**
 * The presentation demo's API (D35).
 *
 *   npm run demo
 *
 * Rebuilds `demo.db` from the seed, then serves it. Pair it with the client and
 * open the app: it starts at the simulated sign-in, "scans" this sample
 * mailbox, and lands on the dashboard. Never reads or writes `dev.db`.
 */

const url = `file:./${DEMO_DATABASE}`;

const { db, close } = createDatabase(url);
const result = await resetDemoDatabase(db);
close();
console.log(
  `Demo database rebuilt: ${DEMO_DATABASE} — ${result.jobsCreated} sample applications, ` +
    `${result.reviewItemsCreated} awaiting review, deadlines relative to today.`,
);

// Set after .env is read, so a DATABASE_URL there — dev.db — cannot win.
process.env["DATABASE_URL"] = url;
await import("./server.js");
