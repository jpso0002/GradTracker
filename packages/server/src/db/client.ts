import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { sqliteSchema } from "./schema.sqlite.js";

/**
 * Database handle. SQLite via libsql for development and test; the Postgres
 * server driver arrives with deployment (T8.5). The schema is verified against
 * both engines on every test run — see migrate.test.ts.
 */

export type Database = ReturnType<typeof drizzle<typeof sqliteSchema>>;

export interface DatabaseHandle {
  db: Database;
  close: () => void;
}

export function createDatabase(url: string): DatabaseHandle {
  const client: Client = createClient({ url });
  return {
    db: drizzle(client, { schema: sqliteSchema }),
    close: () => client.close(),
  };
}

/** In-memory database for tests. Each call is an isolated database. */
export function createTestDatabase(): DatabaseHandle {
  return createDatabase(":memory:");
}
