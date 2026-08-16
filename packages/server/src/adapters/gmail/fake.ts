import type { Fixture } from "@gradtracker/shared";
import {
  type GmailClient,
  type GmailPage,
  type RawEmail,
  HistoryIdExpiredError,
} from "../../ports/index.js";
import { loadCorpus } from "../../corpus/loader.js";

/**
 * Gmail, backed by the fixture corpus.
 *
 * This is not a stub that returns canned values — it simulates the parts of
 * Gmail that the sync engine has to survive: paging, an advancing `historyId`
 * cursor, and cursor expiry. Those are precisely the behaviours where a bug
 * loses a student's email permanently, so the fake has to be faithful enough
 * to exercise them.
 */

export interface FakeGmailOptions {
  /** Defaults to the corpus on disk. */
  fixtures?: Fixture[];
  /** Small by default so paging is exercised rather than skipped. */
  pageSize?: number;
  /** Cursors the fake should treat as expired, to drive the rescan path. */
  expiredHistoryIds?: string[];
  /** Throw on the Nth fetchMessage call, to test partial-batch crash recovery. */
  failFetchAfter?: number;
}

export class FakeGmailClient implements GmailClient {
  private readonly fixtures: Fixture[];
  private readonly pageSize: number;
  private readonly expired: Set<string>;
  private readonly failFetchAfter: number | undefined;

  private fetchCount = 0;
  /** Every call made, so tests can assert the sync never re-fetches what it
   *  has already processed. */
  readonly fetchedIds: string[] = [];

  constructor(options: FakeGmailOptions = {}) {
    // Oldest first: the pipeline must process a thread in arrival order or
    // stage progression comes out wrong.
    this.fixtures = (options.fixtures ?? loadCorpus()).slice().sort((a, b) =>
      a.email.receivedAt.localeCompare(b.email.receivedAt),
    );
    this.pageSize = options.pageSize ?? 10;
    this.expired = new Set(options.expiredHistoryIds ?? []);
    this.failFetchAfter = options.failFetchAfter;
  }

  /** The cursor is the count of messages already delivered. Real Gmail history
   *  ids are opaque, so nothing outside this class may interpret them. */
  listSince(historyId: string | null, pageToken?: string): Promise<GmailPage> {
    if (historyId !== null && this.expired.has(historyId)) {
      return Promise.reject(new HistoryIdExpiredError(historyId));
    }

    const start = this.offsetFrom(historyId, pageToken);
    const slice = this.fixtures.slice(start, start + this.pageSize);
    const end = start + slice.length;

    const page: GmailPage = {
      messageIds: slice.map((f) => f.email.gmailMessageId),
      historyId: String(this.fixtures.length),
    };
    if (end < this.fixtures.length) {
      page.nextPageToken = String(end);
    }
    return Promise.resolve(page);
  }

  fetchMessage(id: string): Promise<RawEmail> {
    this.fetchCount += 1;
    if (this.failFetchAfter !== undefined && this.fetchCount > this.failFetchAfter) {
      return Promise.reject(new Error(`FakeGmailClient: simulated failure on fetch #${this.fetchCount}`));
    }

    const fixture = this.fixtures.find((f) => f.email.gmailMessageId === id);
    if (!fixture) {
      return Promise.reject(new Error(`FakeGmailClient: no fixture with gmailMessageId "${id}"`));
    }

    this.fetchedIds.push(id);
    return Promise.resolve({
      gmailMessageId: fixture.email.gmailMessageId,
      gmailThreadId: fixture.email.gmailThreadId,
      receivedAt: new Date(fixture.email.receivedAt),
      fromAddress: fixture.email.fromAddress,
      subject: fixture.email.subject,
      body: fixture.email.body,
    });
  }

  private offsetFrom(historyId: string | null, pageToken?: string): number {
    if (pageToken !== undefined) return Number(pageToken);
    if (historyId === null) return 0;
    const parsed = Number(historyId);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  /** Total fixtures available — the denominator a progress indicator needs. */
  get size(): number {
    return this.fixtures.length;
  }
}
