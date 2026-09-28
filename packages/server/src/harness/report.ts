import type { Proportion, Report } from "./metrics.js";
import { THRESHOLDS } from "./metrics.js";

/** Formats the accuracy report. Separated from the arithmetic so the numbers
 *  can be tested without parsing text. */

const RULE = "─".repeat(72);

const pct = (value: number, places = 1): string => `${(value * 100).toFixed(places)} %`;
const pad = (label: string, width = 26): string => label.padEnd(width);

/** The point estimate — or a dash where there was nothing to measure, since
 *  printing "0.0 %" for 0/0 would claim a result that does not exist. */
const figure = (p: Proportion): string => (p.n === 0 ? "—" : pct(p.value));

/** The interval line printed beneath every figure (T2.9). */
const intervalLine = (p: Proportion): string =>
  p.interval === null
    ? `${pad("")}95% CI —  (n=0: nothing to measure)`
    : `${pad("")}95% CI ${pct(p.interval.lower)} – ${pct(p.interval.upper)}  (Wilson, n=${p.n})`;

export interface ReportContext {
  promptVersion: string;
  model: string;
  /** True when the fake classifier produced these numbers. */
  isSelfTest: boolean;
}

export function formatReport(report: Report, context: ReportContext): string {
  const lines: string[] = [];
  const { matrix: m } = report;

  lines.push("");
  lines.push(
    `GradTracker classification accuracy — prompt ${context.promptVersion}, model ${context.model}`,
  );
  lines.push(RULE);

  if (context.isSelfTest) {
    // Without this banner the harness reports 100% and someone screenshots it.
    // The fake replays the corpus labels, so it is measuring the harness, not a
    // model — a distinction that matters enormously at a milestone review.
    lines.push("");
    lines.push("  ⚠  SELF-TEST — not a measurement of any model.");
    lines.push("     The fake classifier replays the corpus labels, so a perfect score here");
    lines.push("     verifies the harness works, nothing more. Run with --live for a real");
    lines.push("     figure, or --demo to see the report shape with injected errors.");
    lines.push("");
  }

  lines.push(
    `${pad("Corpus")}${m.total} emails  (${m.truePositives + m.falseNegatives} application / ${
      m.trueNegatives + m.falsePositives
    } not)`,
  );
  lines.push("");

  // Every percentage below is followed by its interval (T2.9). A figure without
  // one would overstate what a corpus of this size can measure.
  const f = report.figures;

  // ── SM-1 ──────────────────────────────────────────────────────────────────
  lines.push(
    pad("Accuracy") +
      figure(f.accuracy).padEnd(12) +
      `(${f.accuracy.successes}/${f.accuracy.n})`.padEnd(26) +
      `target ≥${THRESHOLDS.ACCURACY * 100}%   ${report.passedAccuracy ? "PASS" : "FAIL"}`,
  );
  lines.push(intervalLine(f.accuracy));
  lines.push(
    `${pad("Precision")}${figure(f.precision).padEnd(12)}(${f.precision.successes}/${f.precision.n} predicted)`,
  );
  lines.push(intervalLine(f.precision));
  lines.push(
    `${pad("Recall")}${figure(f.recall).padEnd(12)}(${f.recall.successes}/${f.recall.n} actual)`,
  );
  lines.push(intervalLine(f.recall));
  lines.push("");

  // ── SM-2 ──────────────────────────────────────────────────────────────────
  lines.push(
    `${pad("False negatives")}${String(m.falseNegatives).padStart(6)}      ◄ missed applications        [SM-2]`,
  );
  lines.push(
    `${pad("False-negative rate")}${figure(f.falseNegativeRate).padEnd(12)}(${
      f.falseNegativeRate.successes
    }/${f.falseNegativeRate.n} actual)`,
  );
  lines.push(intervalLine(f.falseNegativeRate));
  lines.push(`${pad("False positives")}${String(m.falsePositives).padStart(6)}`);
  lines.push("");

  // ── SM-3 ──────────────────────────────────────────────────────────────────
  const d = report.deadlines;
  lines.push(
    pad("Deadline detection") +
      figure(f.deadlineDetection).padEnd(12) +
      `(${d.correctDate}/${d.denominator} deadline-bearing)`.padEnd(26) +
      `target ≥${THRESHOLDS.DEADLINE_DETECTION * 100}%   ${report.passedDeadlines ? "PASS" : "FAIL"}`,
  );
  lines.push(intervalLine(f.deadlineDetection));
  lines.push(
    `${pad("  exact time")}${figure(f.deadlineExactTime).padEnd(12)}(${d.correctTime}/${d.denominator})`,
  );
  lines.push(intervalLine(f.deadlineExactTime));
  lines.push(`${pad("")}missed ${d.missed} · invented ${d.hallucinated}`);
  lines.push("");

  // ── Field accuracy ────────────────────────────────────────────────────────
  if (report.fields.denominator > 0) {
    lines.push(`Field accuracy (on ${report.fields.denominator} true positives)`);
    for (const field of ["company", "role", "stage"] as const) {
      const p = f[field];
      lines.push(`  ${pad(field, 24)}${figure(p).padEnd(12)}(${p.successes}/${p.n})`);
      lines.push(intervalLine(p));
    }
    lines.push("");
  }

  // ── Named failures ────────────────────────────────────────────────────────
  // A percentage tells you nothing about what to fix. Fixture ids do.
  if (report.missed.length > 0) {
    lines.push("Missed applications (false negatives) — the costly failure:");
    for (const f of report.missed) {
      lines.push(`  ${f.id.padEnd(34)} confidence ${f.confidence.toFixed(2)}  → ${f.detail}`);
    }
    lines.push("");
  }

  if (report.falseAlarms.length > 0) {
    lines.push("False alarms (non-applications classified as applications):");
    for (const f of report.falseAlarms) {
      lines.push(`  ${f.id.padEnd(34)} confidence ${f.confidence.toFixed(2)}  → ${f.detail}`);
    }
    lines.push("");
  }

  if (report.deadlineFailures.length > 0) {
    lines.push("Deadline failures:");
    for (const f of report.deadlineFailures) {
      lines.push(`  ${f.id.padEnd(34)} ${f.detail}`);
    }
    lines.push("");
  }

  lines.push(RULE);
  const passedCount = Number(report.passedAccuracy) + Number(report.passedDeadlines);
  lines.push(
    report.passed
      ? `PASS — ${passedCount} thresholds met`
      : `FAIL — ${passedCount}/2 thresholds met`,
  );

  if (context.isSelfTest) {
    lines.push("(self-test: the corpus scored against itself)");
  }
  lines.push("");

  return lines.join("\n");
}
