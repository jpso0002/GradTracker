import { describe, it, expect } from "vitest";
import { getTableConfig as pgConfig } from "drizzle-orm/pg-core";
import { getTableConfig as sqliteConfig } from "drizzle-orm/sqlite-core";
import { pgSchema } from "./schema.pg.js";
import { sqliteSchema } from "./schema.sqlite.js";

/**
 * T1.5 — the forbidden-column guard.
 *
 * Two success criteria are enforced here rather than asserted in prose:
 *
 *   SM-6  No raw email content persists beyond the classification window.
 *   SM-5  Zero credentials stored.
 *
 * Both are properties of the SCHEMA, not of the code that writes to it. A
 * developer who adds a `subject` column to make debugging easier has broken
 * SM-6 whether or not anything writes to it yet — so the column itself is the
 * thing to forbid.
 *
 * To verify this test actually bites, add `subject: text("subject")` to
 * emailEvents in either schema file and run it. It must fail. A test asserting
 * the ABSENCE of something passes trivially when it is broken, so it has to be
 * checked in the failing direction at least once.
 */

/** Raw message content. Storing any of these violates SM-6. */
const FORBIDDEN_CONTENT_COLUMNS = [
  "subject",
  "body",
  "body_html",
  "body_text",
  "snippet",
  "raw",
  "raw_message",
  "message_body",
  "content",
  "text_content",
  "html",
];

/** Identifiers beyond the sender's domain, and anything credential-shaped.
 *  `sender_domain` is permitted and deliberately excluded from this list. */
const FORBIDDEN_IDENTITY_COLUMNS = [
  "from_address",
  "from_email",
  "sender_address",
  "sender_email",
  "to_address",
  "recipient",
  "cc",
  "bcc",
];

/** Credentials. SM-5 is enforced by the absence of the column. */
const FORBIDDEN_CREDENTIAL_COLUMNS = [
  "password",
  "password_hash",
  "passwd",
  "secret",
  "api_key",
  "access_token",
  "refresh_token", // the ENCRYPTED value lives in refresh_token_ciphertext
  "token",
];

const ALL_FORBIDDEN = [
  ...FORBIDDEN_CONTENT_COLUMNS,
  ...FORBIDDEN_IDENTITY_COLUMNS,
  ...FORBIDDEN_CREDENTIAL_COLUMNS,
];

function pgColumns(): { table: string; column: string }[] {
  return Object.values(pgSchema).flatMap((t) => {
    const c = pgConfig(t);
    return c.columns.map((col) => ({ table: c.name, column: col.name }));
  });
}

function sqliteColumns(): { table: string; column: string }[] {
  return Object.values(sqliteSchema).flatMap((t) => {
    const c = sqliteConfig(t);
    return c.columns.map((col) => ({ table: c.name, column: col.name }));
  });
}

describe("SM-6 — no raw email content may exist in the schema", () => {
  for (const [dialect, columns] of [
    ["postgres", pgColumns()],
    ["sqlite", sqliteColumns()],
  ] as const) {
    describe(dialect, () => {
      for (const forbidden of ALL_FORBIDDEN) {
        it(`has no column named "${forbidden}"`, () => {
          const offenders = columns.filter((c) => c.column === forbidden);
          expect(
            offenders,
            offenders.length
              ? `Forbidden column "${forbidden}" found on: ${offenders
                  .map((o) => o.table)
                  .join(", ")}. See implementation.md §4.3 — the retention boundary.`
              : "",
          ).toHaveLength(0);
        });
      }
    });
  }
});

describe("SM-5 — zero credentials stored", () => {
  it("stores the refresh token only as encrypted ciphertext, iv and tag", () => {
    const userCols = pgConfig(pgSchema.users).columns.map((c) => c.name);
    expect(userCols).toContain("refresh_token_ciphertext");
    expect(userCols).toContain("refresh_token_iv");
    expect(userCols).toContain("refresh_token_tag");
    // The plaintext column must not exist alongside them.
    expect(userCols).not.toContain("refresh_token");
  });

  it("has no password column on any table in either dialect", () => {
    const all = [...pgColumns(), ...sqliteColumns()];
    expect(all.filter((c) => c.column.includes("password"))).toEqual([]);
  });
});

describe("what the retention boundary DOES permit", () => {
  // Stated positively so a future reader does not over-apply the rule and
  // delete the provenance trail that makes the timeline work.
  it("keeps sender_domain — provenance without the address", () => {
    const cols = pgConfig(pgSchema.emailEvents).columns.map((c) => c.name);
    expect(cols).toContain("sender_domain");
  });

  it("keeps the Gmail message and thread ids — dedup and deep links", () => {
    const cols = pgConfig(pgSchema.emailEvents).columns.map((c) => c.name);
    expect(cols).toContain("gmail_message_id");
    expect(cols).toContain("gmail_thread_id");
  });
});
