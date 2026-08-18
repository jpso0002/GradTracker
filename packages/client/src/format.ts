/**
 * Display formatting.
 *
 * Deliberately does **no** date arithmetic. `daysLeft` is computed server-side
 * from the `x-timezone` header and arrives on the payload (defect C2); if this
 * file recomputed it, the row and its rank could disagree — which is the exact
 * bug C2 records. Formatting only.
 */

const DATE = new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short" });
const TIME = new Intl.DateTimeFormat("en-AU", { hour: "2-digit", minute: "2-digit", hour12: false });

/** "14 Sep · 09:00" — the design system's deadline format. Midnight is shown
 *  as a date alone, because "23 Aug · 00:00" reads as a time nobody set. */
export function formatDeadline(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const time = TIME.format(date);
  return time === "00:00" ? DATE.format(date) : `${DATE.format(date)} · ${time}`;
}

/** "12 Aug 2026" — timeline entries, where the year matters because a pipeline
 *  spans two intake cycles. */
export function formatEventDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

/** Relative wording for the deadline caption. The number comes from the
 *  server; only the words are chosen here. */
export function deadlineWording(daysLeft: number): string {
  if (daysLeft < 0) return daysLeft === -1 ? "1 day overdue" : `${Math.abs(daysLeft)} days overdue`;
  if (daysLeft === 0) return "Due today";
  if (daysLeft === 1) return "Due tomorrow";
  return `Due in ${daysLeft} days`;
}
