import { describe, it, expect } from "vitest";
import type { Fixture } from "@gradtracker/shared";
import type { ClassificationResult } from "../ports/index.js";
import {
  confusionMatrix,
  accuracy,
  precision,
  recall,
  wilsonInterval,
  deadlineScore,
  fieldAccuracy,
  missedApplications,
  buildReport,
  THRESHOLDS,
  type Scored,
} from "./metrics.js";

/**
 * The arithmetic behind SM-1, SM-2 and SM-3.
 *
 * Worked by hand against known values, because a scoring bug does not announce
 * itself: it produces a plausible number that everyone believes. Precision and
 * recall in particular are trivially easy to swap, and swapping them would hide
 * exactly the failure SM-2 exists to surface.
 */

let counter = 0;
function fixture(opts: {
  isApplication: boolean;
  company?: string | null;
  stage?: "applied" | "assessment" | "interview" | "offer" | "rejected" | "withdrawn" | null;
  deadlineAt?: string | null;
  hasDeadlineLanguage?: boolean;
}): Fixture {
  counter += 1;
  const id = `${String(counter).padStart(3, "0")}-synthetic`;
  return {
    email: {
      id,
      gmailMessageId: `m-${counter}`,
      gmailThreadId: `t-${counter}`,
      receivedAt: "2026-05-01T00:00:00+00:00",
      fromAddress: "a@b.com",
      subject: "s",
      body: "b",
    },
    expected: {
      isApplication: opts.isApplication,
      company: opts.company ?? null,
      role: null,
      stage: opts.stage ?? null,
      deadlineAt: opts.deadlineAt ?? null,
      hasExplicitDeadlineLanguage: opts.hasDeadlineLanguage ?? false,
    },
  };
}

function predict(opts: {
  isApplication: boolean;
  company?: string | null;
  stage?: "applied" | "assessment" | "interview" | "offer" | "rejected" | "withdrawn" | null;
  deadlineAt?: string | null;
  confidence?: number;
}): ClassificationResult {
  return {
    isApplication: opts.isApplication,
    company: opts.company ?? null,
    role: null,
    stage: opts.stage ?? null,
    deadlineAt: opts.deadlineAt ?? null,
    nextAction: null,
    confidence: opts.confidence ?? 0.9,
    model: "fake",
  };
}

describe("confusion matrix", () => {
  const scored: Scored[] = [
    { fixture: fixture({ isApplication: true }), predicted: predict({ isApplication: true }) }, // TP
    { fixture: fixture({ isApplication: true }), predicted: predict({ isApplication: true }) }, // TP
    { fixture: fixture({ isApplication: true }), predicted: predict({ isApplication: false }) }, // FN
    { fixture: fixture({ isApplication: false }), predicted: predict({ isApplication: true }) }, // FP
    { fixture: fixture({ isApplication: false }), predicted: predict({ isApplication: false }) }, // TN
  ];
  const m = confusionMatrix(scored);

  it("counts each quadrant", () => {
    expect(m).toEqual({
      truePositives: 2,
      falsePositives: 1,
      falseNegatives: 1,
      trueNegatives: 1,
      total: 5,
    });
  });

  it("computes accuracy as (TP+TN)/total", () => {
    expect(accuracy(m)).toBeCloseTo(3 / 5);
  });

  it("computes precision as TP/(TP+FP) — of what we called an application", () => {
    expect(precision(m)).toBeCloseTo(2 / 3);
  });

  it("computes recall as TP/(TP+FN) — of the applications that exist", () => {
    expect(recall(m)).toBeCloseTo(2 / 3);
  });

  it("does not confuse precision with recall", () => {
    // Asymmetric case: 1 FP, 2 FN. If these are swapped the numbers differ,
    // which they would not in the symmetric case above.
    const asymmetric = confusionMatrix([
      { fixture: fixture({ isApplication: true }), predicted: predict({ isApplication: true }) },
      { fixture: fixture({ isApplication: true }), predicted: predict({ isApplication: false }) },
      { fixture: fixture({ isApplication: true }), predicted: predict({ isApplication: false }) },
      { fixture: fixture({ isApplication: false }), predicted: predict({ isApplication: true }) },
    ]);
    expect(precision(asymmetric)).toBeCloseTo(1 / 2);
    expect(recall(asymmetric)).toBeCloseTo(1 / 3);
  });

  it("returns 0 rather than NaN on an empty class", () => {
    const empty = confusionMatrix([]);
    expect(accuracy(empty)).toBe(0);
    expect(precision(empty)).toBe(0);
    expect(recall(empty)).toBe(0);
  });
});

describe("Wilson interval (T2.7)", () => {
  it("matches the hand-computed value for 77/80", () => {
    // centre = (77 + 1.9208)/83.8416 = 0.94129
    // spread = (1.96/83.8416)·√(77·3/80 + 0.9604) = 0.04586
    const { lower, upper } = wilsonInterval(77, 80);
    expect(lower).toBeCloseTo(0.8954, 3);
    expect(upper).toBeCloseTo(0.9872, 3);
  });

  it("spans roughly ±5 points at n=80 — the reason it is printed at all", () => {
    const { lower, upper } = wilsonInterval(77, 80);
    // At this corpus size, 96.3% and 91% are not distinguishable. Quoting the
    // point estimate alone would overstate what has been measured.
    expect((upper - lower) / 2).toBeGreaterThan(0.04);
  });

  it("tightens as n grows — the argument for the real 300-email corpus", () => {
    const small = wilsonInterval(77, 80);
    const large = wilsonInterval(289, 300);
    expect(large.upper - large.lower).toBeLessThan(small.upper - small.lower);
  });

  it("never exceeds 1, unlike the normal approximation", () => {
    // The textbook p ± z·√(p(1−p)/n) gives an upper bound above 100% here,
    // which is not a possible accuracy.
    expect(wilsonInterval(80, 80).upper).toBeLessThanOrEqual(1);
    expect(wilsonInterval(80, 80).lower).toBeGreaterThan(0.9);
  });

  it("never falls below 0", () => {
    expect(wilsonInterval(0, 80).lower).toBeGreaterThanOrEqual(0);
  });

  it("returns a zero interval for an empty sample", () => {
    expect(wilsonInterval(0, 0)).toEqual({ lower: 0, upper: 0 });
  });
});

describe("deadline scoring (SM-3)", () => {
  it("counts only deadline-bearing fixtures in the denominator", () => {
    const score = deadlineScore([
      {
        fixture: fixture({ isApplication: true, deadlineAt: "2026-05-23T13:59:00+00:00", hasDeadlineLanguage: true }),
        predicted: predict({ isApplication: true, deadlineAt: "2026-05-23T13:59:00.000Z" }),
      },
      // No deadline language — cannot be scored on extraction, so excluded.
      {
        fixture: fixture({ isApplication: true }),
        predicted: predict({ isApplication: true }),
      },
    ]);
    expect(score.denominator).toBe(1);
    expect(score.correctDate).toBe(1);
    expect(score.correctTime).toBe(1);
  });

  it("accepts the right day with the wrong time, and reports exact separately", () => {
    // A 9am deadline predicted as 11:59pm is a missed assessment even though
    // the date matches, so both figures are reported.
    const score = deadlineScore([
      {
        fixture: fixture({ isApplication: true, deadlineAt: "2026-06-07T23:00:00+00:00", hasDeadlineLanguage: true }),
        predicted: predict({ isApplication: true, deadlineAt: "2026-06-07T13:59:00.000Z" }),
      },
    ]);
    expect(score.correctDate).toBe(1);
    expect(score.correctTime).toBe(0);
  });

  it("counts a missed deadline", () => {
    const score = deadlineScore([
      {
        fixture: fixture({ isApplication: true, deadlineAt: "2026-05-23T13:59:00+00:00", hasDeadlineLanguage: true }),
        predicted: predict({ isApplication: true, deadlineAt: null }),
      },
    ]);
    expect(score.missed).toBe(1);
    expect(score.correctDate).toBe(0);
  });

  it("counts an invented deadline against the negative controls", () => {
    // 034 (an interview time), 015 (a close date for other applicants) and 042
    // (when the employer will act) all look like deadlines and are not.
    const score = deadlineScore([
      {
        fixture: fixture({ isApplication: true }),
        predicted: predict({ isApplication: true, deadlineAt: "2026-06-18T04:00:00.000Z" }),
      },
    ]);
    expect(score.hallucinated).toBe(1);
    expect(score.denominator).toBe(0);
  });
});

describe("field accuracy", () => {
  it("scores only true positives", () => {
    const fields = fieldAccuracy([
      {
        fixture: fixture({ isApplication: true, company: "Deloitte", stage: "assessment" }),
        predicted: predict({ isApplication: true, company: "Deloitte", stage: "assessment" }),
      },
      // A false negative has no extracted fields to score.
      {
        fixture: fixture({ isApplication: true, company: "Canva" }),
        predicted: predict({ isApplication: false }),
      },
    ]);
    expect(fields.denominator).toBe(1);
    expect(fields.company).toBe(1);
    expect(fields.stage).toBe(1);
  });

  it("ignores case and surrounding whitespace", () => {
    const fields = fieldAccuracy([
      {
        fixture: fixture({ isApplication: true, company: "Deloitte" }),
        predicted: predict({ isApplication: true, company: "  deloitte " }),
      },
    ]);
    expect(fields.company).toBe(1);
  });

  it("does not forgive a different answer", () => {
    // "Deloitte" and "Deloitte Australia" are different extractions. A fuzzy
    // scorer would hide a real problem.
    const fields = fieldAccuracy([
      {
        fixture: fixture({ isApplication: true, company: "Deloitte" }),
        predicted: predict({ isApplication: true, company: "Deloitte Australia" }),
      },
    ]);
    expect(fields.company).toBe(0);
  });
});

describe("failure listings (SM-2)", () => {
  it("names every missed application by fixture id", () => {
    // A percentage says nothing about what to fix. Ids do.
    const missed = missedApplications([
      {
        fixture: fixture({ isApplication: true }),
        predicted: predict({ isApplication: false, confidence: 0.38 }),
      },
    ]);
    expect(missed).toHaveLength(1);
    expect(missed[0]!.id).toMatch(/-synthetic$/);
    expect(missed[0]!.confidence).toBe(0.38);
  });
});

describe("the gate", () => {
  const perfect = (n: number, isApplication: boolean): Scored[] =>
    Array.from({ length: n }, () => ({
      fixture: fixture({ isApplication }),
      predicted: predict({ isApplication }),
    }));

  it("passes when both thresholds are met", () => {
    const withDeadlines: Scored[] = Array.from({ length: 10 }, () => ({
      fixture: fixture({
        isApplication: true,
        deadlineAt: "2026-05-23T13:59:00+00:00",
        hasDeadlineLanguage: true,
      }),
      predicted: predict({ isApplication: true, deadlineAt: "2026-05-23T13:59:00.000Z" }),
    }));
    const report = buildReport([...perfect(45, true), ...perfect(25, false), ...withDeadlines]);
    expect(report.passedAccuracy).toBe(true);
    expect(report.passedDeadlines).toBe(true);
    expect(report.passed).toBe(true);
  });

  it("does NOT pass a corpus with no deadline-bearing fixtures", () => {
    // Deliberate. 0/0 is not 100% — a corpus with nothing to measure cannot
    // evidence SM-3, and silently passing would let someone delete the
    // deadline fixtures and still claim the threshold was met. The real corpus
    // has 26, so this is a guard against the corpus degrading, not a case that
    // arises in normal use.
    const report = buildReport([...perfect(55, true), ...perfect(25, false)]);
    expect(report.accuracy).toBe(1);
    expect(report.passedAccuracy).toBe(true);
    expect(report.deadlines.denominator).toBe(0);
    expect(report.passedDeadlines).toBe(false);
    expect(report.passed).toBe(false);
  });

  it("fails when accuracy drops below 95%", () => {
    const scored: Scored[] = [
      ...perfect(70, true),
      // 10 misclassified out of 80 → 87.5%
      ...Array.from({ length: 10 }, () => ({
        fixture: fixture({ isApplication: false }),
        predicted: predict({ isApplication: true }),
      })),
    ];
    const report = buildReport(scored);
    expect(report.accuracy).toBeLessThan(THRESHOLDS.ACCURACY);
    expect(report.passedAccuracy).toBe(false);
    expect(report.passed).toBe(false);
  });

  it("fails when deadline detection drops below 80%, even at perfect accuracy", () => {
    // The two thresholds are independent — a classifier can identify every
    // application correctly and still miss the deadlines inside them, which is
    // the failure that costs a student an assessment.
    const scored: Scored[] = Array.from({ length: 10 }, (_, i) => ({
      fixture: fixture({
        isApplication: true,
        deadlineAt: "2026-05-23T13:59:00+00:00",
        hasDeadlineLanguage: true,
      }),
      predicted: predict({
        isApplication: true,
        deadlineAt: i < 7 ? "2026-05-23T13:59:00.000Z" : null,
      }),
    }));

    const report = buildReport(scored);
    expect(report.accuracy).toBe(1);
    expect(report.passedAccuracy).toBe(true);
    expect(report.deadlineRate).toBeCloseTo(0.7);
    expect(report.passedDeadlines).toBe(false);
    expect(report.passed).toBe(false);
  });
});
