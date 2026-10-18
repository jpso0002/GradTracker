import { ImapFlow, type FetchMessageObject } from "imapflow";
import type { MailboxReader, RawEmail } from "../../ports/index.js";
import { parseRawMessage } from "../../mailbox/reader.js";

/**
 * The demo inbox, read over IMAP with an app password (D36, D37).
 *
 * Reading is read-only: the mailbox is opened with `readOnly`, so reading never
 * marks a message as seen, and nothing on the reading path can send, move or
 * delete mail. The one write is `appendSamples`, run by the team's own load
 * script to place the sample emails in the inbox. The password comes from
 * `.env` and is never logged — a failed login reports the account, not the
 * secret.
 *
 * One connection per call. Refresh is pressed a handful of times in a
 * presentation; a long-lived connection would only add a way to fail between
 * presses (an idle timeout on the venue's Wi-Fi).
 */

export interface ImapMailboxOptions {
  user: string;
  /** A Google app password — not the account password. */
  password: string;
  host?: string;
  port?: number;
}

/** Bodies longer than this are cut: the classifier needs the gist, and a demo
 *  email is a paragraph. Keeps a stray newsletter from filling memory. */
const MAX_BODY_CHARS = 20_000;

/** Bigger messages are not read whole — a demo email is a few kilobytes. */
const MAX_SOURCE_BYTES = 1_000_000;

/** How a sample email is marked when loaded: its Message-ID. Mail a person
 *  sends never carries one of these. */
const SAMPLE_MESSAGE_ID = /^<(fixture-[\w-]+)@gradtracker\.demo>$/;

export function sampleMessageId(gmailMessageId: string): string {
  return `<${gmailMessageId}@gradtracker.demo>`;
}

export interface SampleMessage {
  /** The complete RFC 822 message. */
  raw: string;
  /** The date it shows as received. */
  receivedAt: Date;
}

// Whole messages in one round trip: fetching each body separately made the
// opening scan of 80 emails take one request per email.
const FETCH = { uid: true, envelope: true, internalDate: true, size: true, source: true, emailId: true, threadId: true } as const;

export class ImapMailboxReader implements MailboxReader {
  constructor(private readonly options: ImapMailboxOptions) {}

  /** Mail a person sent after `since` — never the loaded samples. */
  async readSince(since: Date): Promise<RawEmail[]> {
    return this.withInbox(true, async (client) => {
      // IMAP's SINCE is a whole day, so this over-fetches and the exact
      // instant is checked below.
      const uids = (await client.search({ since }, { uid: true })) || [];
      if (uids.length === 0) return [];

      const emails: RawEmail[] = [];
      for (const message of await client.fetchAll(uids, FETCH, { uid: true })) {
        if (sampleId(message) !== null) continue;
        const email = await this.toRawEmail(message);
        if (email.receivedAt.getTime() > since.getTime()) emails.push(email);
      }
      return sortOldestFirst(emails);
    });
  }

  /** The loaded sample emails (D37), with the ids the answer key knows them by. */
  async readSamples(): Promise<RawEmail[]> {
    return this.withInbox(true, async (client) => {
      const uids = (await client.search({ all: true }, { uid: true })) || [];
      if (uids.length === 0) return [];

      const emails: RawEmail[] = [];
      for (const message of await client.fetchAll(uids, FETCH, { uid: true })) {
        const id = sampleId(message);
        if (id === null) continue;
        const email = await this.toRawEmail(message);
        // Named by its Message-ID, like every email from this inbox (D38).
        emails.push({ ...email, gmailMessageId: `${id}@gradtracker.demo`, gmailThreadId: `${id}-thread` });
      }
      return sortOldestFirst(emails);
    });
  }

  /** Ids of the samples already in the inbox, so a second load adds nothing. */
  async listSampleIds(): Promise<Set<string>> {
    return this.withInbox(true, async (client) => {
      const uids = (await client.search({ all: true }, { uid: true })) || [];
      const ids = new Set<string>();
      if (uids.length === 0) return ids;
      for (const message of await client.fetchAll(uids, { uid: true, envelope: true }, { uid: true })) {
        const id = sampleId(message);
        if (id !== null) ids.add(id);
      }
      return ids;
    });
  }

  /** Places messages in the inbox as already read. Sends nothing. */
  async appendSamples(messages: SampleMessage[]): Promise<number> {
    return this.withInbox(false, async (client) => {
      for (const message of messages) {
        await client.append("INBOX", message.raw, ["\\Seen"], message.receivedAt);
      }
      return messages.length;
    });
  }

  private async withInbox<T>(readOnly: boolean, work: (client: ImapFlow) => Promise<T>): Promise<T> {
    const client = new ImapFlow({
      host: this.options.host ?? "imap.gmail.com",
      port: this.options.port ?? 993,
      secure: true,
      auth: { user: this.options.user, pass: this.options.password },
      logger: false,
    });

    try {
      await client.connect();
    } catch (error) {
      throw new Error(
        `Could not sign in to the demo inbox ${this.options.user}. Check GMAIL_DEMO_USER and GMAIL_DEMO_APP_PASSWORD in .env.`,
        { cause: error },
      );
    }

    try {
      const lock = await client.getMailboxLock("INBOX", { readOnly });
      try {
        return await work(client);
      } finally {
        lock.release();
      }
    } finally {
      await client.logout().catch(() => undefined);
    }
  }

  private async toRawEmail(message: FetchMessageObject): Promise<RawEmail> {
    const sender = message.envelope?.from?.[0];
    const parsed =
      message.source && (message.size ?? 0) <= MAX_SOURCE_BYTES ? await parseRawMessage(message.source) : null;
    return {
      // The Message-ID header, bare (D38): the one id Gmail can search by
      // (rfc822msgid:), so the app can link the student to this email. Gmail's
      // own id only when a message has none.
      gmailMessageId: bareMessageId(message.envelope?.messageId) ?? `imap-${message.emailId ?? message.uid}`,
      gmailThreadId: `imap-${message.threadId ?? message.uid}`,
      receivedAt: new Date(message.internalDate ?? message.envelope?.date ?? 0),
      fromAddress: sender?.address ?? "",
      subject: message.envelope?.subject ?? "",
      body: (parsed?.body ?? "").slice(0, MAX_BODY_CHARS),
    };
  }
}

/** `<abc@host>` → `abc@host`. */
function bareMessageId(value: string | undefined): string | null {
  const bare = (value ?? "").trim().replace(/^<|>$/g, "");
  return bare.includes("@") ? bare : null;
}

function sampleId(message: FetchMessageObject): string | null {
  return SAMPLE_MESSAGE_ID.exec(message.envelope?.messageId ?? "")?.[1] ?? null;
}

function sortOldestFirst(emails: RawEmail[]): RawEmail[] {
  return emails.sort((a, b) => a.receivedAt.getTime() - b.receivedAt.getTime());
}
