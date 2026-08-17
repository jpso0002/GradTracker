import { describe, it, expect } from "vitest";
import { URGENCY_BUCKET } from "@gradtracker/shared";
import { daysUntil, rankJobs, pipelineStats, type RankableJob } from "./rank.js";

const NOW = new Date("2026-08-16T02:00:00Z"); // midday Melbourne
const TZ = "Australia/Melbourne";

const job = (over: Partial<RankableJob> & { id: string }): RankableJob => ({
  company: "Company",
  stage: "applied",
  deadlineAt: null,
  lastEventAt: new Date("2026-08-15T00:00:00Z"),
  ...over,
});

const daysFromNow = (n: number) => new Date(NOW.getTime() + n * 86_400_000);

describe("daysUntil — calendar days, not elapsed time (defect C2)", () => {
  it("counts a deadline later today as 0", () => {
    expect(daysUntil(new Date("2026-08-16T09:00:00Z"), NOW, TZ)).toBe(0);
  });

  it("counts tomorrow as 1 even when only hours away", () => {
    // 11pm Sunday Melbourne; the deadline is 9am Monday — 10 hours away, but
    // it is *tomorrow*, and telling a student "0 days" for something due
    // tomorrow is telling them the wrong thing.
    const lateSunday = new Date("2026-08-16T13:00:00Z"); // 23:00 Melbourne
    const mondayMorning = new Date("2026-08-16T23:00:00Z"); // 09:00 Mon Melbourne
    expect(daysUntil(mondayMorning, lateSunday, TZ)).toBe(1);
  });

  it("returns negative for an overdue deadline", () => {
    expect(daysUntil(daysFromNow(-3), NOW, TZ)).toBe(-3);
  });

  it("gives different answers in different timezones, which is the point", () => {
    // 15:00 UTC is already 01:00 *tomorrow* in Melbourne but still 16:00 today
    // in London. The same instant is two different calendar days depending on
    // where the student is, so ranking must use their day, not the server's.
    const instant = new Date("2026-08-16T15:00:00Z");
    expect(daysUntil(instant, NOW, "Australia/Melbourne")).toBe(1);
    expect(daysUntil(instant, NOW, "Europe/London")).toBe(0);
  });
});

describe("urgency ordering", () => {
  it("puts overdue first, then imminent, then soon, then far, then none", () => {
    const ranked = rankJobs(
      [
        job({ id: "none" }),
        job({ id: "far", deadlineAt: daysFromNow(10) }),
        job({ id: "overdue", deadlineAt: daysFromNow(-2) }),
        job({ id: "soon", deadlineAt: daysFromNow(5) }),
        job({ id: "imminent", deadlineAt: daysFromNow(1) }),
      ],
      { now: NOW, timeZone: TZ },
    );

    expect(ranked.map((r) => r.job.id)).toEqual(["overdue", "imminent", "soon", "far", "none"]);
  });

  it("puts the correct answer to \"what next\" at the top (SM-4)", () => {
    const ranked = rankJobs(
      [
        job({ id: "quiet-offer", stage: "offer" }),
        job({ id: "overdue-assessment", stage: "assessment", deadlineAt: daysFromNow(-1) }),
      ],
      { now: NOW, timeZone: TZ },
    );
    // An expired assessment cannot be recovered. It outranks a comfortable offer.
    expect(ranked[0]!.job.id).toBe("overdue-assessment");
  });

  it("breaks a bucket tie by stage, most advanced first", () => {
    const ranked = rankJobs(
      [
        job({ id: "applied", stage: "applied", deadlineAt: daysFromNow(3) }),
        job({ id: "offer", stage: "offer", deadlineAt: daysFromNow(3) }),
        job({ id: "interview", stage: "interview", deadlineAt: daysFromNow(3) }),
      ],
      { now: NOW, timeZone: TZ },
    );
    expect(ranked.map((r) => r.job.id)).toEqual(["offer", "interview", "applied"]);
  });

  it("breaks a stage tie by staleness, oldest first", () => {
    const ranked = rankJobs(
      [
        job({ id: "recent", lastEventAt: new Date("2026-08-15T00:00:00Z"), deadlineAt: daysFromNow(3) }),
        job({ id: "old", lastEventAt: new Date("2026-08-01T00:00:00Z"), deadlineAt: daysFromNow(3) }),
      ],
      { now: NOW, timeZone: TZ },
    );
    expect(ranked.map((r) => r.job.id)).toEqual(["old", "recent"]);
  });

  it("breaks a total tie alphabetically, so the order is reproducible", () => {
    // Without a final deterministic key, identical jobs would swap places
    // between requests, which reads as a bug and undermines trust in ordering.
    const same = { deadlineAt: daysFromNow(3), lastEventAt: new Date("2026-08-10T00:00:00Z") };
    const ranked = rankJobs(
      [job({ id: "z", company: "Zip", ...same }), job({ id: "a", company: "Atlassian", ...same })],
      { now: NOW, timeZone: TZ },
    );
    expect(ranked.map((r) => r.job.id)).toEqual(["a", "z"]);
  });

  it("produces the same order regardless of input order", () => {
    const jobs = [
      job({ id: "a", deadlineAt: daysFromNow(-1) }),
      job({ id: "b", deadlineAt: daysFromNow(4) }),
      job({ id: "c", stage: "offer" }),
      job({ id: "d", deadlineAt: daysFromNow(1) }),
    ];
    const forward = rankJobs(jobs, { now: NOW, timeZone: TZ }).map((r) => r.job.id);
    const reversed = rankJobs([...jobs].reverse(), { now: NOW, timeZone: TZ }).map((r) => r.job.id);
    expect(reversed).toEqual(forward);
  });
});

describe("staleness cannot be buried", () => {
  it("caps a stale deadline-less job at FAR rather than letting it sink", () => {
    const ranked = rankJobs(
      [
        job({ id: "stale", stage: "applied", lastEventAt: new Date("2026-07-01T00:00:00Z") }),
        job({ id: "fresh", stage: "applied", deadlineAt: daysFromNow(40) }),
      ],
      { now: NOW, timeZone: TZ },
    );

    expect(ranked[0]!.job.id).toBe("stale");
    expect(ranked[0]!.followUpRequired).toBe(true);
    expect(ranked[0]!.bucket).toBe(URGENCY_BUCKET.FAR);
    // A job with a deadline six weeks out must not outrank one that has heard
    // nothing for six weeks.
    expect(ranked[1]!.bucket).toBe(URGENCY_BUCKET.NONE);
  });
});

describe("the Active tab", () => {
  it("excludes terminal jobs by default", () => {
    const ranked = rankJobs(
      [
        job({ id: "live", stage: "interview" }),
        job({ id: "gone", stage: "rejected" }),
        job({ id: "quit", stage: "withdrawn" }),
      ],
      { now: NOW, timeZone: TZ },
    );
    expect(ranked.map((r) => r.job.id)).toEqual(["live"]);
  });

  it("includes them on request, for the Archived tab", () => {
    const ranked = rankJobs([job({ id: "gone", stage: "rejected" })], {
      now: NOW,
      timeZone: TZ,
      includeTerminal: true,
    });
    expect(ranked).toHaveLength(1);
  });
});

describe("stat strip", () => {
  it("counts only deadlines inside the next week, and not overdue ones", () => {
    const ranked = rankJobs(
      [
        job({ id: "overdue", deadlineAt: daysFromNow(-1) }),
        job({ id: "today", deadlineAt: daysFromNow(0) }),
        job({ id: "week", deadlineAt: daysFromNow(7) }),
        job({ id: "later", deadlineAt: daysFromNow(8) }),
        job({ id: "none" }),
      ],
      { now: NOW, timeZone: TZ },
    );

    const stats = pipelineStats(ranked, { needsReview: 4, emailsRead: 612 });
    expect(stats.liveApplications).toBe(5);
    expect(stats.dueThisWeek).toBe(2); // today and week — overdue is its own problem
    expect(stats.needsReview).toBe(4);
    expect(stats.emailsRead).toBe(612);
  });
});
