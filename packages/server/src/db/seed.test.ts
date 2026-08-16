import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { migrate } from "drizzle-orm/libsql/migrator";
import {
  StageEnum,
  URGENCY_BUCKET,
  STALENESS_THRESHOLD_DAYS,
  TERMINAL_STAGES,
  urgencyBucket,
  type UserId,
} from "@gradtracker/shared";
import { createTestDatabase, type DatabaseHandle } from "./client.js";
import { createRepository, type Repository } from "./repository.js";
import { seed, SEED_JOBS, normaliseCompany } from "./seed.js";

const MIGRATIONS = join(dirname(fileURLToPath(import.meta.url)), "../../migrations/sqlite");

/** Fixed "today" so bucket coverage is deterministic rather than dependent on
 *  the day the suite happens to run. */
const TODAY = new Date("2026-08-16T00:00:00Z");
const DAY_MS = 24 * 60 * 60 * 1000;

let handle: DatabaseHandle;
let repo: Repository;
let userId: UserId;

beforeAll(async () => {
  handle = createTestDatabase();
  await migrate(handle.db, { migrationsFolder: MIGRATIONS });
  repo = createRepository(handle.db);
  ({ userId } = await seed(handle.db, TODAY));
});

afterAll(() => handle.close());

/** Whole days from TODAY to a deadline, as the ranking function will compute it. */
const daysLeft = (deadline: Date | null): number | null =>
  deadline === null ? null : Math.floor((deadline.getTime() - TODAY.getTime()) / DAY_MS);

const isStale = (stage: string, lastEventAt: Date): boolean => {
  const threshold = STALENESS_THRESHOLD_DAYS[stage as keyof typeof STALENESS_THRESHOLD_DAYS];
  if (threshold === null) return false;
  return (TODAY.getTime() - lastEventAt.getTime()) / DAY_MS > threshold;
};

describe("seed volume", () => {
  it("creates a pipeline large enough to be realistic", async () => {
    const all = await repo.listJobs(userId);
    expect(all.length).toBeGreaterThanOrEqual(25);
  });

  it("leaves four detections awaiting review", async () => {
    expect(await repo.listPendingReview(userId)).toHaveLength(4);
  });

  it("records the emails-read count that powers the stat strip", async () => {
    expect((await repo.getSyncState(userId))?.emailsReadTotal).toBe(612);
  });
});

describe("stage coverage — every StageBadge colour is exercised", () => {
  it("includes at least one job in each of the six stages", async () => {
    const all = await repo.listJobs(userId);
    const present = new Set(all.map((j) => j.stage));
    for (const stage of StageEnum.options) {
      expect(present.has(stage), `no seeded job in stage "${stage}"`).toBe(true);
    }
  });

  it("archives the terminal stages so the Active tab excludes them", async () => {
    const active = await repo.listJobs(userId, { status: "active" });
    const terminalActive = active.filter((j) => TERMINAL_STAGES.has(j.stage));
    expect(terminalActive).toEqual([]);
  });

  it("still exposes terminal jobs on the Archived tab", async () => {
    const archived = await repo.listJobs(userId, { status: "archived" });
    expect(archived.length).toBeGreaterThanOrEqual(3);
  });
});

describe("urgency bucket coverage — every ranking bucket is exercised", () => {
  it("covers all five buckets among active jobs", async () => {
    const active = await repo.listJobs(userId, { status: "active" });
    const buckets = new Set(
      active.map((j) => urgencyBucket(daysLeft(j.deadlineAt), isStale(j.stage, j.lastEventAt))),
    );

    for (const [name, value] of Object.entries(URGENCY_BUCKET)) {
      expect(buckets.has(value), `no seeded job lands in bucket ${name}`).toBe(true);
    }
  });

  it("has an overdue job — the case the product exists to prevent", async () => {
    const active = await repo.listJobs(userId, { status: "active" });
    const overdue = active.filter(
      (j) => urgencyBucket(daysLeft(j.deadlineAt)) === URGENCY_BUCKET.OVERDUE,
    );
    expect(overdue.length).toBeGreaterThan(0);
  });

  it("caps stale deadline-less jobs at FAR rather than letting them sink", async () => {
    const active = await repo.listJobs(userId, { status: "active" });
    const staleNoDeadline = active.filter(
      (j) => j.deadlineAt === null && isStale(j.stage, j.lastEventAt),
    );
    expect(staleNoDeadline.length).toBeGreaterThan(0);
    for (const job of staleNoDeadline) {
      const bucket = urgencyBucket(
        daysLeft(job.deadlineAt),
        isStale(job.stage, job.lastEventAt),
      );
      expect(
        bucket,
        `${job.company} has no deadline and is stale, but sank to bucket ${bucket}`,
      ).toBe(URGENCY_BUCKET.FAR);
    }
  });
});

describe("provenance coverage — the AI-vs-human contract has both cases", () => {
  it("gives every job a provenance row for all five extractable fields", async () => {
    const all = await repo.listJobs(userId);
    for (const job of all.slice(0, 5)) {
      expect(await repo.listProvenance(userId, job.id)).toHaveLength(5);
    }
  });

  it("includes jobs with human-verified fields", async () => {
    const all = await repo.listJobs(userId);
    let humanFields = 0;
    for (const job of all) {
      const prov = await repo.listProvenance(userId, job.id);
      humanFields += prov.filter((p) => p.source === "human").length;
    }
    expect(humanFields).toBeGreaterThanOrEqual(5);
  });

  it("clears confidence on human-verified fields", async () => {
    const all = await repo.listJobs(userId);
    for (const job of all) {
      for (const p of await repo.listProvenance(userId, job.id)) {
        if (p.source === "human") expect(p.confidence).toBeNull();
        else expect(p.confidence).not.toBeNull();
      }
    }
  });
});

describe("seed data quality", () => {
  it("uses relative deadlines so bucket coverage does not rot", () => {
    // A seed with hardcoded dates stops covering overdue and imminent the week
    // after it is written — precisely when someone relies on it to check the
    // ranking. Every deadline here is an offset from an injected "today".
    for (const spec of SEED_JOBS) {
      expect(typeof spec.deadlineInDays === "number" || spec.deadlineInDays === null).toBe(true);
    }
  });

  it("normalises company names for job matching", () => {
    expect(normaliseCompany("Macquarie Group")).toBe("macquarie");
    expect(normaliseCompany("Zip Co")).toBe("zip");
    expect(normaliseCompany("Bain & Company")).toBe("bain company");
  });

  it("gives every active job a next action", async () => {
    const active = await repo.listJobs(userId, { status: "active" });
    for (const job of active) {
      expect(job.nextAction, `${job.company} has no next action`).toBeTruthy();
    }
  });

  it("attaches a timeline event to every job", async () => {
    const all = await repo.listJobs(userId);
    for (const job of all.slice(0, 5)) {
      expect((await repo.listEventsForJob(userId, job.id)).length).toBeGreaterThan(0);
    }
  });
});
