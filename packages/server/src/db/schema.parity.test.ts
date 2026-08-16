import { describe, it, expect } from "vitest";
import { getTableConfig as pgConfig } from "drizzle-orm/pg-core";
import { getTableConfig as sqliteConfig } from "drizzle-orm/sqlite-core";
import { pgSchema } from "./schema.pg.js";
import { sqliteSchema } from "./schema.sqlite.js";

/**
 * Drizzle requires one table definition per dialect, so the schema exists
 * twice. Two hand-maintained copies drift silently — a column added to
 * Postgres and forgotten in SQLite means tests pass locally and production
 * breaks. These assertions make drift a CI failure instead.
 */

type Shape = {
  name: string;
  columns: { name: string; notNull: boolean; primary: boolean }[];
  indexes: string[];
};

/**
 * Only indexes we declared by name are compared. SQLite materialises a
 * column-level `.unique()` as an auto-named index (`users_google_sub_unique`)
 * while Postgres makes it a table constraint that never appears in
 * `config.indexes` — a dialect artifact, not schema drift. Uniqueness parity
 * is asserted separately, by column, below.
 */
const isDeclaredIndex = (name: string | undefined): name is string =>
  !!name && (name.endsWith("_idx") || name.endsWith("_uq"));

function pgShape(table: Parameters<typeof pgConfig>[0]): Shape {
  const c = pgConfig(table);
  return {
    name: c.name,
    columns: c.columns
      .map((col) => ({ name: col.name, notNull: col.notNull, primary: col.primary }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    indexes: c.indexes.map((i) => i.config.name).filter(isDeclaredIndex).sort(),
  };
}

function sqliteShape(table: Parameters<typeof sqliteConfig>[0]): Shape {
  const c = sqliteConfig(table);
  return {
    name: c.name,
    columns: c.columns
      .map((col) => ({ name: col.name, notNull: col.notNull, primary: col.primary }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    indexes: c.indexes.map((i) => i.config.name).filter(isDeclaredIndex).sort(),
  };
}

/** Columns carrying a uniqueness guarantee, however the dialect expresses it. */
function pgUniqueColumns(table: Parameters<typeof pgConfig>[0]): string[] {
  const c = pgConfig(table);
  const fromColumns = c.columns.filter((col) => col.isUnique).map((col) => col.name);
  const fromIndexes = c.indexes
    .filter((i) => i.config.unique)
    .flatMap((i) => i.config.columns.map((col) => ("name" in col ? col.name : "")));
  return [...new Set([...fromColumns, ...fromIndexes])].sort();
}

function sqliteUniqueColumns(table: Parameters<typeof sqliteConfig>[0]): string[] {
  const c = sqliteConfig(table);
  const fromColumns = c.columns.filter((col) => col.isUnique).map((col) => col.name);
  const fromIndexes = c.indexes
    .filter((i) => i.config.unique)
    .flatMap((i) => i.config.columns.map((col) => (typeof col === "object" && "name" in col ? col.name : "")));
  return [...new Set([...fromColumns, ...fromIndexes])].sort();
}

const TABLE_KEYS = Object.keys(pgSchema) as (keyof typeof pgSchema)[];

describe("schema parity between Postgres and SQLite", () => {
  it("defines the same set of tables in both dialects", () => {
    expect(Object.keys(sqliteSchema).sort()).toEqual(Object.keys(pgSchema).sort());
  });

  it("declares the five tables from implementation.md §4", () => {
    const names = TABLE_KEYS.map((k) => pgShape(pgSchema[k]).name).sort();
    expect(names).toEqual([
      "email_events",
      "job_field_provenance",
      "jobs",
      "sync_state",
      "users",
    ]);
  });

  for (const key of TABLE_KEYS) {
    describe(`${key}`, () => {
      it("has identical column names and nullability in both dialects", () => {
        const pg = pgShape(pgSchema[key]);
        const lite = sqliteShape(sqliteSchema[key]);
        expect(lite.name).toBe(pg.name);
        expect(lite.columns).toEqual(pg.columns);
      });

      it("has identical declared index names in both dialects", () => {
        expect(sqliteShape(sqliteSchema[key]).indexes).toEqual(
          pgShape(pgSchema[key]).indexes,
        );
      });

      it("guarantees uniqueness on the same columns in both dialects", () => {
        expect(sqliteUniqueColumns(sqliteSchema[key])).toEqual(
          pgUniqueColumns(pgSchema[key]),
        );
      });
    });
  }
});

describe("schema invariants", () => {
  it("scopes every table to a user, directly or through a job", () => {
    // Every query is scoped to req.user.id. A table with no path to a user
    // cannot be scoped, so this catches the mistake at schema-definition time.
    for (const key of TABLE_KEYS) {
      const cols = pgShape(pgSchema[key]).columns.map((c) => c.name);
      const scoped = cols.includes("user_id") || cols.includes("job_id") || cols.includes("id");
      expect(scoped, `${key} has no user or job scoping column`).toBe(true);
    }
  });

  it("gives email_events the unique constraint that makes re-reads idempotent", () => {
    const uniques = pgConfig(pgSchema.emailEvents)
      .indexes.filter((i) => i.config.unique)
      .map((i) => i.config.columns.map((c) => ("name" in c ? c.name : "")).sort());
    expect(uniques).toContainEqual(["gmail_message_id", "user_id"]);
  });

  it("defaults the review threshold to the documented 0.75", () => {
    const col = pgConfig(pgSchema.users).columns.find((c) => c.name === "review_threshold");
    expect(col?.default).toBe(0.75);
  });
});
