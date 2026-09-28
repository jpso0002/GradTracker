import ExcelJS from "exceljs";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import {
  StageEnum,
  FixtureEmailSchema,
  ExpectedClassificationSchema,
  type ExpectedClassification,
  type FixtureEmail,
} from "@gradtracker/shared";
import { senderDomain } from "../ports/index.js";
import { dedupeById, type MailboxEmail } from "../mailbox/reader.js";
import { STAGE_DEFINITIONS } from "../adapters/classifier/prompt.js";
import { assertOutsideRepository } from "./guard.js";
import { writeManifest } from "./freeze.js";
import {
  DEADLINE_TIMEZONES,
  DEFAULT_TIMEZONE,
  formatWallClock,
  isValidTimeZone,
  parseDeadline,
} from "../time/zoned-time.js";

/**
 * The labelling spreadsheet (T2.11): export emails to it, import labels from it.
 *
 * **Self-contained.** The sheet carries the email content as well as the
 * labels, so importing needs nothing but the sheet — it survives a round trip
 * through Google Sheets. Content columns are grey and not to be edited; label
 * columns carry real dropdowns, which is why this is `.xlsx` and not CSV.
 *
 * **Import is all-or-nothing.** Every labelled row is validated against the
 * same schema the harness loads fixtures with, and any error — reported with its
 * row number — stops the import before a single file is written.
 */

const LABEL_SHEET = "Label";
const README_SHEET = "README";

/** Excel's cell limit is 32,767 characters; Google Sheets' is 50,000. */
export const BODY_LIMIT = 32_000;

/** Read by header name, so a labeller reordering columns cannot break import. */
export const HEADERS = {
  row: "row",
  received: "received (Melbourne)",
  from: "from",
  senderDomain: "sender domain",
  subject: "subject",
  body: "body",
  isApplication: "is_application",
  company: "company",
  role: "role",
  stage: "stage",
  deadlineLanguage: "deadline_language",
  deadline: "deadline",
  deadlineTimezone: "deadline_timezone",
  notes: "notes",
  labeller: "labeller",
  messageId: "message_id",
  threadId: "thread_id",
  receivedUtc: "received_utc",
  sourceFile: "source_file",
  bodyTruncated: "body_truncated",
} as const;

type Key = keyof typeof HEADERS;

const COLUMNS: { key: Key; width: number; editable: boolean }[] = [
  { key: "row", width: 6, editable: false },
  { key: "received", width: 18, editable: false },
  { key: "from", width: 30, editable: false },
  { key: "senderDomain", width: 22, editable: false },
  { key: "subject", width: 48, editable: false },
  { key: "body", width: 60, editable: false },
  { key: "isApplication", width: 15, editable: true },
  { key: "company", width: 22, editable: true },
  { key: "role", width: 28, editable: true },
  { key: "stage", width: 14, editable: true },
  { key: "deadlineLanguage", width: 18, editable: true },
  { key: "deadline", width: 18, editable: true },
  { key: "deadlineTimezone", width: 21, editable: true },
  { key: "notes", width: 30, editable: true },
  { key: "labeller", width: 10, editable: true },
  { key: "messageId", width: 30, editable: false },
  { key: "threadId", width: 22, editable: false },
  { key: "receivedUtc", width: 25, editable: false },
  { key: "sourceFile", width: 22, editable: false },
  { key: "bodyTruncated", width: 15, editable: false },
];

const GREY = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEDEDED" } } as const;
const list = (values: readonly string[]) => [`"${values.join(",")}"`];

/** Deterministic order from a seed: the same seed always picks the same rows,
 *  and nobody chooses which emails end up where. */
function seededOrder<T>(items: T[], key: (item: T) => string, seed: string): T[] {
  const hash = (item: T) => createHash("sha256").update(`${seed}\u0000${key(item)}`).digest("hex");
  return [...items].sort((a, b) => hash(a).localeCompare(hash(b)));
}

// ── Export ──────────────────────────────────────────────────────────────────

export interface ExportOptions {
  /** Export only this many emails, chosen by seed — for the agreement sample. */
  sample?: number;
  seed?: string;
}

export interface ExportResult {
  rows: number;
  duplicates: number;
  truncated: number;
}

export async function exportSheet(
  emails: MailboxEmail[],
  outPath: string,
  options: ExportOptions = {},
): Promise<ExportResult> {
  assertOutsideRepository(outPath);

  const { unique, duplicates } = dedupeById(emails);
  let chosen = unique;
  if (options.sample !== undefined) {
    chosen = seededOrder(unique, (e) => e.gmailMessageId, options.seed ?? "gradtracker").slice(
      0,
      options.sample,
    );
  }
  chosen = [...chosen].sort((a, b) => a.receivedAt.getTime() - b.receivedAt.getTime());

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(LABEL_SHEET, {
    views: [{ state: "frozen", ySplit: 1, xSplit: 1 }],
  });
  sheet.columns = COLUMNS.map((c) => ({ header: HEADERS[c.key], key: c.key, width: c.width }));
  sheet.getRow(1).font = { bold: true };
  sheet.getColumn("deadline").numFmt = "@";

  let truncated = 0;
  chosen.forEach((email, index) => {
    const tooLong = email.body.length > BODY_LIMIT;
    if (tooLong) truncated += 1;
    const row = sheet.addRow({
      row: index + 1,
      received: formatWallClock(email.receivedAt, DEFAULT_TIMEZONE),
      from: email.fromAddress,
      senderDomain: senderDomain(email.fromAddress) ?? "",
      subject: email.subject,
      body: tooLong ? email.body.slice(0, BODY_LIMIT) : email.body,
      deadlineTimezone: DEFAULT_TIMEZONE,
      messageId: email.gmailMessageId,
      threadId: email.gmailThreadId,
      receivedUtc: email.receivedAt.toISOString(),
      sourceFile: email.sourceFile,
      bodyTruncated: tooLong ? "yes" : "no",
    });

    for (const [i, column] of COLUMNS.entries()) {
      if (!column.editable) row.getCell(i + 1).fill = GREY;
    }
    row.getCell("isApplication").dataValidation = { type: "list", allowBlank: true, formulae: list(["yes", "no"]) };
    row.getCell("stage").dataValidation = { type: "list", allowBlank: true, formulae: list(StageEnum.options) };
    row.getCell("deadlineLanguage").dataValidation = { type: "list", allowBlank: true, formulae: list(["yes", "no"]) };
    row.getCell("deadlineTimezone").dataValidation = { type: "list", allowBlank: true, formulae: list(DEADLINE_TIMEZONES) };
  });

  addReadme(workbook);
  await workbook.xlsx.writeFile(outPath);

  return { rows: chosen.length, duplicates: duplicates.length, truncated };
}

function addReadme(workbook: ExcelJS.Workbook): void {
  const readme = workbook.addWorksheet(README_SHEET);
  readme.getColumn(1).width = 22;
  readme.getColumn(2).width = 110;
  const lines: [string, string][] = [
    ["GradTracker labelling", "The full rules are in docs/labelling-guide.md. This tab is a reminder, not a replacement."],
    ["", ""],
    ["Grey columns", "The email. Do not edit them — import reads the content from here."],
    ["is_application", "yes = about an application THIS student has already made. An invitation to apply is no. Blank = leave the email out (your own sent mail, or anything private)."],
    ["company, role", "As this email itself names them — never the ATS. Blank if this email does not say, even if you know."],
    ["stage", "Required when is_application is yes. Definitions below — the model's own words."],
    ["deadline_language", "yes = the email sets a deadline the student must meet. Only for applications."],
    ["deadline", "YYYY-MM-DD HH:MM, or YYYY-MM-DD for a date with no time (read as 23:59)."],
    ["", "Hours are exact ('expires in 48 hours'); days are not ('within 5 business days' = 23:59 on the fifth weekday). The guide lists every case."],
    ["deadline_timezone", `The timezone the email states the deadline in. Default ${DEFAULT_TIMEZONE}.`],
    ["", ""],
    ["Stages", "(verbatim from the classifier prompt, so labellers and the model share one definition)"],
    ...StageEnum.options.map((stage): [string, string] => [`  ${stage}`, STAGE_DEFINITIONS[stage]]),
    ["", ""],
    ["Privacy", "This file contains real email. Keep it outside the GradTracker repository and out of shared chats."],
  ];
  for (const [label, text] of lines) readme.addRow([label, text]);
  readme.getColumn(1).font = { bold: true };
}

// ── Reading a sheet back ────────────────────────────────────────────────────

export type SheetRow = Record<Exclude<Key, "deadline">, string> & {
  deadline: string | Date;
  /** The spreadsheet row number, for error messages. */
  sheetRow: number;
};

/** A cell as the labeller meant it: rich text flattened, formulas resolved,
 *  and a date kept as a Date (see `parseDeadline`). */
function cellValue(value: ExcelJS.CellValue): string | Date {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value;
  if (typeof value === "object") {
    if ("richText" in value) return value.richText.map((part) => part.text).join("");
    if ("text" in value && typeof value.text === "string") return value.text;
    if ("result" in value) return cellValue(value.result as ExcelJS.CellValue);
    return "";
  }
  return String(value);
}

export async function readSheet(path: string): Promise<SheetRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(path);
  const sheet = workbook.getWorksheet(LABEL_SHEET);
  if (!sheet) throw new Error(`${basename(path)} has no "${LABEL_SHEET}" sheet — is it a labelling export?`);

  const columnOf = new Map<string, number>();
  sheet.getRow(1).eachCell((cell, col) => columnOf.set(String(cellValue(cell.value)).trim(), col));
  for (const header of Object.values(HEADERS)) {
    if (!columnOf.has(header)) throw new Error(`${basename(path)} is missing the "${header}" column.`);
  }

  const rows: SheetRow[] = [];
  sheet.eachRow((row, sheetRow) => {
    if (sheetRow === 1) return;
    const get = (key: Key) => cellValue(row.getCell(columnOf.get(HEADERS[key])!).value);
    const text = (key: Exclude<Key, "deadline">) => {
      const v = get(key);
      return (v instanceof Date ? v.toISOString() : v).trim();
    };
    const entry = { sheetRow, deadline: get("deadline") } as SheetRow;
    for (const key of Object.keys(HEADERS) as Key[]) {
      if (key !== "deadline") entry[key] = text(key);
    }
    if (typeof entry.deadline === "string") entry.deadline = entry.deadline.trim();
    if (entry.messageId !== "") rows.push(entry);
  });
  return rows;
}

// ── Import ──────────────────────────────────────────────────────────────────

export class LabelError extends Error {
  constructor(readonly problems: string[]) {
    super(`${problems.length} labelling problem${problems.length === 1 ? "" : "s"} — nothing was written:\n  ${problems.join("\n  ")}`);
    this.name = "LabelError";
  }
}

export interface Labelled {
  row: SheetRow;
  email: Omit<FixtureEmail, "id">;
  expected: ExpectedClassification;
}

const yesNo = (value: string) => value.toLowerCase();

/** Turns one labelled row into a fixture, or the reasons it cannot be one. */
export function labelFromRow(row: SheetRow): Labelled | string[] {
  const problems: string[] = [];
  const at = (field: string, message: string) => problems.push(`row ${row.sheetRow}: ${field} — ${message}`);

  const isApplication = yesNo(row.isApplication);
  if (isApplication !== "yes" && isApplication !== "no") {
    at("is_application", `must be yes or no, not "${row.isApplication}"`);
    return problems;
  }
  const application = isApplication === "yes";

  const stage = row.stage === "" ? null : row.stage;
  if (stage !== null && !StageEnum.options.includes(stage as never)) {
    at("stage", `"${row.stage}" is not one of ${StageEnum.options.join(", ")}`);
  }
  if (application && stage === null) at("stage", "an application needs a stage");

  const language = yesNo(row.deadlineLanguage);
  if (language !== "" && language !== "yes" && language !== "no") {
    at("deadline_language", `must be yes, no or blank, not "${row.deadlineLanguage}"`);
  }
  const zone = row.deadlineTimezone === "" ? DEFAULT_TIMEZONE : row.deadlineTimezone;
  if (!isValidTimeZone(zone)) at("deadline_timezone", `"${zone}" is not a timezone`);

  let deadlineAt: string | null = null;
  const hasDeadline = row.deadline instanceof Date || row.deadline !== "";
  if (hasDeadline && isValidTimeZone(zone)) {
    try {
      deadlineAt = parseDeadline(row.deadline, zone).toISOString();
    } catch (error) {
      at("deadline", (error as Error).message);
    }
  }
  if (application && hasDeadline && language !== "yes") {
    at("deadline_language", "a deadline was entered, so this must be yes");
  }
  if (application && language === "yes" && !hasDeadline) {
    // The schema would refuse this too, in its own words; this says what to do.
    at("deadline", "deadline_language is yes, so enter the deadline — the guide shows how to resolve 'by Friday' or 'within 5 business days'");
  }

  if (!application) {
    // Named here, rather than left to the schema, so the message says what to do.
    if (row.company || row.role || stage || hasDeadline || language === "yes") {
      at("is_application", "is no, so company, role, stage and deadline must all be blank");
    }
  }

  if (row.body === "") at("body", "the email has no text, so it cannot become a fixture");
  if (problems.length > 0) return problems;

  const email = FixtureEmailSchema.omit({ id: true }).safeParse({
    gmailMessageId: row.messageId,
    gmailThreadId: row.threadId || row.messageId,
    receivedAt: row.receivedUtc,
    fromAddress: row.from,
    subject: row.subject,
    body: row.body,
  });
  const expected = ExpectedClassificationSchema.safeParse({
    isApplication: application,
    company: row.company || null,
    role: row.role || null,
    stage,
    deadlineAt,
    hasExplicitDeadlineLanguage: language === "yes",
    ...(row.notes ? { note: row.notes } : {}),
  });

  for (const result of [email, expected]) {
    if (!result.success) {
      for (const issue of result.error.issues) at(issue.path.join(".") || "row", issue.message);
    }
  }
  if (problems.length > 0 || !email.success || !expected.success) return problems;

  return { row, email: email.data, expected: expected.data };
}

export interface ImportOptions {
  /** Real emails to set aside for tuning; the rest become the held-out set. */
  tuning?: number;
  seed?: string;
}

export interface ImportResult {
  written: number;
  unlabelled: number;
  sets: { name: string; dir: string; fixtures: number; applications: number }[];
}

export async function importSheet(
  sheetPath: string,
  outDir: string,
  options: ImportOptions = {},
): Promise<ImportResult> {
  assertOutsideRepository(outDir);
  if (existsSync(outDir) && readdirSync(outDir).length > 0) {
    // A frozen held-out set must never be overwritten by a later import.
    throw new Error(`${outDir} already exists and is not empty. Import into a new folder.`);
  }

  const rows = await readSheet(sheetPath);
  const problems: string[] = [];
  const labelled: Labelled[] = [];
  let unlabelled = 0;

  const seen = new Map<string, number>();
  for (const row of rows) {
    if (row.isApplication === "") {
      unlabelled += 1;
      continue;
    }
    const earlier = seen.get(row.messageId);
    if (earlier !== undefined) {
      problems.push(`row ${row.sheetRow}: message_id — the same email as row ${earlier}`);
      continue;
    }
    seen.set(row.messageId, row.sheetRow);

    const result = labelFromRow(row);
    if (Array.isArray(result)) problems.push(...result);
    else labelled.push(result);
  }

  if (problems.length > 0) throw new LabelError(problems);
  if (labelled.length === 0) throw new LabelError(["no labelled rows — fill in is_application first"]);

  const sets = options.tuning === undefined
    ? [{ name: "all", dir: outDir, items: labelled }]
    : splitSets(labelled, options.tuning, options.seed ?? "gradtracker", outDir);

  const result: ImportResult = { written: 0, unlabelled, sets: [] };
  for (const set of sets) {
    writeFixtures(set.items, set.dir);
    if (set.name === "held-out") writeManifest(set.dir, basename(sheetPath), options.seed ?? "gradtracker");
    result.written += set.items.length;
    result.sets.push({
      name: set.name,
      dir: set.dir,
      fixtures: set.items.length,
      applications: set.items.filter((l) => l.expected.isApplication).length,
    });
  }
  return result;
}

/**
 * Tuning and held-out, stratified: each set keeps the whole sheet's balance of
 * applications to non-applications. Chosen by seed, so the same sheet and seed
 * always give the same split and nobody hand-picks the held-out emails.
 */
function splitSets(labelled: Labelled[], tuning: number, seed: string, outDir: string) {
  if (!Number.isInteger(tuning) || tuning < 0 || tuning >= labelled.length) {
    throw new Error(`--tuning must be a whole number below the ${labelled.length} labelled rows.`);
  }
  const positives = labelled.filter((l) => l.expected.isApplication);
  const negatives = labelled.filter((l) => !l.expected.isApplication);
  const tuningPositives = Math.round((tuning * positives.length) / labelled.length);

  const order = (items: Labelled[]) => seededOrder(items, (l) => l.email.gmailMessageId, seed);
  const pickedPositives = order(positives).slice(0, tuningPositives);
  const pickedNegatives = order(negatives).slice(0, tuning - tuningPositives);
  const tuningIds = new Set([...pickedPositives, ...pickedNegatives].map((l) => l.email.gmailMessageId));

  return [
    { name: "tuning", dir: join(outDir, "tuning"), items: labelled.filter((l) => tuningIds.has(l.email.gmailMessageId)) },
    { name: "held-out", dir: join(outDir, "held-out"), items: labelled.filter((l) => !tuningIds.has(l.email.gmailMessageId)) },
  ];
}

function slug(text: string): string {
  const s = text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
  return s || "unknown";
}

function writeFixtures(items: Labelled[], dir: string): void {
  if (items.length > 999) throw new Error("A fixture set holds at most 999 emails (ids are NNN-slug).");
  const emailsDir = join(dir, "emails");
  const expectedDir = join(dir, "expected");
  mkdirSync(emailsDir, { recursive: true });
  mkdirSync(expectedDir, { recursive: true });

  items.forEach((item, index) => {
    const id = `${String(index + 1).padStart(3, "0")}-${slug(senderDomain(item.email.fromAddress) ?? "unknown")}`;
    writeFileSync(join(emailsDir, `${id}.json`), JSON.stringify({ id, ...item.email }, null, 2) + "\n");
    writeFileSync(join(expectedDir, `${id}.json`), JSON.stringify(item.expected, null, 2) + "\n");
  });
}
