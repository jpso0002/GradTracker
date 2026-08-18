import { createDatabase } from "./db/client.js";
import { createApp } from "./app.js";

/**
 * Local demo server.
 *
 *   npm run dev:server
 *
 * Requires ALLOW_UNAUTHENTICATED=1 — see middleware/context.ts for why.
 */

const url = process.env["DATABASE_URL"] ?? "file:./dev.db";
const port = Number(process.env["PORT"] ?? 3000);

const { db } = createDatabase(url);

createApp({ db }).listen(port, () => {
  console.log(`GradTracker API on http://localhost:${port}  (db: ${url})`);
  console.log("Demo mode: no authentication. Not for deployment.");
});
