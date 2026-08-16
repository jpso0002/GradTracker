/**
 * The two ports. Everything above this boundary depends on these interfaces
 * and nothing else — no vendor SDK may be imported outside `adapters/`, and
 * ESLint enforces that (rules.md → Architecture).
 */
export type { RawEmail, GmailPage, GmailClient } from "./gmail-client.js";
export {
  HistoryIdExpiredError,
  GmailRateLimitError,
  GmailAuthRevokedError,
  senderDomain,
} from "./gmail-client.js";

export type { EmailClassifier, ClassificationResult } from "./email-classifier.js";
export {
  ClassifierUnavailableError,
  ClassificationInvalidError,
} from "./email-classifier.js";

export type { EmailRef } from "./redact.js";
export { emailRef, scrubForLog, UNLOGGABLE_FIELDS } from "./redact.js";
