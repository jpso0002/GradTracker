import { describe, it, expect } from "vitest";
import { loadCorpus } from "../corpus/loader.js";
import { FakeEmailClassifier } from "../adapters/classifier/fake.js";
import { runHarness, demoCorruption } from "./accuracy.js";

/**
 * End-to-end harness behaviour (T2.6).
 *
 * The done-when is that a **deliberately broken classifier makes it exit 1**.
 * A gate that only ever reports success is not a gate, so the failing path is
 * the one that actually needs proving.
 */

const fixtures = loadCorpus();

describe("harness self-test", () => {
  it("scores the corpus against itself perfectly", async () => {
    const { passed, output } = await runHarness({
      classifier: new FakeEmailClassifier({ fixtures }),
      fixtures,
      model: "fake",
      isSelfTest: true,
    });

    expect(passed).toBe(true);
    expect(output).toContain("100.0 %");
    expect(output).toContain("PASS");
  });

  it("labels a self-test as such, prominently", async () => {
    // Without this, someone screenshots a 100% score for the report. The fake
    // replays the corpus labels — it measures the harness, not a model.
    const { output } = await runHarness({
      classifier: new FakeEmailClassifier({ fixtures }),
      fixtures,
      model: "fake",
      isSelfTest: true,
    });

    expect(output).toContain("SELF-TEST — not a measurement of any model");
    expect(output).toContain("the corpus scored against itself");
  });

  it("reports the prompt version, so a figure can be attributed", async () => {
    const { output } = await runHarness({
      classifier: new FakeEmailClassifier({ fixtures }),
      fixtures,
      model: "fake",
      isSelfTest: true,
    });
    expect(output).toMatch(/prompt v\d+/);
  });

  it("prints the Wilson interval beside the point estimate (T2.7)", async () => {
    const { output } = await runHarness({
      classifier: new FakeEmailClassifier({ fixtures }),
      fixtures,
      model: "fake",
      isSelfTest: true,
    });
    expect(output).toMatch(/95% CI .+ – .+ {2}\(Wilson, n=80\)/);
  });
});

describe("the gate fails on a broken classifier", () => {
  it("fails when everything is inverted", async () => {
    const { passed, output } = await runHarness({
      classifier: new FakeEmailClassifier({
        fixtures,
        corrupt: (truth) => ({ ...truth, isApplication: !truth.isApplication }),
      }),
      fixtures,
      model: "fake (inverted)",
      isSelfTest: true,
    });

    expect(passed).toBe(false);
    expect(output).toContain("FAIL");
  });

  it("fails when every application is missed, and names each one", async () => {
    const { passed, output } = await runHarness({
      classifier: new FakeEmailClassifier({
        fixtures,
        corrupt: (truth) => ({
          ...truth,
          isApplication: false,
          company: null,
          role: null,
          stage: null,
          deadlineAt: null,
        }),
      }),
      fixtures,
      model: "fake (all negative)",
      isSelfTest: true,
    });

    expect(passed).toBe(false);
    // SM-2: false negatives are the costly failure and must be listed, not
    // summarised. A count tells you nothing about what to fix.
    expect(output).toContain("Missed applications (false negatives)");
    expect(output).toContain("001-deloitte-oa-invite");
  });

  it("fails on deadlines alone, while classification stays perfect", async () => {
    const { passed, output } = await runHarness({
      classifier: new FakeEmailClassifier({
        fixtures,
        corrupt: (truth) => ({ ...truth, deadlineAt: null }),
      }),
      fixtures,
      model: "fake (no deadlines)",
      isSelfTest: true,
    });

    expect(passed).toBe(false);
    expect(output).toContain("Accuracy");
    expect(output).toContain("100.0 %"); // classification is still perfect
    expect(output).toContain("0.0 %"); // deadline detection is not
  });
});

describe("demo corruption", () => {
  it("produces a realistic, non-trivial report", async () => {
    const { output, passed } = await runHarness({
      classifier: new FakeEmailClassifier({ fixtures, corrupt: demoCorruption }),
      fixtures,
      model: "fake (errors injected)",
      isSelfTest: true,
    });

    // Still passes — the injected errors are plausible rather than catastrophic,
    // which is what makes the demo useful for reading the report shape.
    expect(passed).toBe(true);
    expect(output).toContain("Missed applications");
    expect(output).toContain("False alarms");
    expect(output).toContain("Deadline failures");
  });

  it("models the failure the corpus was built to catch", async () => {
    const { output } = await runHarness({
      classifier: new FakeEmailClassifier({ fixtures, corrupt: demoCorruption }),
      fixtures,
      model: "fake",
      isSelfTest: true,
    });

    // A hard negative naming a company already in the pipeline, mistaken for
    // an application — exactly what fixtures 059 and 061 exist to test.
    expect(output).toContain("059-seek-recommendations");
    expect(output).toContain("061-monash-careers-newsletter");
  });

  it("distinguishes an invented deadline from a wrong one", async () => {
    const { output } = await runHarness({
      classifier: new FakeEmailClassifier({ fixtures, corrupt: demoCorruption }),
      fixtures,
      model: "fake",
      isSelfTest: true,
    });

    expect(output).toContain("invented a deadline");
    expect(output).toContain("wrong date");
  });
});
