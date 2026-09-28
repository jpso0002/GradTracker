/**
 * Wall-clock time in a named timezone → an exact instant.
 *
 * Labellers write a deadline the way the email states it — "14 March, 1:29pm
 * AEDT" becomes `2026-03-14 13:29` with the zone Australia/Melbourne — and this
 * turns it into the UTC timestamp a fixture stores. The zone's offset is read
 * from the platform's timezone database for that date, so daylight saving is
 * handled without anyone having to know whether it applied.
 */

export const DEADLINE_TIMEZONES = [
  "Australia/Melbourne",
  "Australia/Sydney",
  "Australia/Brisbane",
  "Australia/Adelaide",
  "Australia/Perth",
  "Australia/Hobart",
  "Australia/Darwin",
  "Pacific/Auckland",
  "Asia/Singapore",
  "Europe/London",
  "UTC",
] as const;

export const DEFAULT_TIMEZONE = "Australia/Melbourne";

/** The zone's offset from UTC, in milliseconds, at the given instant. */
function offsetAt(timeZone: string, instant: number): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(instant));
  const get = (type: string) => Number(parts.find((p) => p.type === type)!.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - instant;
}

export interface WallClock {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

export function wallClockToInstant(time: WallClock, timeZone: string): Date {
  const naive = Date.UTC(time.year, time.month - 1, time.day, time.hour, time.minute);
  // Two passes: the first offset is read at the naive instant, which can sit
  // on the other side of a daylight-saving change from the answer.
  const first = naive - offsetAt(timeZone, naive);
  return new Date(naive - offsetAt(timeZone, first));
}

export function isValidTimeZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Parses a labeller's deadline.
 *
 *   `2026-03-14 13:29`  → that minute, in `timeZone`
 *   `2026-04-07`        → 23:59 in `timeZone` — the classifier prompt's own rule
 *                          for a date given without a time
 *
 * Only ISO order is accepted. `07/04/2026` is 7 April to an Australian and
 * 4 July to a spreadsheet set to US conventions; a label must not depend on
 * which one the reader's computer assumed.
 *
 * A `Date` is accepted too: spreadsheet software sometimes converts what was
 * typed into a date despite the column being text. Its UTC fields then hold
 * the wall-clock value that was typed.
 */
export function parseDeadline(value: string | Date, timeZone: string): Date {
  if (!isValidTimeZone(timeZone)) throw new Error(`"${timeZone}" is not a timezone.`);

  if (value instanceof Date) {
    return wallClockToInstant(
      {
        year: value.getUTCFullYear(),
        month: value.getUTCMonth() + 1,
        day: value.getUTCDate(),
        hour: value.getUTCHours(),
        minute: value.getUTCMinutes(),
      },
      timeZone,
    );
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2}))?$/.exec(value.trim());
  if (!match) {
    throw new Error(`"${value}" is not a deadline in the form YYYY-MM-DD HH:MM or YYYY-MM-DD.`);
  }
  const [, y, mo, d, h, mi] = match;
  const time: WallClock = {
    year: Number(y),
    month: Number(mo),
    day: Number(d),
    hour: h === undefined ? 23 : Number(h),
    minute: mi === undefined ? 59 : Number(mi),
  };
  if (time.month < 1 || time.month > 12 || time.day < 1 || time.day > 31 || time.hour > 23 || time.minute > 59) {
    throw new Error(`"${value}" is not a real date and time.`);
  }
  return wallClockToInstant(time, timeZone);
}

/** An instant as a labeller reads it: `2026-03-14 13:29` in `timeZone`. */
export function formatWallClock(instant: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(instant);
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}`;
}
