import type { Classification, ClassifierModel } from "@gradtracker/shared";
import type { RawEmail } from "./gmail-client.js";

/**
 * The classifier port.
 *
 * Nothing above this line knows Claude exists. The live adapter calls the
 * Anthropic API; the fake replays recorded fixture responses. Swapping them is
 * how the accuracy harness runs offline and how `npm test` costs nothing.
 *
 * @see implementation.md §5.2
 */

export interface ClassificationResult extends Classification {
  /** Which model produced this. Recorded per email so the harness can report
   *  per-model accuracy and evidence the cost/quality trade-off rather than
   *  asserting it. */
  model: ClassifierModel;
  /** Populated by the live adapter for cost reporting; zero for the fake. */
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

export interface EmailClassifier {
  /**
   * Classify one email.
   *
   * The implementation receives the only reference to `email.body` that the
   * pipeline will hold, and must not retain, log or transmit it beyond the
   * classification call itself.
   */
  classify(email: RawEmail): Promise<ClassificationResult>;
}

/** The model is rate-limited or overloaded. Retryable with backoff; on final
 *  failure the email is left unprocessed so the next sync retries it, rather
 *  than being marked read and silently lost. */
export class ClassifierUnavailableError extends Error {
  readonly code = "CLASSIFIER_UNAVAILABLE" as const;

  constructor(
    message: string,
    readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "ClassifierUnavailableError";
  }
}

/**
 * The model returned something that did not satisfy `ClassificationSchema`.
 *
 * Carries no email content — only the fixture or message id — so that logging
 * this error can never leak a subject or body (defect C1).
 */
export class ClassificationInvalidError extends Error {
  readonly code = "CLASSIFICATION_INVALID" as const;

  constructor(
    readonly messageId: string,
    readonly issues: string[],
  ) {
    super(`Classification for message ${messageId} failed validation: ${issues.join("; ")}`);
    this.name = "ClassificationInvalidError";
  }
}
