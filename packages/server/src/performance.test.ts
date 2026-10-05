import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { migrate } from "drizzle-orm/libsql/migrator";
import type { UserId } from "@gradtracker/shared";
import { createTestDatabase, type DatabaseHandle } from "./db/client.js";
import { seed } from "./db/seed.js";
import { createApp } from "./app.js";

/**
 * T5.12 — SM-8's owning test: "dashboard interactions respond promptly under
 * normal load", asserted as API response times on the seeded 25-application
 * pipeline. The browser's own render time is measured by hand (SM-8 says
 * "manual verification + API response-time assertion").
 *
 * **The budgets**, at the 95th percentile of 20 runs after warm-up:
 *   - pipeline (`GET /api/jobs`)                   ≤ 200 ms
 *   - edit round-trip (`PATCH`, then `GET /api/jobs`) ≤ 300 ms
 * Well inside the 1-second limit for an uninterrupted flow of thought, and
 * loose enough to hold on a busy CI machine — a regression that matters is an
 * order of magnitude, not a few milliseconds.
 */

const MIGRATIONS = join(dirname(fileURLToPath(import.meta.url)), "../migrations/sqlite");
const BUDGET_MS = { pipeline: 200, editRoundTrip: 300 };
const RUNS = 20;

let handle: DatabaseHandle;
let app: ReturnType<typeof createApp>;
let userId: UserId;

beforeAll(async () => {
  process.env["ALLOW_UNAUTHENTICATED"] = "1";
  handle = createTestDatabase();
  await migrate(handle.db, { migrationsFolder: MIGRATIONS });
  ({ userId } = await seed(handle.db));
  app = createApp({ db: handle.db, userId });
});

afterAll(() => handle.close());

async function timed(run: () => Promise<unknown>): Promise<{ p50: number; p95: number }> {
  for (let i = 0; i < 3; i += 1) await run(); // warm-up: first-query costs are not "normal load"
  const samples: number[] = [];
  for (let i = 0; i < RUNS; i += 1) {
    const start = performance.now();
    await run();
    samples.push(performance.now() - start);
  }
  samples.sort((a, b) => a - b);
  const at = (q: number) => samples[Math.min(samples.length - 1, Math.ceil(q * samples.length) - 1)]!;
  return { p50: at(0.5), p95: at(0.95) };
}

describe("performance on the seeded 25-application pipeline (T5.12, SM-8)", () => {
  it(`serves the ranked pipeline within ${BUDGET_MS.pipeline} ms`, async () => {
    const res = await request(app).get("/api/jobs?status=active").expect(200);
    const archived = await request(app).get("/api/jobs?status=archived").expect(200);
    // The measurement is of the real thing: all 25 seeded applications.
    expect(res.body.jobs.length + archived.body.jobs.length).toBe(25);

    const t = await timed(() => request(app).get("/api/jobs").expect(200));
    console.info(`[performance] pipeline        p50 ${t.p50.toFixed(1)} ms · p95 ${t.p95.toFixed(1)} ms · budget ${BUDGET_MS.pipeline} ms`);
    expect(t.p95).toBeLessThanOrEqual(BUDGET_MS.pipeline);
  });

  it(`completes an edit round-trip within ${BUDGET_MS.editRoundTrip} ms`, async () => {
    const [job] = (await request(app).get("/api/jobs").expect(200)).body.jobs as Array<{ id: string }>;
    let n = 0;

    const t = await timed(async () => {
      n += 1;
      await request(app).patch(`/api/jobs/${job!.id}`).send({ nextAction: `Check the portal (${n})` }).expect(200);
      await request(app).get("/api/jobs").expect(200);
    });
    console.info(`[performance] edit round-trip p50 ${t.p50.toFixed(1)} ms · p95 ${t.p95.toFixed(1)} ms · budget ${BUDGET_MS.editRoundTrip} ms`);
    expect(t.p95).toBeLessThanOrEqual(BUDGET_MS.editRoundTrip);
  });
});
