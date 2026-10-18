import type { RawEmail } from "./gmail-client.js";

/**
 * The demo inbox port (D36).
 *
 * The presentation reads one throwaway Gmail account over IMAP, so a teammate
 * can send an email mid-demo and Refresh can bring it in. This is narrower than
 * `GmailClient` on purpose: there is no history cursor to persist and no full
 * scan — only "what arrived after the demo started". The production path is
 * still `GmailClient` (T7.2).
 */
export interface MailboxReader {
  /**
   * Messages that arrived after `since`, oldest first.
   *
   * Each `RawEmail` carries a subject and body in memory only — the same
   * retention boundary as Gmail: the pipeline reads them in `classifyOne()` and
   * drops them.
   */
  readSince(since: Date): Promise<RawEmail[]>;

  /**
   * The sample emails loaded into the inbox for the demo's opening scan (D37),
   * with their original dates and the ids the answer key knows them by
   * (`fixture-001`). Never mail a person sent.
   */
  readSamples(): Promise<RawEmail[]>;
}
