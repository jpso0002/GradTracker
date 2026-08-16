import { describe, it, expect } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient } from "@libsql/client";
import { drizzle as drizzleSqlite } from "drizzle-orm/libsql";
import { migrate as migrateSqlite } from "drizzle-orm/libsql/migrator";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePg } from "drizzle-orm/pglite";
import { migrate as migratePg } from "drizzle-orm/pglite/migrator";
import { sql } from "drizzle-orm";

/**
 * T1.4's done-when: migrations succeed clean on both engines from empty.
 *
 * This is a test rather than a manual `npm run db:migrate` on two machines,
 * because "it worked when I ran it" is not a property CI can re-check. Both
 * engines run in-process — libsql in memory, and PGlite, which is real
 * Postgres compiled to WASM — so this needs no database server installed.
 */

const MIGRATIONS_ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../migrations");
const EXPECTED_TABLES = [
  "email_events",
  "job_field_provenance",
  "jobs",
  "sync_state",
  "users",
];

describe("migrations — SQLite", () => {
  it("applies cleanly to an empty database and creates all five tables", async () => {
    const client = createClient({ url: ":memory:" });
    const db = drizzleSqlite(client);

    await migrateSqlite(db, { migrationsFolder: join(MIGRATIONS_ROOT, "sqlite") });

    const result = await client.execute(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '__drizzle%' ORDER BY name",
    );
    const tables = result.rows.map((r) => String(r.name));
    expect(tables).toEqual(EXPECTED_TABLES);
    client.close();
  });

  it("is idempotent — a second run is a no-op, not an error", async () => {
    const client = createClient({ url: ":memory:" });
    const db = drizzleSqlite(client);
    const folder = join(MIGRATIONS_ROOT, "sqlite");

    await migrateSqlite(db, { migrationsFolder: folder });
    await expect(migrateSqlite(db, { migrationsFolder: folder })).resolves.not.toThrow();
    client.close();
  });
});

describe("migrations — Postgres", () => {
  it("applies cleanly to an empty database and creates all five tables", async () => {
    const pglite = new PGlite();
    const db = drizzlePg(pglite);

    await migratePg(db, { migrationsFolder: join(MIGRATIONS_ROOT, "pg") });

    const result = await db.execute(
      sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`,
    );
    const tables = result.rows.map((r) => String((r as { tablename: string }).tablename));
    expect(tables).toEqual(EXPECTED_TABLES);
    await pglite.close();
  });

  it("enforces the email_events idempotency constraint", async () => {
    // The unique constraint on (user_id, gmail_message_id) is what makes a
    // crashed sync safe to re-read. Assert the database actually enforces it,
    // not merely that the schema declares it.
    const pglite = new PGlite();
    const db = drizzlePg(pglite);
    await migratePg(db, { migrationsFolder: join(MIGRATIONS_ROOT, "pg") });

    const userId = "11111111-1111-4111-8111-111111111111";
    await db.execute(sql`
      INSERT INTO users (id, google_sub, email, anon_key,
        refresh_token_ciphertext, refresh_token_iv, refresh_token_tag)
      VALUES (${userId}, 'sub-1', 'a@b.com', '22222222-2222-4222-8222-222222222222',
        'ct', 'iv', 'tag')
    `);

    const insertEvent = () =>
      db.execute(sql`
        INSERT INTO email_events (user_id, gmail_message_id, gmail_thread_id,
          received_at, confidence, review_status, classifier_model)
        VALUES (${userId}, 'msg-1', 'thread-1', now(), 0.9, 'auto_accepted', 'fake')
      `);

    await insertEvent();
    await expect(insertEvent()).rejects.toThrow();
    await pglite.close();
  });
});
