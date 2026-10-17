import { ImapFlow, type MessageStructureObject } from "imapflow";
import type { MailboxReader, RawEmail } from "../../ports/index.js";

/**
 * The demo inbox, read over IMAP with an app password (D36).
 *
 * Read-only: the mailbox is opened with `readOnly`, so reading never marks a
 * message as seen, and nothing here can send, move or delete mail. The
 * password comes from `.env` and is never logged — a failed login reports the
 * account, not the secret.
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

export class ImapMailboxReader implements MailboxReader {
  constructor(private readonly options: ImapMailboxOptions) {}

  async readSince(since: Date): Promise<RawEmail[]> {
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
      const lock = await client.getMailboxLock("INBOX", { readOnly: true });
      try {
        // IMAP's SINCE is a whole day, so this over-fetches and the exact
        // instant is checked below.
        const uids = (await client.search({ since }, { uid: true })) || [];
        if (uids.length === 0) return [];

        const messages = await client.fetchAll(
          uids,
          { uid: true, envelope: true, internalDate: true, bodyStructure: true, emailId: true, threadId: true },
          { uid: true },
        );

        const emails: RawEmail[] = [];
        for (const message of messages) {
          const receivedAt = new Date(message.internalDate ?? message.envelope?.date ?? 0);
          if (receivedAt.getTime() <= since.getTime()) continue;

          const sender = message.envelope?.from?.[0];
          emails.push({
            // Gmail's own ids when the server offers them (X-GM-MSGID), so a
            // message keeps its identity across restarts.
            gmailMessageId: `imap-${message.emailId ?? message.uid}`,
            gmailThreadId: `imap-${message.threadId ?? message.uid}`,
            receivedAt,
            fromAddress: sender?.address ?? "",
            subject: message.envelope?.subject ?? "",
            body: await this.readBody(client, message.uid, message.bodyStructure),
          });
        }

        return emails.sort((a, b) => a.receivedAt.getTime() - b.receivedAt.getTime());
      } finally {
        lock.release();
      }
    } finally {
      await client.logout().catch(() => undefined);
    }
  }

  /** The plain-text part, or the HTML part with its tags stripped. */
  private async readBody(
    client: ImapFlow,
    uid: number,
    structure: MessageStructureObject | undefined,
  ): Promise<string> {
    const part = findPart(structure, "text/plain") ?? findPart(structure, "text/html");
    if (!part) return "";

    // `download` decodes the transfer encoding and charset.
    const download = await client.download(String(uid), part.part ?? "1", { uid: true });
    if (!download.content) return "";

    let text = "";
    for await (const chunk of download.content) {
      text += String(chunk);
      if (text.length > MAX_BODY_CHARS) break;
    }
    text = text.slice(0, MAX_BODY_CHARS);
    return part.type === "text/html" ? stripHtml(text) : text;
  }
}

function findPart(node: MessageStructureObject | undefined, type: string): MessageStructureObject | undefined {
  if (!node) return undefined;
  if (node.type === type && node.disposition !== "attachment") return node;
  for (const child of node.childNodes ?? []) {
    const found = findPart(child, type);
    if (found) return found;
  }
  return undefined;
}

function stripHtml(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>|<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
