import { CONFIDENCE } from "@gradtracker/shared";
import type { EmailClassifier, ClassificationResult, RawEmail } from "../../ports/index.js";

/**
 * Confidence-based escalation (T3.5).
 *
 * Decision D16: `claude-haiku-4-5` on every email, escalating to
 * `claude-sonnet-5` when the primary is unsure. Haiku handles short structured
 * extraction well and costs a fifth as much; the hard minority gets a stronger
 * model rather than paying for one on all 2,000 emails in an initial scan.
 *
 * Implemented as an `EmailClassifier` wrapping two others, so the pipeline
 * never learns that escalation exists. That also means the accuracy harness can
 * score the escalating pair exactly as it scores a single model.
 */

export interface EscalationStats {
  classified: number;
  escalated: number;
}

export class EscalatingClassifier implements EmailClassifier {
  private readonly stats: EscalationStats = { classified: 0, escalated: 0 };

  constructor(
    private readonly primary: EmailClassifier,
    private readonly escalation: EmailClassifier,
    /** Below this the primary's answer is not trusted. */
    private readonly threshold: number = CONFIDENCE.ESCALATE_BELOW,
  ) {}

  async classify(email: RawEmail): Promise<ClassificationResult> {
    this.stats.classified += 1;

    const first = await this.primary.classify(email);
    if (first.confidence >= this.threshold) return first;

    this.stats.escalated += 1;

    // The escalated answer replaces the primary outright rather than being
    // merged with it. Combining two disagreeing classifications would produce
    // a result neither model actually gave, which is untraceable at review.
    const second = await this.escalation.classify(email);

    return {
      ...second,
      usage: {
        inputTokens: (first.usage?.inputTokens ?? 0) + (second.usage?.inputTokens ?? 0),
        outputTokens: (first.usage?.outputTokens ?? 0) + (second.usage?.outputTokens ?? 0),
      },
    };
  }

  /** Escalation rate is the cost driver — worth surfacing after a scan. */
  getStats(): Readonly<EscalationStats> {
    return { ...this.stats };
  }
}
