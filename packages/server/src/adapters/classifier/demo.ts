import type { Fixture } from "@gradtracker/shared";
import type { EmailClassifier, ClassificationResult, RawEmail } from "../../ports/index.js";
import { loadCorpus } from "../../corpus/loader.js";
import { shiftDays } from "../../time/zoned-time.js";
import { ScriptedEmailClassifier } from "./scripted.js";

/**
 * The presentation's classifier (D36, D37): the answer key for the sample
 * emails loaded into the demo inbox, and the scripts for the emails a teammate
 * sends live. Not a model — no API credit was bought — and the presenters say
 * so. Every answer still goes through the real pipeline.
 *
 * A sample email is read with its date brought forward (D37), so its deadline
 * moves by the same number of calendar days: an assessment due four days after
 * the email arrived is still due four days after it arrived.
 */

/**
 * Samples a model would plausibly be unsure about, so the review queue holds
 * low-confidence items as well as the rule-based ones. Below the default
 * threshold of 0.75; everything else is a confident 0.95.
 */
export const SAMPLE_CONFIDENCE: Readonly<Record<string, number>> = {
  // An informal human email: "would you be free for a conversation" reads as
  // an interview only if you know Xero's process.
  "039-xero-chat": 0.58,
  // SEEK is a job board as well as an employer.
  "040-seek-interview": 0.66,
};

const DAY_MS = 86_400_000;
const CONFIDENT = 0.95;

export class DemoEmailClassifier implements EmailClassifier {
  private readonly samples = new Map<string, Fixture>();

  constructor(
    fixtures: Fixture[] = loadCorpus(),
    private readonly scripted: EmailClassifier = new ScriptedEmailClassifier(),
  ) {
    for (const fixture of fixtures) this.samples.set(fixture.email.gmailMessageId, fixture);
  }

  classify(email: RawEmail): Promise<ClassificationResult> {
    // The inbox reader names a sample by its Message-ID (D38); the answer key
    // by the part before the @.
    const sample = this.samples.get(email.gmailMessageId.replace(/@gradtracker\.demo$/, ""));
    if (!sample) return this.scripted.classify(email);

    const { expected } = sample;
    const days = Math.round((email.receivedAt.getTime() - new Date(sample.email.receivedAt).getTime()) / DAY_MS);

    return Promise.resolve({
      isApplication: expected.isApplication,
      company: expected.company,
      role: expected.role,
      stage: expected.stage,
      deadlineAt: expected.deadlineAt ? shiftDays(new Date(expected.deadlineAt), days).toISOString() : null,
      // The labels commit to no wording; the dashboard derives one from stage.
      nextAction: null,
      confidence: SAMPLE_CONFIDENCE[sample.email.id] ?? CONFIDENT,
      // Closing dates move with the email, as deadlines do.
      ...(expected.openings
        ? {
            openings: expected.openings.map((o) => ({
              ...o,
              closesAt: o.closesAt ? shiftDays(new Date(o.closesAt), days).toISOString() : null,
            })),
          }
        : {}),
      model: "fake",
      usage: { inputTokens: 0, outputTokens: 0 },
    });
  }
}
