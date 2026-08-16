import { createDatabase } from "./client.js";
import { seed } from "./seed.js";

/**
 * Populates the database named by DATABASE_URL with a realistic pipeline.
 *
 * Run: npm run db:seed  (migrate first)
 *
 * Deadlines are relative to the moment you run this, so the seeded pipeline
 * always covers every urgency bucket — including overdue and due-tomorrow,
 * which fixed dates would stop covering within a week.
 */

async function main(): Promise<void> {
  const url = process.env["DATABASE_URL"];

  if (!url) {
    console.error("DATABASE_URL is not set. Copy .env.example to .env — it works unedited.");
    process.exit(1);
  }

  if (url.startsWith("postgres://") || url.startsWith("postgresql://")) {
    console.error("Seeding a Postgres server is not wired up yet (task T8.5). Use the SQLite default.");
    process.exit(1);
  }

  const { db, close } = createDatabase(url);
  const result = await seed(db);

  console.log(
    [
      `Seeded ${url}`,
      `  ${result.jobsCreated} applications across all six stages`,
      `  ${result.reviewItemsCreated} detections awaiting review`,
      `  user: student@student.monash.edu`,
    ].join("\n"),
  );

  close();
}

main().catch((error: unknown) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
