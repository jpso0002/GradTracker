import { describe, it, expect } from "vitest";
import { createTestDatabase } from "./db/client.js";
import { createRepository } from "./db/repository.js";
import { DEMO_DATABASE, resetDemoDatabase } from "./demo.js";

/**
 * The presentation demo's database (D35): the seeded sample mailbox, never a
 * real inbox, rebuilt every time the demo starts — so deadlines are always
 * relative to the day of the demo, and a rehearsal's edits are gone.
 */

describe("the presentation demo's database (D35)", () => {
  it("is the sample mailbox, rebuilt fresh each time — never added to", async () => {
    const handle = createTestDatabase();
    try {
      const first = await resetDemoDatabase(handle.db);
      const repo = createRepository(handle.db);
      // A rehearsal edits an application...
      const [rehearsed] = await repo.listJobs(first.userId);
      await repo.updateJob(first.userId, rehearsed!.id, { company: "Rehearsal edit" });

      // ...and the next start puts the sample mailbox back, without stacking a
      // second copy of it on the first.
      const second = await resetDemoDatabase(handle.db);

      const jobs = await repo.listJobs(second.userId);
      expect(jobs).toHaveLength(25);
      expect(jobs.map((j) => j.company)).not.toContain("Rehearsal edit");
      expect(await repo.listPendingReview(second.userId)).toHaveLength(4);
      expect((await repo.findUser(second.userId))?.email).toBe("student@student.monash.edu");
    } finally {
      handle.close();
    }
  });

  it("is its own file — never dev.db, which may hold a real inbox", () => {
    expect(DEMO_DATABASE).toBe("demo.db");
  });
});
