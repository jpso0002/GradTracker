/**
 * The Gmail port.
 *
 * Nothing above this line knows Gmail exists. The live adapter wraps the API;
 * the fake reads the fixture corpus. Both satisfy this interface, which is
 * what lets the entire pipeline be tested offline with no credentials.
 *
 * @see implementation.md §5.1
 */

/**
 * One email, in memory only.
 *
 * `subject`, `body` and `fromAddress` exist on this object and are **never
 * persisted** — the pipeline reads them inside `classifyOne()` and drops them.
 * Only the domain part of `fromAddress` is ever written, and only to give the
 * timeline its "detected from a Greenhouse email" provenance. This type is the
 * retention boundary made explicit (SM-6).
 */
export interface RawEmail {
  gmailMessageId: string;
  gmailThreadId: string;
  receivedAt: Date;
  /** In-memory only. Persist `senderDomain(fromAddress)`, never this. */
  fromAddress: string;
  /** In-memory only. Never persisted, never logged. */
  subject: string;
  /** In-memory only. Never persisted, never logged. */
  body: string;
}

export interface GmailPage {
  messageIds: string[];
  /** Absent on the final page. */
  nextPageToken?: string;
  /**
   * The cursor to persist — but only once the batch has committed. Advancing
   * it early means a crash loses those emails permanently, and Gmail will
   * never return them again.
   */
  historyId: string;
}

export interface GmailClient {
  /**
   * Full scan when `historyId` is null; incremental from that cursor otherwise.
   *
   * @throws {HistoryIdExpiredError} when Gmail has expired the cursor. The
   * caller must fall back to a bounded full rescan rather than give up.
   */
  listSince(historyId: string | null, pageToken?: string): Promise<GmailPage>;

  fetchMessage(id: string): Promise<RawEmail>;
}

/**
 * Gmail expires `historyId` values after a period. This is a normal condition,
 * not a failure — it is thrown as a distinct type so the sync orchestrator can
 * catch it specifically and fall back to a full rescan, rather than pattern
 * matching on a message string.
 */
export class HistoryIdExpiredError extends Error {
  readonly code = "HISTORY_ID_EXPIRED" as const;

  constructor(historyId: string) {
    super(`Gmail history id "${historyId}" has expired; a full rescan is required.`);
    this.name = "HistoryIdExpiredError";
  }
}

/** Gmail is rate-limiting or over quota. Retryable with backoff. */
export class GmailRateLimitError extends Error {
  readonly code = "GMAIL_RATE_LIMIT" as const;

  constructor(
    message: string,
    /** Seconds to wait, when Gmail told us. */
    readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "GmailRateLimitError";
  }
}

/** The refresh token has been revoked — the user disconnected the app from
 *  their Google account. Not retryable; prompt a reconnect. */
export class GmailAuthRevokedError extends Error {
  readonly code = "GMAIL_AUTH_REVOKED" as const;

  constructor(message = "Gmail access was revoked.") {
    super(message);
    this.name = "GmailAuthRevokedError";
  }
}

/**
 * Extracts the domain from an address. This is the ONLY part of a sender that
 * may be persisted — `"no-reply@greenhouse.io"` becomes `"greenhouse.io"`.
 */
export function senderDomain(fromAddress: string): string | null {
  // Handles both "Name <a@b.com>" and a bare "a@b.com".
  const match = /<([^>]+)>/.exec(fromAddress);
  const address = (match?.[1] ?? fromAddress).trim();
  const at = address.lastIndexOf("@");
  if (at === -1 || at === address.length - 1) return null;
  return address.slice(at + 1).toLowerCase();
}
