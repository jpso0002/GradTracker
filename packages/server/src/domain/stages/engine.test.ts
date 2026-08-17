import { describe, it, expect } from "vitest";
import { StageEnum, type Stage } from "@gradtracker/shared";
import { decideStage, isFollowUpRequired, deriveNextAction } from "./engine.js";

const decide = (current: Stage, detected: Stage | null, humanLocked = false) =>
  decideStage({ current, detected, humanLocked });

describe("forward-only progression", () => {
  it("advances applied → assessment → interview → offer", () => {
    expect(decide("applied", "assessment")).toEqual({ applies: true, stage: "assessment", reason: "advance" });
    expect(decide("assessment", "interview")).toEqual({ applies: true, stage: "interview", reason: "advance" });
    expect(decide("interview", "offer")).toEqual({ applies: true, stage: "offer", reason: "always-applies" });
  });

  it("refuses to regress", () => {
    // Gmail does not guarantee order, and a re-sync replays history. A
    // confirmation arriving after an interview invite must not undo it.
    expect(decide("interview", "applied")).toEqual({ applies: false, reason: "would-regress" });
    expect(decide("assessment", "applied")).toEqual({ applies: false, reason: "would-regress" });
  });

  it("treats a repeat of the current stage as a no-op", () => {
    expect(decide("assessment", "assessment").applies).toBe(false);
  });

  it("skips stages when the process does", () => {
    // Not every employer runs an assessment.
    expect(decide("applied", "interview")).toEqual({ applies: true, stage: "interview", reason: "advance" });
  });
});

describe("terminal stages", () => {
  it("accepts a rejection from any stage", () => {
    for (const from of ["applied", "assessment", "interview", "offer"] as const) {
      expect(decide(from, "rejected").applies, `from ${from}`).toBe(true);
    }
  });

  it("accepts an offer from any stage", () => {
    for (const from of ["applied", "assessment", "interview"] as const) {
      expect(decide(from, "offer").applies, `from ${from}`).toBe(true);
    }
  });

  it("lets an offer follow a rejection", () => {
    // A real sequence: a role reopens, or a candidate is reconsidered. The
    // newest email is the truth.
    expect(decide("rejected", "offer")).toEqual({ applies: true, stage: "offer", reason: "always-applies" });
  });

  it("ignores ordinary progression emails after a rejection", () => {
    expect(decide("rejected", "assessment")).toEqual({ applies: false, reason: "already-terminal" });
  });

  it("never lets anything overwrite a withdrawal", () => {
    // The student made that decision. A rejection arriving afterwards does not
    // get to overrule it.
    expect(decide("withdrawn", "rejected")).toEqual({ applies: false, reason: "already-terminal" });
    expect(decide("withdrawn", "offer")).toEqual({ applies: false, reason: "already-terminal" });
  });
});

describe("what the AI may not do", () => {
  it("never assigns withdrawn", () => {
    for (const from of StageEnum.options) {
      const decision = decide(from, "withdrawn");
      expect(decision.applies, `from ${from}`).toBe(false);
    }
    expect(decide("applied", "withdrawn")).toEqual({ applies: false, reason: "user-only" });
  });

  it("never overrides a human-locked stage (SM-7)", () => {
    expect(decide("applied", "offer", true)).toEqual({ applies: false, reason: "human-locked" });
    expect(decide("applied", "rejected", true)).toEqual({ applies: false, reason: "human-locked" });
  });

  it("does nothing when no stage was detected", () => {
    expect(decide("applied", null)).toEqual({ applies: false, reason: "no-stage-detected" });
  });
});

describe("arrival order does not change the outcome", () => {
  it("reaches the same stage whichever order the emails arrive in", () => {
    const run = (sequence: Stage[]): Stage => {
      let current: Stage = "applied";
      for (const detected of sequence) {
        const decision = decideStage({ current, detected, humanLocked: false });
        if (decision.applies) current = decision.stage;
      }
      return current;
    };

    expect(run(["applied", "assessment", "interview"])).toBe("interview");
    expect(run(["interview", "assessment", "applied"])).toBe("interview");
    expect(run(["assessment", "applied", "interview"])).toBe("interview");
  });
});

describe("staleness", () => {
  const now = new Date("2026-08-16T00:00:00Z");
  const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000);

  it("uses the per-stage threshold", () => {
    expect(isFollowUpRequired("applied", daysAgo(13), now)).toBe(false);
    expect(isFollowUpRequired("applied", daysAgo(15), now)).toBe(true);
    // Assessment is 5 days — an unstarted assessment goes stale much faster
    // than an application awaiting a reply.
    expect(isFollowUpRequired("assessment", daysAgo(6), now)).toBe(true);
    expect(isFollowUpRequired("assessment", daysAgo(4), now)).toBe(false);
  });

  it("never flags a terminal stage", () => {
    expect(isFollowUpRequired("rejected", daysAgo(365), now)).toBe(false);
    expect(isFollowUpRequired("withdrawn", daysAgo(365), now)).toBe(false);
  });
});

describe("next action", () => {
  it("prefers what the email actually said", () => {
    expect(
      deriveNextAction({
        stage: "assessment",
        extracted: "Complete the numerical reasoning test",
        followUpRequired: false,
        daysSinceLastEvent: 1,
      }),
    ).toBe("Complete the numerical reasoning test");
  });

  it("falls back to a stage default", () => {
    expect(
      deriveNextAction({ stage: "interview", extracted: null, followUpRequired: false, daysSinceLastEvent: 1 }),
    ).toBe("Confirm interview time");
  });

  it("lets staleness override a specific action", () => {
    // If nothing has happened for three weeks, chasing it is the next action
    // regardless of what the last email asked for.
    expect(
      deriveNextAction({
        stage: "applied",
        extracted: "Wait for response",
        followUpRequired: true,
        daysSinceLastEvent: 21,
      }),
    ).toBe("Follow up — no reply in 21 days");
  });

  it("gives terminal jobs nothing to do", () => {
    expect(
      deriveNextAction({ stage: "rejected", extracted: "anything", followUpRequired: false, daysSinceLastEvent: 1 }),
    ).toBeNull();
  });

  it("ignores an empty extracted action", () => {
    expect(
      deriveNextAction({ stage: "offer", extracted: "   ", followUpRequired: false, daysSinceLastEvent: 1 }),
    ).toBe("Respond to offer");
  });
});
