import type { Fixture, Stage } from "@gradtracker/shared";
import type { ClassificationResult } from "../ports/index.js";

/**
 * Scoring for the accuracy harness. Pure functions, no I/O — the arithmetic
 * behind SM-1, SM-2 and SM-3 is the part that must not be wrong, so it is
 * separated from the running and the printing and tested directly.
 */

export interface Scored {
  fixture: Fixture;
  predicted: ClassificationResult;
}

export interface ConfusionMatrix {
  truePositives: number;
  falsePositives: number;
  /** Missed applications. The costly failure — SM-2 tracks this explicitly. */
  falseNegatives: number;
  trueNegatives: number;
  total: number;
}

export function confusionMatrix(scored: Scored[]): ConfusionMatrix {
  const m: ConfusionMatrix = {
    truePositives: 0,
    falsePositives: 0,
    falseNegatives: 0,
    trueNegatives: 0,
    total: scored.length,
  };

  for (const { fixture, predicted } of scored) {
    const actual = fixture.expected.isApplication;
    if (actual && predicted.isApplication) m.truePositives += 1;
    else if (!actual && predicted.isApplication) m.falsePositives += 1;
    else if (actual && !predicted.isApplication) m.falseNegatives += 1;
    else m.trueNegatives += 1;
  }

  return m;
}

/** Ratio guarded against a zero denominator — an empty class scores 0, not NaN. */
const ratio = (numerator: number, denominator: number): number =>
  denominator === 0 ? 0 : numerator / denominator;

export const accuracy = (m: ConfusionMatrix): number =>
  ratio(m.truePositives + m.trueNegatives, m.total);

/** Of what we called an application, how much was. */
export const precision = (m: ConfusionMatrix): number =>
  ratio(m.truePositives, m.truePositives + m.falsePositives);

/** Of the actual applications, how many we found. The complement of SM-2. */
export const recall = (m: ConfusionMatrix): number =>
  ratio(m.truePositives, m.truePositives + m.falseNegatives);

/**
 * Wilson score interval (T2.7).
 *
 * Not the textbook `p ± z·√(p(1−p)/n)` normal approximation, which behaves
 * badly exactly where this corpus sits: small n and a proportion near 1. At
 * n=80 and p=0.9625 the normal approximation produces an upper bound above
 * 100%, which is not a possible accuracy. Wilson is asymmetric and stays
 * inside [0,1].
 *
 * This is why the interval is printed at all: at n=80 it spans roughly ±5
 * points, so "96.3%" and "91%" are not distinguishable by this corpus. Quoting
 * the point estimate alone would overstate what has been measured.
 */
export interface Interval {
  lower: number;
  upper: number;
}

export function wilsonInterval(successes: number, n: number, z = 1.96): Interval {
  if (n === 0) return { lower: 0, upper: 0 };

  const z2 = z * z;
  const denominator = n + z2;
  const centre = (successes + z2 / 2) / denominator;
  const spread =
    (z / denominator) * Math.sqrt((successes * (n - successes)) / n + z2 / 4);

  return {
    lower: Math.max(0, centre - spread),
    upper: Math.min(1, centre + spread),
  };
}

/**
 * One reported figure (T2.9).
 *
 * Every proportion the harness states carries its own denominator and its own
 * interval, so none can be quoted without its uncertainty. RQ-03 requires this
 * of accuracy, precision, recall and false negatives; decision D33 extends it
 * to every proportion reported. Before T2.9 only accuracy had one (defect C12).
 */
export interface Proportion {
  /** The point estimate. 0 when `n` is 0 — which is why `n` travels with it. */
  value: number;
  successes: number;
  n: number;
  /** Wilson 95%. Null when `n` is 0: an empty denominator has no interval, for
   *  the same reason T2.7 refuses to pass SM-3 on 0/0. */
  interval: Interval | null;
}

export function proportion(successes: number, n: number): Proportion {
  return {
    value: ratio(successes, n),
    successes,
    n,
    interval: n === 0 ? null : wilsonInterval(successes, n),
  };
}

/** Every figure the report prints, each with its interval. */
export interface Figures {
  accuracy: Proportion;
  precision: Proportion;
  recall: Proportion;
  /** Missed applications as a share of the applications that exist — SM-2
   *  stated as a figure, not only as a count. The complement of recall. */
  falseNegativeRate: Proportion;
  deadlineDetection: Proportion;
  deadlineExactTime: Proportion;
  company: Proportion;
  role: Proportion;
  stage: Proportion;
}

// ── Deadline detection (SM-3) ───────────────────────────────────────────────

export interface DeadlineScore {
  /** Fixtures whose label says the email contains explicit deadline language.
   *  The SM-3 denominator — an email with no deadline in it cannot be scored
   *  on whether one was extracted. */
  denominator: number;
  /** Predicted a deadline falling on the labelled calendar day. */
  correctDate: number;
  /** Predicted within one hour of the labelled time. Reported separately
   *  because a 9am deadline predicted as 11:59pm is a missed assessment even
   *  though the date matches. */
  correctTime: number;
  /** Labelled a deadline, predicted none. */
  missed: number;
  /** Predicted a deadline on a fixture labelled as having none. Includes the
   *  negative controls: an interview time, an applications-close date meant
   *  for other people, a promise about when the employer will act. */
  hallucinated: number;
}

const HOUR_MS = 60 * 60 * 1000;

export function deadlineScore(scored: Scored[]): DeadlineScore {
  const score: DeadlineScore = {
    denominator: 0,
    correctDate: 0,
    correctTime: 0,
    missed: 0,
    hallucinated: 0,
  };

  for (const { fixture, predicted } of scored) {
    const label = fixture.expected;
    const predictedAt = predicted.deadlineAt ? new Date(predicted.deadlineAt) : null;

    if (!label.hasExplicitDeadlineLanguage) {
      if (predictedAt !== null && label.deadlineAt === null) score.hallucinated += 1;
      continue;
    }

    score.denominator += 1;
    if (predictedAt === null) {
      score.missed += 1;
      continue;
    }

    const expectedAt = new Date(label.deadlineAt!);
    if (predictedAt.toISOString().slice(0, 10) === expectedAt.toISOString().slice(0, 10)) {
      score.correctDate += 1;
    }
    if (Math.abs(predictedAt.getTime() - expectedAt.getTime()) <= HOUR_MS) {
      score.correctTime += 1;
    }
  }

  return score;
}

// ── Field accuracy, on true positives only ──────────────────────────────────

export interface FieldAccuracy {
  denominator: number;
  company: number;
  role: number;
  stage: number;
}

/** Case- and whitespace-insensitive. Deliberately NOT fuzzy: "Deloitte" and
 *  "Deloitte Australia" are different answers, and a scorer that forgives the
 *  difference hides a real extraction problem. */
const sameText = (a: string | null, b: string | null): boolean =>
  (a ?? "").trim().toLowerCase() === (b ?? "").trim().toLowerCase();

export function fieldAccuracy(scored: Scored[]): FieldAccuracy {
  const truePositives = scored.filter(
    ({ fixture, predicted }) => fixture.expected.isApplication && predicted.isApplication,
  );

  const result: FieldAccuracy = {
    denominator: truePositives.length,
    company: 0,
    role: 0,
    stage: 0,
  };

  for (const { fixture, predicted } of truePositives) {
    if (sameText(fixture.expected.company, predicted.company)) result.company += 1;
    if (sameText(fixture.expected.role, predicted.role)) result.role += 1;
    if ((fixture.expected.stage as Stage | null) === predicted.stage) result.stage += 1;
  }

  return result;
}

// ── Failure listings ────────────────────────────────────────────────────────

export interface Failure {
  id: string;
  confidence: number;
  detail: string;
}

/** Missed applications, named. SM-2 requires these tracked explicitly, and a
 *  list of fixture ids is what actually drives prompt iteration — a percentage
 *  tells you nothing about what to fix. */
export function missedApplications(scored: Scored[]): Failure[] {
  return scored
    .filter(({ fixture, predicted }) => fixture.expected.isApplication && !predicted.isApplication)
    .map(({ fixture, predicted }) => ({
      id: fixture.email.id,
      confidence: predicted.confidence,
      detail: "predicted not-application",
    }));
}

export function falseAlarms(scored: Scored[]): Failure[] {
  return scored
    .filter(({ fixture, predicted }) => !fixture.expected.isApplication && predicted.isApplication)
    .map(({ fixture, predicted }) => ({
      id: fixture.email.id,
      confidence: predicted.confidence,
      detail: `predicted ${predicted.company ?? "an application"}`,
    }));
}

export function deadlineFailures(scored: Scored[]): Failure[] {
  const failures: Failure[] = [];

  for (const { fixture, predicted } of scored) {
    const label = fixture.expected;
    const predictedAt = predicted.deadlineAt ? new Date(predicted.deadlineAt) : null;

    if (label.hasExplicitDeadlineLanguage) {
      if (predictedAt === null) {
        failures.push({
          id: fixture.email.id,
          confidence: predicted.confidence,
          detail: "deadline stated in the email, none extracted",
        });
      } else {
        const expectedAt = new Date(label.deadlineAt!);
        if (predictedAt.toISOString().slice(0, 10) !== expectedAt.toISOString().slice(0, 10)) {
          failures.push({
            id: fixture.email.id,
            confidence: predicted.confidence,
            detail: `wrong date — expected ${expectedAt.toISOString().slice(0, 10)}, got ${predictedAt.toISOString().slice(0, 10)}`,
          });
        }
      }
    } else if (predictedAt !== null) {
      failures.push({
        id: fixture.email.id,
        confidence: predicted.confidence,
        detail: `invented a deadline (${predictedAt.toISOString().slice(0, 10)}) — none stated`,
      });
    }
  }

  return failures;
}

// ── Thresholds ──────────────────────────────────────────────────────────────

export const THRESHOLDS = Object.freeze({
  /** SM-1 */
  ACCURACY: 0.95,
  /** SM-3 */
  DEADLINE_DETECTION: 0.8,
});

export interface Report {
  matrix: ConfusionMatrix;
  /** Every printed proportion with its interval (T2.9). The scalar fields
   *  below are what the gate compares against its thresholds. */
  figures: Figures;
  accuracy: number;
  precision: number;
  recall: number;
  deadlines: DeadlineScore;
  deadlineRate: number;
  fields: FieldAccuracy;
  missed: Failure[];
  falseAlarms: Failure[];
  deadlineFailures: Failure[];
  passedAccuracy: boolean;
  passedDeadlines: boolean;
  passed: boolean;
}

export function buildReport(scored: Scored[]): Report {
  const matrix = confusionMatrix(scored);
  const acc = accuracy(matrix);
  const deadlines = deadlineScore(scored);
  const deadlineRate = ratio(deadlines.correctDate, deadlines.denominator);

  const passedAccuracy = acc >= THRESHOLDS.ACCURACY;

  // A corpus with no deadline-bearing fixtures does not pass SM-3 vacuously.
  // 0/0 is not 100%: there is nothing to measure, so the threshold cannot be
  // evidenced, and silently passing would let the deadline fixtures be deleted
  // while the gate still reported success.
  const passedDeadlines =
    deadlines.denominator > 0 && deadlineRate >= THRESHOLDS.DEADLINE_DETECTION;

  const fields = fieldAccuracy(scored);
  const applications = matrix.truePositives + matrix.falseNegatives;
  const predictedApplications = matrix.truePositives + matrix.falsePositives;

  return {
    matrix,
    figures: {
      accuracy: proportion(matrix.truePositives + matrix.trueNegatives, matrix.total),
      precision: proportion(matrix.truePositives, predictedApplications),
      recall: proportion(matrix.truePositives, applications),
      falseNegativeRate: proportion(matrix.falseNegatives, applications),
      deadlineDetection: proportion(deadlines.correctDate, deadlines.denominator),
      deadlineExactTime: proportion(deadlines.correctTime, deadlines.denominator),
      company: proportion(fields.company, fields.denominator),
      role: proportion(fields.role, fields.denominator),
      stage: proportion(fields.stage, fields.denominator),
    },
    accuracy: acc,
    precision: precision(matrix),
    recall: recall(matrix),
    deadlines,
    deadlineRate,
    fields,
    missed: missedApplications(scored),
    falseAlarms: falseAlarms(scored),
    deadlineFailures: deadlineFailures(scored),
    passedAccuracy,
    passedDeadlines,
    passed: passedAccuracy && passedDeadlines,
  };
}
