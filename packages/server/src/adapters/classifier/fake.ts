import type { Fixture, Classification } from "@gradtracker/shared";
import type { EmailClassifier, ClassificationResult, RawEmail } from "../../ports/index.js";
import { loadCorpus } from "../../corpus/loader.js";

/**
 * The classifier, replaying the corpus labels.
 *
 * Keyed by `gmailMessageId`, so the pipeline exercises exactly the same code
 * path it would with a live model — the only difference is where the answer
 * comes from. This is what makes `npm test` free and offline.
 *
 * The `confidenceFor` and `corrupt` hooks exist so the *harness itself* can be
 * tested: T2.6 requires that a deliberately broken classifier makes the
 * accuracy gate exit non-zero, which is impossible to demonstrate if the fake
 * can only ever be right.
 */

export interface FakeClassifierOptions {
  fixtures?: Fixture[];
  /** Confidence to report per fixture. Defaults to a confident 0.95. */
  confidenceFor?: (fixtureId: string) => number;
  /** Perturb the correct answer — used to prove the harness detects error. */
  corrupt?: (correct: Classification, fixtureId: string) => Classification;
  /** Simulate escalation: which model to report per fixture. */
  modelFor?: (fixtureId: string) => "claude-haiku-4-5" | "claude-sonnet-5" | "fake";
}

const DEFAULT_CONFIDENCE = 0.95;

export class FakeEmailClassifier implements EmailClassifier {
  private readonly byMessageId = new Map<string, Fixture>();
  private readonly options: FakeClassifierOptions;

  /** Message ids classified, in order — lets tests assert the pipeline did not
   *  skip or double-classify anything. */
  readonly classified: string[] = [];

  constructor(options: FakeClassifierOptions = {}) {
    this.options = options;
    for (const fixture of options.fixtures ?? loadCorpus()) {
      this.byMessageId.set(fixture.email.gmailMessageId, fixture);
    }
  }

  classify(email: RawEmail): Promise<ClassificationResult> {
    const fixture = this.byMessageId.get(email.gmailMessageId);
    if (!fixture) {
      return Promise.reject(
        new Error(
          `FakeEmailClassifier: no label for gmailMessageId "${email.gmailMessageId}". ` +
            `Every email reaching the classifier must have a corpus entry.`,
        ),
      );
    }

    const { id } = fixture.email;
    const { expected } = fixture;

    const truth: Classification = {
      isApplication: expected.isApplication,
      company: expected.company,
      role: expected.role,
      stage: expected.stage,
      deadlineAt: expected.deadlineAt,
      // The corpus labels ground truth, not phrasing. Next action is derived
      // downstream from stage and deadline, so the fake leaves it null rather
      // than inventing a string the labels never committed to.
      nextAction: null,
      confidence: this.options.confidenceFor?.(id) ?? DEFAULT_CONFIDENCE,
    };

    const answer = this.options.corrupt ? this.options.corrupt(truth, id) : truth;

    this.classified.push(email.gmailMessageId);

    return Promise.resolve({
      ...answer,
      model: this.options.modelFor?.(id) ?? "fake",
      usage: { inputTokens: 0, outputTokens: 0 },
    });
  }

  get size(): number {
    return this.byMessageId.size;
  }
}
