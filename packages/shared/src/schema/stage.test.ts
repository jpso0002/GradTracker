import { describe, it, expect } from "vitest";
import {
  StageEnum,
  STAGE_RANK,
  TERMINAL_STAGES,
  ALWAYS_APPLIES,
  USER_ONLY_STAGES,
  STALENESS_THRESHOLD_DAYS,
} from "./stage.js";
import { ClassificationSchema, CONFIDENCE } from "./classification.js";
import { UpdateJobBodySchema } from "./api.js";

describe("stage taxonomy (decision D10)", () => {
  it("has exactly six stages", () => {
    expect(StageEnum.options).toHaveLength(6);
  });

  it("matches StageBadge in the design system", () => {
    expect(StageEnum.options).toEqual([
      "applied",
      "assessment",
      "interview",
      "offer",
      "rejected",
      "withdrawn",
    ]);
  });

  it("does not contain the brief's computed values as stages", () => {
    // "Deadline Approaching" and "Follow-up Required" are properties of today's
    // date, not of an email. Storing them means a dashboard left open overnight
    // is wrong by morning.
    const options: string[] = [...StageEnum.options];
    expect(options).not.toContain("deadline_approaching");
    expect(options).not.toContain("follow_up_required");
  });

  it("ranks progression stages in order and terminal stages at zero", () => {
    expect(STAGE_RANK.applied).toBeLessThan(STAGE_RANK.assessment);
    expect(STAGE_RANK.assessment).toBeLessThan(STAGE_RANK.interview);
    expect(STAGE_RANK.interview).toBeLessThan(STAGE_RANK.offer);
    expect(STAGE_RANK.rejected).toBe(0);
    expect(STAGE_RANK.withdrawn).toBe(0);
  });

  it("treats rejected and withdrawn as terminal", () => {
    expect([...TERMINAL_STAGES].sort()).toEqual(["rejected", "withdrawn"]);
  });

  it("lets rejected and offer arrive from any stage", () => {
    expect(ALWAYS_APPLIES.has("rejected")).toBe(true);
    expect(ALWAYS_APPLIES.has("offer")).toBe(true);
    expect(ALWAYS_APPLIES.has("interview")).toBe(false);
  });

  it("never lets the AI assign withdrawn", () => {
    expect(USER_ONLY_STAGES.has("withdrawn")).toBe(true);
    expect(USER_ONLY_STAGES.size).toBe(1);
  });

  it("defines a staleness threshold for every non-terminal stage only", () => {
    for (const stage of StageEnum.options) {
      const threshold = STALENESS_THRESHOLD_DAYS[stage];
      if (TERMINAL_STAGES.has(stage)) {
        expect(threshold).toBeNull();
      } else {
        expect(threshold).toBeGreaterThan(0);
      }
    }
  });
});

describe("ClassificationSchema", () => {
  const valid = {
    isApplication: true,
    company: "Deloitte",
    role: "Audit Graduate Program",
    stage: "assessment" as const,
    deadlineAt: "2026-05-23T13:59:00.000Z",
    nextAction: "Complete online assessment",
    confidence: 0.91,
  };

  it("accepts a well-formed classification", () => {
    expect(ClassificationSchema.parse(valid)).toMatchObject({ company: "Deloitte" });
  });

  it("accepts a non-application with null fields", () => {
    const result = ClassificationSchema.safeParse({
      isApplication: false,
      company: null,
      role: null,
      stage: null,
      deadlineAt: null,
      nextAction: null,
      confidence: 0.98,
    });
    expect(result.success).toBe(true);
  });

  it("rejects confidence outside 0–1", () => {
    expect(ClassificationSchema.safeParse({ ...valid, confidence: 1.4 }).success).toBe(false);
    expect(ClassificationSchema.safeParse({ ...valid, confidence: -0.1 }).success).toBe(false);
  });

  it("rejects a stage outside the six", () => {
    expect(
      ClassificationSchema.safeParse({ ...valid, stage: "deadline_approaching" }).success,
    ).toBe(false);
  });

  it("treats reasoning as optional so production never has to send it (C1)", () => {
    expect(ClassificationSchema.safeParse(valid).success).toBe(true);
    expect("reasoning" in ClassificationSchema.parse(valid)).toBe(false);
  });

  it("escalates below the review threshold", () => {
    expect(CONFIDENCE.ESCALATE_BELOW).toBeLessThan(CONFIDENCE.DEFAULT_REVIEW_THRESHOLD);
  });
});

describe("UpdateJobBodySchema", () => {
  it("accepts a single-field correction", () => {
    expect(UpdateJobBodySchema.safeParse({ company: "Deloitte" }).success).toBe(true);
  });

  it("rejects an empty patch rather than silently doing nothing", () => {
    expect(UpdateJobBodySchema.safeParse({}).success).toBe(false);
  });

  it("rejects a blank company after trimming", () => {
    expect(UpdateJobBodySchema.safeParse({ company: "   " }).success).toBe(false);
  });

  it("allows clearing a deadline but not clearing a company", () => {
    expect(UpdateJobBodySchema.safeParse({ deadlineAt: null }).success).toBe(true);
    expect(UpdateJobBodySchema.safeParse({ company: null }).success).toBe(false);
  });
});
