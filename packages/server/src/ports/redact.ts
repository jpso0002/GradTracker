import type { RawEmail } from "./gmail-client.js";
import { senderDomain } from "./gmail-client.js";

/**
 * The safe reference to an email — defect C1's structural fix.
 *
 * SM-6 says no raw email content persists. A log file persists. So a log line
 * containing a subject is the same defect as a database column containing one,
 * and "we'll be careful what we log" is not a control.
 *
 * The control is this: **no code outside the classifier adapter is given
 * anything loggable except an `EmailRef`.** Whenever an email needs to appear
 * in a log, an error, a metric or a trace, it appears as one of these.
 */
export interface EmailRef {
  gmailMessageId: string;
  gmailThreadId: string;
  /** Domain only — "greenhouse.io", never "no-reply@greenhouse.io". */
  senderDomain: string | null;
  receivedAt: string;
}

/** Reduce an email to the parts that may safely leave the process. */
export function emailRef(email: RawEmail): EmailRef {
  return {
    gmailMessageId: email.gmailMessageId,
    gmailThreadId: email.gmailThreadId,
    senderDomain: senderDomain(email.fromAddress),
    receivedAt: email.receivedAt.toISOString(),
  };
}

/**
 * Field names that must never appear as keys in anything logged. Exported so
 * the retention test can assert against the same list the code uses, rather
 * than a second copy that can drift.
 */
export const UNLOGGABLE_FIELDS = ["subject", "body", "fromAddress", "reasoning"] as const;

/**
 * Strips unloggable fields from an arbitrary object before it reaches a log.
 *
 * A backstop, not the primary control — the primary control is that callers
 * hold an `EmailRef` and never had the content to begin with. This exists for
 * the paths where an object of unknown shape (a caught error, an SDK response)
 * is about to be serialised.
 */
export function scrubForLog(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(scrubForLog);

  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    out[key] = (UNLOGGABLE_FIELDS as readonly string[]).includes(key)
      ? "[redacted]"
      : scrubForLog(val);
  }
  return out;
}
