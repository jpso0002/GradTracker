import { useEffect, useState } from "react";
import { api } from "./api/client";

/**
 * A link to the email GradTracker read, in the student's own Gmail (D38).
 *
 * GradTracker stores no subject or body, so the only honest way to show a
 * student the source is to send them to their inbox (SM-6). Which link depends
 * on what the id is:
 *
 *   - an RFC 822 Message-ID (`abc@host`) — from the demo inbox or an export —
 *     is searched with `rfc822msgid:`, the one search Gmail matches it by;
 *   - a Gmail API id (16 hex digits) — from the connector — opens directly;
 *   - anything else — the seeded mailbox, the backup emails, authored fixtures —
 *     names no email in any inbox, so there is no link rather than a dead one
 *     (C10).
 *
 * `account` opens it in the inbox it was read from. Without it Gmail uses the
 * first account signed in to the browser — usually the presenter's own, where
 * the email is not.
 */
export function gmailLink(gmailMessageId: string | null, account: string | null): string | null {
  if (!gmailMessageId) return null;

  let target: string;
  if (gmailMessageId.includes("@")) {
    target = `#search/${encodeURIComponent(`rfc822msgid:${gmailMessageId}`)}`;
  } else if (/^[0-9a-f]{16}$/.test(gmailMessageId)) {
    target = `#all/${gmailMessageId}`;
  } else {
    return null;
  }

  const base = account
    ? `https://mail.google.com/mail/?authuser=${encodeURIComponent(account)}`
    : "https://mail.google.com/mail/u/0/";
  return `${base}${target}`;
}

let mailbox: Promise<string | null> | null = null;

/** The account the emails were read from, asked once per page load. */
export function useMailboxAccount(): string | null {
  const [account, setAccount] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    mailbox ??= api
      .me()
      .then((me) => me.mailbox)
      .catch(() => {
        mailbox = null;
        return null;
      });
    void mailbox.then((value) => {
      if (live) setAccount(value);
    });
    return () => {
      live = false;
    };
  }, []);
  return account;
}
