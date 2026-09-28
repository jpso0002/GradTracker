import { proportion, type Proportion } from "../harness/metrics.js";
import { DEFAULT_TIMEZONE, parseDeadline } from "../time/zoned-time.js";
import { readSheet, type SheetRow } from "./sheet.js";

/**
 * Label agreement (decision D32): two people label the same sample
 * independently, and this measures how often they agree.
 *
 * It is what makes the labels themselves evidence. An accuracy figure is only
 * as good as the ground truth it is scored against, and "two labellers agreed
 * on 96% of emails" is the claim that the ground truth is not one person's
 * opinion.
 *
 * Cohen's kappa is reported beside raw agreement because raw agreement flatters
 * a skewed sample: if 90% of emails are negatives, two labellers who both
 * answered "no" to everything would agree 90% of the time and know nothing.
 */

export interface Measure {
  agreement: Proportion;
  /** Null where it is undefined — both labellers used a single category. */
  kappa: number | null;
}

export interface Disagreement {
  rowA: number;
  rowB: number;
  field: string;
  a: string;
  b: string;
}

export interface AgreementReport {
  /** Emails both labellers labelled. */
  overlap: number;
  isApplication: Measure;
  stage: Measure;
  company: Measure;
  role: Measure;
  deadline: Measure;
  disagreements: Disagreement[];
}

/** κ = (observed − chance) / (1 − chance), over any number of categories. */
export function cohensKappa(pairs: [string, string][]): number | null {
  const n = pairs.length;
  if (n === 0) return null;
  const categories = new Set(pairs.flat());
  const observed = pairs.filter(([a, b]) => a === b).length / n;
  let chance = 0;
  for (const c of categories) {
    chance += (pairs.filter(([a]) => a === c).length / n) * (pairs.filter(([, b]) => b === c).length / n);
  }
  return chance === 1 ? null : (observed - chance) / (1 - chance);
}

/** Case- and whitespace-insensitive — the harness's own rule for text fields. */
const sameText = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

function deadlineOf(row: SheetRow): string {
  if (row.deadline === "") return "";
  try {
    return parseDeadline(row.deadline, row.deadlineTimezone || DEFAULT_TIMEZONE).toISOString();
  } catch {
    return `unreadable: ${String(row.deadline)}`;
  }
}

function measure(
  pairs: [SheetRow, SheetRow][],
  read: (row: SheetRow) => string,
  field: string,
  disagreements: Disagreement[],
  compare: (a: string, b: string) => boolean = (a, b) => a === b,
): Measure {
  const values = pairs.map(([a, b]): [string, string] => [read(a), read(b)]);
  let agreed = 0;
  values.forEach(([va, vb], i) => {
    if (compare(va, vb)) agreed += 1;
    else {
      const [a, b] = pairs[i]!;
      disagreements.push({ rowA: a.sheetRow, rowB: b.sheetRow, field, a: va || "(blank)", b: vb || "(blank)" });
    }
  });
  return { agreement: proportion(agreed, values.length), kappa: cohensKappa(values) };
}

export function compareRows(a: SheetRow[], b: SheetRow[]): AgreementReport {
  const byId = new Map(b.filter((r) => r.isApplication !== "").map((r) => [r.messageId, r]));
  const pairs: [SheetRow, SheetRow][] = a
    .filter((r) => r.isApplication !== "" && byId.has(r.messageId))
    .map((r) => [r, byId.get(r.messageId)!]);

  const disagreements: Disagreement[] = [];
  const yes = (r: SheetRow) => r.isApplication.toLowerCase() === "yes";
  const bothApplications = pairs.filter(([ra, rb]) => yes(ra) && yes(rb));
  const bothDeadlines = bothApplications.filter(
    ([ra, rb]) => ra.deadlineLanguage.toLowerCase() === "yes" && rb.deadlineLanguage.toLowerCase() === "yes",
  );

  return {
    overlap: pairs.length,
    isApplication: measure(pairs, (r) => r.isApplication.toLowerCase(), "is_application", disagreements),
    // Fields are compared only where both labellers said "application": a
    // stage on an email one of them rejected is not a disagreement about stage.
    stage: measure(bothApplications, (r) => r.stage, "stage", disagreements),
    company: measure(bothApplications, (r) => r.company, "company", disagreements, sameText),
    role: measure(bothApplications, (r) => r.role, "role", disagreements, sameText),
    deadline: measure(bothDeadlines, deadlineOf, "deadline", disagreements),
    disagreements: disagreements.sort((x, y) => x.rowA - y.rowA),
  };
}

export async function compareSheets(pathA: string, pathB: string): Promise<AgreementReport> {
  return compareRows(await readSheet(pathA), await readSheet(pathB));
}

export function formatAgreement(report: AgreementReport): string {
  const pct = (v: number) => `${(v * 100).toFixed(1)} %`;
  const line = (label: string, m: Measure) => {
    const { agreement: p, kappa } = m;
    if (p.n === 0) return `${label.padEnd(18)}—          (n=0: nothing to compare)`;
    const ci = p.interval ? `95% CI ${pct(p.interval.lower)} – ${pct(p.interval.upper)}` : "";
    const k = kappa === null ? "κ n/a" : `κ ${kappa.toFixed(2)}`;
    return `${label.padEnd(18)}${pct(p.value).padEnd(10)} (${p.successes}/${p.n})   ${k.padEnd(8)} ${ci}`;
  };

  return [
    "",
    "GradTracker label agreement",
    "─".repeat(72),
    `Emails both labellers labelled: ${report.overlap}`,
    "",
    line("is_application", report.isApplication),
    line("stage", report.stage),
    line("company", report.company),
    line("role", report.role),
    line("deadline", report.deadline),
    "",
    report.disagreements.length === 0
      ? "No disagreements."
      : `Disagreements to resolve (${report.disagreements.length}):`,
    ...report.disagreements.map(
      (d) => `  rows ${String(d.rowA).padStart(3)} / ${String(d.rowB).padStart(3)}  ${d.field.padEnd(15)} "${d.a}" vs "${d.b}"`,
    ),
    "",
  ].join("\n");
}
