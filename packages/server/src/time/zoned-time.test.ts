import { describe, it, expect } from "vitest";
import { parseDeadline, formatWallClock, wallClockToInstant } from "./zoned-time.js";

/**
 * Deadlines are labelled as the email states them, in the email's timezone.
 * Australia's 2026 daylight-saving changes: ends Sunday 5 April (AEDT +11 →
 * AEST +10), starts Sunday 4 October (+10 → +11).
 */

describe("wall-clock time to an instant", () => {
  it("applies daylight time in March — PwC's '01:29 PM AEDT, 14 March'", () => {
    expect(parseDeadline("2026-03-14 13:29", "Australia/Melbourne").toISOString()).toBe(
      "2026-03-14T02:29:00.000Z",
    );
  });

  it("reads a date without a time as 23:59 — the prompt's rule — in standard time after 5 April", () => {
    // APRA's "complete by 7 April": after daylight saving ends, so +10.
    expect(parseDeadline("2026-04-07", "Australia/Melbourne").toISOString()).toBe(
      "2026-04-07T13:59:00.000Z",
    );
  });

  it("crosses the October change correctly", () => {
    // 03:30 on 4 October is already daylight time (+11).
    expect(parseDeadline("2026-10-04 03:30", "Australia/Melbourne").toISOString()).toBe(
      "2026-10-03T16:30:00.000Z",
    );
    // The evening before is still standard time (+10).
    expect(parseDeadline("2026-10-03 20:00", "Australia/Melbourne").toISOString()).toBe(
      "2026-10-03T10:00:00.000Z",
    );
  });

  it("respects a zone with no daylight saving", () => {
    expect(parseDeadline("2026-03-14 09:00", "Australia/Perth").toISOString()).toBe(
      "2026-03-14T01:00:00.000Z",
    );
  });

  it("round-trips through the format labellers read", () => {
    const instant = wallClockToInstant({ year: 2026, month: 3, day: 14, hour: 13, minute: 29 }, "Australia/Melbourne");
    expect(formatWallClock(instant, "Australia/Melbourne")).toBe("2026-03-14 13:29");
  });
});

describe("what a labeller may type", () => {
  it("refuses day-first and month-first dates — 07/04 is two different days", () => {
    expect(() => parseDeadline("07/04/2026", "Australia/Melbourne")).toThrow(/YYYY-MM-DD/);
  });

  it("refuses an impossible date and an unknown timezone", () => {
    expect(() => parseDeadline("2026-13-40", "Australia/Melbourne")).toThrow(/not a real date/);
    expect(() => parseDeadline("2026-03-14", "Mars/Olympus_Mons")).toThrow(/not a timezone/);
  });

  it("accepts a cell the spreadsheet silently turned into a date", () => {
    // Excel converts "2026-03-14 13:29" typed into a cell into a date whose
    // UTC fields hold what was typed. It must mean the same deadline.
    const converted = new Date(Date.UTC(2026, 2, 14, 13, 29));
    expect(parseDeadline(converted, "Australia/Melbourne").toISOString()).toBe(
      "2026-03-14T02:29:00.000Z",
    );
  });
});
