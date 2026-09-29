import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readMailboxes, dedupeById, MailboxPathError } from "./reader.js";

/**
 * T7.8 — the mailbox reader. Every email here is synthetic and written to a
 * temporary directory: real email content never enters the repository.
 */

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "gt-mailbox-"));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const CRLF = "\r\n";
const message = (lines: string[]) => lines.join(CRLF) + CRLF;

const plain = message([
  "From: Deloitte Careers <careers@deloitte.test>",
  "Subject: Your application has been received",
  "Date: Mon, 09 Mar 2026 10:55:57 +0000",
  "Message-ID: <plain-1@deloitte.test>",
  "Content-Type: text/plain; charset=utf-8",
  "",
  "Thank you for applying to the Audit Graduate Program.",
]);

const multipart = message([
  "From: \"KPMG\" <noreply@smartrecruiters.test>",
  "Subject: Assessment invitation",
  "Date: Tue, 10 Mar 2026 10:57:21 +0000",
  "Message-ID: <multi-1@smartrecruiters.test>",
  "MIME-Version: 1.0",
  'Content-Type: multipart/alternative; boundary="b1"',
  "",
  "--b1",
  "Content-Type: text/plain; charset=utf-8",
  "",
  "Plain part: complete the assessment by Wednesday.",
  "--b1",
  "Content-Type: text/html; charset=utf-8",
  "",
  "<p>HTML part: complete the assessment by Wednesday.</p>",
  "--b1--",
]);

const htmlOnlyQuotedPrintable = message([
  "From: PwC <recruiting@pwc.test>",
  "Subject: =?UTF-8?Q?Digital_interview_=E2=80=94_next_steps?=",
  "Date: Sat, 14 Mar 2026 00:32:41 +0000",
  "Message-ID: <html-1@pwc.test>",
  "MIME-Version: 1.0",
  "Content-Type: text/html; charset=utf-8",
  "Content-Transfer-Encoding: quoted-printable",
  "",
  "<html><body><p>Please record your interview by <b>Friday 20 M=",
  "arch</b>.</p><p>Caf=C3=A9 chat available.</p></body></html>",
]);

const base64Body = message([
  "From: nbn <nbn@myworkday.test>",
  "Subject: Your application has been received by nbn",
  "Date: Wed, 18 Mar 2026 11:58:14 +0000",
  "Message-ID: <b64-1@myworkday.test>",
  "MIME-Version: 1.0",
  "Content-Type: text/plain; charset=utf-8",
  "Content-Transfer-Encoding: base64",
  "",
  Buffer.from("Thank you for applying — résumé received.", "utf8").toString("base64"),
]);

describe("mailbox reader (T7.8)", () => {
  it("reads a plain .eml into a RawEmail with a bare sender address", async () => {
    writeFileSync(join(dir, "one.eml"), plain);
    const { emails, skipped } = await readMailboxes([join(dir, "one.eml")]);

    expect(skipped).toEqual([]);
    expect(emails).toHaveLength(1);
    const [email] = emails;
    expect(email!.gmailMessageId).toBe("plain-1@deloitte.test");
    expect(email!.fromAddress).toBe("careers@deloitte.test");
    expect(email!.subject).toBe("Your application has been received");
    expect(email!.receivedAt.toISOString()).toBe("2026-03-09T10:55:57.000Z");
    expect(email!.body).toContain("Audit Graduate Program");
  });

  it("prefers the text part of a multipart message", async () => {
    writeFileSync(join(dir, "m.eml"), multipart);
    const [email] = (await readMailboxes([join(dir, "m.eml")])).emails;
    expect(email!.body).toContain("Plain part");
    expect(email!.body).not.toContain("<p>");
  });

  it("reduces an HTML-only email to text, decoding quoted-printable and non-ASCII", async () => {
    // Many applicant-tracking systems send HTML only; this is the common case.
    writeFileSync(join(dir, "h.eml"), htmlOnlyQuotedPrintable);
    const [email] = (await readMailboxes([join(dir, "h.eml")])).emails;

    expect(email!.subject).toBe("Digital interview — next steps");
    expect(email!.body).toContain("by Friday 20 March");
    expect(email!.body).toContain("Café");
    expect(email!.body).not.toMatch(/<\/?[a-z]/i);
  });

  it("falls back to the HTML when the plain-text part is only whitespace (Criteria Corp's shape)", async () => {
    // Found in a real export: the text part held two blank lines, the HTML
    // held the invitation. The parser returned the blank text (C21).
    writeFileSync(
      join(dir, "c.eml"),
      message([
        "From: Criteria <DO-NOT-REPLY@criteria.test>",
        "Subject: Your assessment",
        "Date: Mon, 09 Mar 2026 10:55:33 +0000",
        "Message-ID: <criteria-1@criteria.test>",
        "MIME-Version: 1.0",
        'Content-Type: multipart/alternative; boundary="c1"',
        "",
        "--c1",
        "Content-Type: text/plain; charset=utf-8",
        "",
        "  ",
        "",
        "--c1",
        "Content-Type: text/html; charset=utf-8",
        "",
        "<html><body><p>Please complete your assessment by <b>14 March</b>.</p></body></html>",
        "--c1--",
      ]),
    );
    const [email] = (await readMailboxes([join(dir, "c.eml")])).emails;
    expect(email!.body).toContain("Please complete your assessment by 14 March");
    expect(email!.body).not.toMatch(/<\/?[a-z]/i);
  });

  it("reads HTML nested in multipart/related with no text part (Workday's shape)", async () => {
    // Also from a real export: mixed → related → HTML plus an inline logo. The
    // parser returned no text at all, so the email looked empty (C21).
    writeFileSync(
      join(dir, "w.eml"),
      message([
        "From: nbn <nbn@myworkday.test>",
        "Subject: Thanks for applying",
        "Date: Wed, 18 Mar 2026 11:58:14 +0000",
        "Message-ID: <workday-1@myworkday.test>",
        "MIME-Version: 1.0",
        'Content-Type: multipart/mixed; boundary="m1"',
        "",
        "--m1",
        'Content-Type: multipart/related; boundary="r1"',
        "",
        "--r1",
        "Content-Type: text/html; charset=utf-8",
        "",
        '<html><body><p>Thank you for applying for the Graduate Program.</p><img src="cid:logo"></body></html>',
        "--r1",
        "Content-Type: image/png",
        "Content-ID: <logo>",
        "Content-Disposition: inline",
        "Content-Transfer-Encoding: base64",
        "",
        "iVBORw0KGgo=",
        "--r1--",
        "--m1--",
      ]),
    );
    const [email] = (await readMailboxes([join(dir, "w.eml")])).emails;
    expect(email!.body).toContain("Thank you for applying for the Graduate Program");
  });

  it("names a missing path plainly instead of failing with a stack trace", async () => {
    const missing = join(dir, "GradTracker export.mbox");
    const error = await readMailboxes([missing]).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(MailboxPathError);
    expect((error as Error).message).toContain(`Cannot find ${missing}`);
  });

  it("decodes a base64 body", async () => {
    writeFileSync(join(dir, "b.eml"), base64Body);
    const [email] = (await readMailboxes([join(dir, "b.eml")])).emails;
    expect(email!.body).toBe("Thank you for applying — résumé received.");
  });

  it("splits an mbox on From_ lines and unescapes >From in bodies", async () => {
    const mbox = [
      "From 1111@xxx Mon Mar 09 10:55:57 +0000 2026",
      plain,
      "From 2222@xxx Tue Mar 10 10:57:21 +0000 2026",
      message([
        "From: Grad Team <grad@example.test>",
        "Subject: A body line that starts with From",
        "Date: Tue, 10 Mar 2026 12:00:00 +0000",
        "Message-ID: <escaped-1@example.test>",
        "",
        "Some text.",
        ">From the team, good luck.",
      ]),
    ].join("\n");
    writeFileSync(join(dir, "all.mbox"), mbox);

    const { emails, skipped } = await readMailboxes([join(dir, "all.mbox")]);
    expect(skipped).toEqual([]);
    expect(emails.map((e) => e.gmailMessageId)).toEqual([
      "plain-1@deloitte.test",
      "escaped-1@example.test",
    ]);
    expect(emails[1]!.body).toContain("From the team, good luck.");
    expect(emails[1]!.body).not.toContain(">From");
  });

  it("does not split on a 'From ' line in mid-paragraph", async () => {
    const mbox = [
      "From 1111@xxx Mon Mar 09 10:55:57 +0000 2026",
      message([
        "From: Careers <careers@example.test>",
        "Subject: Unescaped body line",
        "Date: Mon, 09 Mar 2026 10:55:57 +0000",
        "Message-ID: <para-1@example.test>",
        "",
        "Best wishes,",
        "From everyone in the graduate team",
      ]),
    ].join("\n");
    writeFileSync(join(dir, "p.mbox"), mbox);

    const { emails } = await readMailboxes([join(dir, "p.mbox")]);
    expect(emails).toHaveLength(1);
    expect(emails[0]!.body).toContain("From everyone in the graduate team");
  });

  it("skips and counts a malformed message without losing the rest of the file", async () => {
    const mbox = [
      "From 1 Mon Mar 09 10:55:57 +0000 2026",
      plain,
      "From 2 Mon Mar 09 11:00:00 +0000 2026",
      message(["Subject: no sender and no date", "", "orphaned text"]),
      "From 3 Tue Mar 10 10:57:21 +0000 2026",
      multipart,
    ].join("\n");
    writeFileSync(join(dir, "mixed.mbox"), mbox);

    const { emails, skipped } = await readMailboxes([join(dir, "mixed.mbox")]);
    expect(emails.map((e) => e.gmailMessageId)).toEqual([
      "plain-1@deloitte.test",
      "multi-1@smartrecruiters.test",
    ]);
    expect(skipped).toHaveLength(1);
    expect(skipped[0]).toMatchObject({ sourceFile: "mixed.mbox", position: 2 });
    expect(skipped[0]!.reason).toMatch(/sender|Date/);
  });

  it("derives a stable id when an export has no Message-ID", async () => {
    const noId = message([
      "From: Careers <careers@example.test>",
      "Subject: No id",
      "Date: Mon, 09 Mar 2026 10:55:57 +0000",
      "",
      "Body.",
    ]);
    writeFileSync(join(dir, "n.eml"), noId);

    const first = (await readMailboxes([join(dir, "n.eml")])).emails[0]!;
    const second = (await readMailboxes([join(dir, "n.eml")])).emails[0]!;
    expect(first.derivedMessageId).toBe(true);
    expect(first.gmailMessageId).toMatch(/^derived-[0-9a-f]{16}$/);
    // Stable, so re-reading the same export is still caught as a duplicate.
    expect(second.gmailMessageId).toBe(first.gmailMessageId);
  });

  it("uses Gmail's thread id where a Takeout export carries it", async () => {
    writeFileSync(
      join(dir, "t.eml"),
      message([
        "From: Careers <careers@example.test>",
        "Subject: Threaded",
        "Date: Mon, 09 Mar 2026 10:55:57 +0000",
        "Message-ID: <t-1@example.test>",
        "X-GM-THRID: 1612345678901234567",
        "",
        "Body.",
      ]),
    );
    const [email] = (await readMailboxes([join(dir, "t.eml")])).emails;
    expect(email!.gmailThreadId).toBe("1612345678901234567");
  });

  it("searches folders recursively, in a stable order, ignoring other files", async () => {
    mkdirSync(join(dir, "Takeout", "Mail"), { recursive: true });
    writeFileSync(join(dir, "Takeout", "Mail", "b.eml"), multipart);
    writeFileSync(join(dir, "Takeout", "Mail", "a.eml"), plain);
    writeFileSync(join(dir, "Takeout", "archive_browser.html"), "<html></html>");

    const { files, emails } = await readMailboxes([dir]);
    expect(files.map((f) => f.slice(-5))).toEqual(["a.eml", "b.eml"]);
    expect(emails).toHaveLength(2);
  });

  it("reports the same email found twice as a duplicate, keeping the first", async () => {
    writeFileSync(join(dir, "one.eml"), plain);
    writeFileSync(join(dir, "copy.eml"), plain);
    const { unique, duplicates } = dedupeById((await readMailboxes([dir])).emails);
    expect(unique).toHaveLength(1);
    expect(duplicates).toHaveLength(1);
  });
});
