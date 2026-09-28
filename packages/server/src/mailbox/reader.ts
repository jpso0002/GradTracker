import { createReadStream, readFileSync, readdirSync, statSync } from "node:fs";
import { createInterface } from "node:readline";
import { createHash } from "node:crypto";
import { basename, extname, join } from "node:path";
import { simpleParser, type ParsedMail } from "mailparser";
import type { RawEmail } from "../ports/index.js";

/**
 * Reads mailbox exports into `RawEmail` (T7.8).
 *
 * Two formats, both produced by Gmail itself:
 *   - a Google Takeout `.mbox` — many messages in one file
 *   - individual `.eml` files — "Show original" → "Download original"
 *
 * MIME is parsed by an established library rather than by hand: multipart
 * bodies, quoted-printable and base64, RFC 2047 encoded headers, character
 * sets, and HTML-only emails reduced to text. Many applicant-tracking systems
 * send HTML only, so that last one is not an edge case.
 *
 * **A malformed message is skipped and counted, never fatal.** One bad message
 * must not cost the other four hundred in the file.
 *
 * Everything this returns holds real email content. It is used in memory by
 * the labelling toolkit and, later, by ingestion; it is never persisted by
 * this module.
 */

export interface MailboxEmail extends RawEmail {
  /** The file it came from — for the inventory and error messages only. */
  sourceFile: string;
  /** True when the export had no `Message-ID` and one was derived instead. */
  derivedMessageId: boolean;
}

export interface SkippedMessage {
  sourceFile: string;
  /** 1-based position of the message within its file. */
  position: number;
  reason: string;
}

export interface MailboxReadResult {
  files: string[];
  emails: MailboxEmail[];
  skipped: SkippedMessage[];
}

const SUPPORTED = new Set([".mbox", ".eml"]);

/**
 * Reads every `.mbox` and `.eml` found at the given paths. Directories are
 * searched recursively — a Takeout archive nests its mailboxes. Files are read
 * in sorted order, so the same exports always produce the same sequence.
 */
export async function readMailboxes(paths: string[]): Promise<MailboxReadResult> {
  const files = paths.flatMap(expand).sort();
  const result: MailboxReadResult = { files, emails: [], skipped: [] };

  for (const file of files) {
    const messages =
      extname(file).toLowerCase() === ".eml" ? [readFileSync(file, "utf8")] : await splitMbox(file);

    for (const [index, source] of messages.entries()) {
      const position = index + 1;
      try {
        const email = toEmail(await parse(source), file);
        if (typeof email === "string") {
          result.skipped.push({ sourceFile: basename(file), position, reason: email });
        } else {
          result.emails.push(email);
        }
      } catch (error) {
        result.skipped.push({
          sourceFile: basename(file),
          position,
          reason: `could not be parsed: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
    }
  }

  return result;
}

function expand(path: string): string[] {
  const stat = statSync(path);
  if (stat.isFile()) {
    if (!SUPPORTED.has(extname(path).toLowerCase())) {
      throw new Error(`${path} is not an .mbox or .eml file.`);
    }
    return [path];
  }
  return readdirSync(path).flatMap((entry) => {
    const child = join(path, entry);
    return statSync(child).isDirectory()
      ? expand(child)
      : SUPPORTED.has(extname(child).toLowerCase())
        ? [child]
        : [];
  });
}

/**
 * Splits an mbox into raw messages, streaming so a large export is never held
 * in memory whole.
 *
 * A line starting "From " begins a new message only at the start of the file
 * or directly after a blank line — the separator's actual position in every
 * mbox variant. A body line that merely begins "From " in mid-paragraph is not
 * a separator. Lines escaped as ">From " are unescaped by one level (mboxrd).
 */
async function splitMbox(file: string): Promise<string[]> {
  const messages: string[] = [];
  let current: string[] | null = null;
  let previousBlank = true;

  const lines = createInterface({ input: createReadStream(file), crlfDelay: Infinity });
  for await (const line of lines) {
    if (line.startsWith("From ") && previousBlank) {
      if (current) messages.push(current.join("\n"));
      current = [];
    } else if (current) {
      current.push(/^>+From /.test(line) ? line.slice(1) : line);
    }
    previousBlank = line.trim() === "";
  }
  if (current) messages.push(current.join("\n"));

  return messages;
}

function parse(source: string): Promise<ParsedMail> {
  return simpleParser(source, {
    skipImageLinks: true,
    skipTextToHtml: true,
    skipTextLinks: true,
  });
}

/** A usable email, or the reason it is not one. */
function toEmail(mail: ParsedMail, file: string): MailboxEmail | string {
  const fromAddress = mail.from?.value[0]?.address;
  if (!fromAddress) return "no sender address";

  // The Date header. Without one there is no way to order the message or to
  // resolve a relative deadline like "within 48 hours" — so it is not usable.
  const receivedAt = mail.date;
  if (!receivedAt || Number.isNaN(receivedAt.getTime())) return "no usable Date header";

  const subject = mail.subject ?? "";
  const body = (mail.text ?? "").replace(/\r\n/g, "\n").trim();

  const messageId = stripBrackets(mail.messageId);
  const derivedMessageId = messageId === null;
  const gmailMessageId =
    messageId ?? `derived-${fingerprint(fromAddress, receivedAt.toISOString(), subject, body)}`;

  return {
    gmailMessageId,
    gmailThreadId: threadId(mail) ?? gmailMessageId,
    receivedAt,
    // The bare address, not "Name <address>". The pre-filter anchors its
    // patterns to the start of the address, so a display name would defeat it.
    fromAddress: fromAddress.toLowerCase(),
    subject,
    body,
    sourceFile: basename(file),
    derivedMessageId,
  };
}

/** Gmail's own thread id where a Takeout export carries it; otherwise the root
 *  of the reply chain; otherwise nothing, and the message is its own thread. */
function threadId(mail: ParsedMail): string | null {
  const gmail = mail.headers.get("x-gm-thrid");
  if (typeof gmail === "string" && gmail.trim() !== "") return gmail.trim();

  const references = mail.references;
  const root = Array.isArray(references) ? references[0] : references;
  return stripBrackets(root ?? mail.inReplyTo);
}

/** `<abc@host>` → `abc@host`. Gmail's `rfc822msgid:` search takes it bare. */
function stripBrackets(id: string | undefined): string | null {
  const trimmed = id?.trim().replace(/^<|>$/g, "");
  return trimmed ? trimmed : null;
}

/** Stable across runs, so re-reading an export without Message-IDs produces
 *  the same ids and the duplicate protection still works. */
function fingerprint(...parts: string[]): string {
  return createHash("sha256").update(parts.join("\u0000")).digest("hex").slice(0, 16);
}

/**
 * Removes repeat copies of one email — the same Message-ID exported twice, or
 * found in two overlapping exports. Keeps the first; reports the rest.
 */
export function dedupeById(emails: MailboxEmail[]): {
  unique: MailboxEmail[];
  duplicates: MailboxEmail[];
} {
  const seen = new Set<string>();
  const unique: MailboxEmail[] = [];
  const duplicates: MailboxEmail[] = [];
  for (const email of emails) {
    if (seen.has(email.gmailMessageId)) duplicates.push(email);
    else {
      seen.add(email.gmailMessageId);
      unique.push(email);
    }
  }
  return { unique, duplicates };
}
