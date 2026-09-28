import { senderDomain } from "../ports/index.js";
import { dedupeById, type MailboxReadResult, type MailboxEmail } from "../mailbox/reader.js";
import { DEFAULT_TIMEZONE, formatWallClock } from "./zoned-time.js";

/**
 * Inventory (T2.11): what the exports actually contain, before anyone labels.
 *
 * The held-out set's size is decided from these numbers rather than guessed
 * (decision D32). The split between "candidate application" and the rest is a
 * **sizing heuristic, not a label** — it answers "roughly how many positives
 * have we got?", nothing more. Only a human label says what an email is.
 *
 * Prints counts and sender domains only — never a subject or a body — so the
 * output is safe to paste into a team chat.
 */

/** Applicant-tracking systems and employers' careers mailers seen in the
 *  corpus and the real harvests. */
const ATS_DOMAINS = [
  "greenhouse.io",
  "lever.co",
  "smartrecruiters.com",
  "myworkday.com",
  "workday.com",
  "successfactors.com",
  "taleo.net",
  "criteriacorp.com",
  "hirevue.com",
  "pageuppeople.com",
  "fusiongc.com.au",
  "icims.com",
  "jobvite.com",
  "ashbyhq.com",
  "livehire.com",
  "yello.co",
  "sonru.com",
  "pymetrics.com",
];

/** Job boards and graduate-careers marketplaces: mostly ads — negatives. */
const JOB_BOARD_DOMAINS = [
  "seek.com.au",
  "prosple.com",
  "gradconnection.com",
  "gradaustralia.com.au",
  "linkedin.com",
  "indeed.com",
  "glassdoor.com",
  "joinhandshake.com",
  "theforage.com",
];

const APPLICATION_SUBJECT =
  /\b(your application|application (received|submitted|confirmation|update|status|outcome)|thanks? (you )?for (applying|your application)|assessment|interview|offer of employment|verbal offer|unsuccessful)\b/i;

export type Bucket = "candidate application" | "job board" | "other";

const matchesDomain = (domain: string | null, list: string[]) =>
  domain !== null && list.some((d) => domain === d || domain.endsWith(`.${d}`));

export function bucketOf(email: MailboxEmail): Bucket {
  const domain = senderDomain(email.fromAddress);
  if (matchesDomain(domain, JOB_BOARD_DOMAINS)) return "job board";
  if (matchesDomain(domain, ATS_DOMAINS) || APPLICATION_SUBJECT.test(email.subject)) {
    return "candidate application";
  }
  return "other";
}

export interface Inventory {
  files: { file: string; emails: number; skipped: number }[];
  total: number;
  unique: number;
  duplicates: number;
  skipped: number;
  derivedIds: number;
  emptyBodies: number;
  buckets: Record<Bucket, number>;
  /** "mixed" when one domain sends more than one kind — an employer's own
   *  domain often sends both application updates and marketing. */
  topDomains: { domain: string; count: number; bucket: Bucket | "mixed" }[];
  earliest: Date | null;
  latest: Date | null;
}

export function buildInventory(read: MailboxReadResult, topN = 15): Inventory {
  const { unique, duplicates } = dedupeById(read.emails);

  const buckets: Record<Bucket, number> = { "candidate application": 0, "job board": 0, other: 0 };
  const domains = new Map<string, { count: number; buckets: Set<Bucket> }>();
  let earliest: Date | null = null;
  let latest: Date | null = null;

  for (const email of unique) {
    const bucket = bucketOf(email);
    buckets[bucket] += 1;

    const domain = senderDomain(email.fromAddress) ?? "(unknown)";
    const entry = domains.get(domain) ?? { count: 0, buckets: new Set<Bucket>() };
    entry.count += 1;
    entry.buckets.add(bucket);
    domains.set(domain, entry);

    if (!earliest || email.receivedAt < earliest) earliest = email.receivedAt;
    if (!latest || email.receivedAt > latest) latest = email.receivedAt;
  }

  const files = read.files.map((path) => {
    const name = path.split(/[\\/]/).pop()!;
    return {
      file: name,
      emails: read.emails.filter((e) => e.sourceFile === name).length,
      skipped: read.skipped.filter((s) => s.sourceFile === name).length,
    };
  });

  return {
    files,
    total: read.emails.length,
    unique: unique.length,
    duplicates: duplicates.length,
    skipped: read.skipped.length,
    derivedIds: unique.filter((e) => e.derivedMessageId).length,
    emptyBodies: unique.filter((e) => e.body === "").length,
    buckets,
    topDomains: [...domains.entries()]
      .map(([domain, v]) => ({
        domain,
        count: v.count,
        bucket: v.buckets.size === 1 ? [...v.buckets][0]! : ("mixed" as const),
      }))
      .sort((a, b) => b.count - a.count || a.domain.localeCompare(b.domain))
      .slice(0, topN),
    earliest,
    latest,
  };
}

export function formatInventory(inv: Inventory): string {
  // Melbourne dates, as the spreadsheet shows them.
  const day = (d: Date | null) => (d ? formatWallClock(d, DEFAULT_TIMEZONE).slice(0, 10) : "—");
  const lines = [
    "",
    "GradTracker labelling inventory",
    "─".repeat(64),
    ...inv.files.map(
      (f) => `  ${f.file.padEnd(40)} ${String(f.emails).padStart(5)} emails` +
        (f.skipped ? `   ${f.skipped} skipped` : ""),
    ),
    "",
    `Emails read                ${inv.total}`,
    `  duplicates removed       ${inv.duplicates}   (the same email in two exports)`,
    `  unique                   ${inv.unique}`,
    `Skipped as unreadable      ${inv.skipped}`,
    `No Message-ID (derived)    ${inv.derivedIds}`,
    `No text body               ${inv.emptyBodies}   (cannot become fixtures)`,
    `Date range (Melbourne)     ${day(inv.earliest)} → ${day(inv.latest)}`,
    "",
    "By sender — a sizing heuristic, NOT a label:",
    `  candidate application    ${inv.buckets["candidate application"]}`,
    `  job board                ${inv.buckets["job board"]}`,
    `  other                    ${inv.buckets.other}`,
    "",
    "Top sender domains:",
    ...inv.topDomains.map(
      (d) => `  ${d.domain.padEnd(40)} ${String(d.count).padStart(5)}   ${d.bucket}`,
    ),
    "",
  ];
  return lines.join("\n");
}
