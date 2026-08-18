import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * T5.1's done-when, as a test: **no hardcoded colour anywhere in the client.**
 *
 * The design system owns colour. Every value comes from a CSS custom property,
 * and a hex code in application code is a defect (rules.md → Design Patterns).
 * A rule nobody checks is a rule that lasts until the first deadline, so this
 * checks it.
 *
 * `src/ds/vendor/` is excluded: it *is* the design system, and it is verified
 * against its source by `ds.sync.test.ts` instead.
 */

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..");
const VENDOR = join(SRC, "ds", "vendor");

/** `#0d253d`, `#fff`, `rgb(...)`, `rgba(...)`, `hsl(...)`, and the CSS named
 *  colours a developer actually reaches for in a hurry. */
const COLOUR_PATTERNS: Array<[string, RegExp]> = [
  ["hex colour", /#[0-9a-fA-F]{3,8}\b/],
  ["rgb()/rgba()", /\brgba?\s*\(/],
  ["hsl()/hsla()", /\bhsla?\s*\(/],
  ["named colour", /\b(?:background|color|borderColor|fill|stroke)\s*:\s*["'](?:red|blue|green|black|white|grey|gray|orange|purple|yellow)["']/],
];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (path.startsWith(VENDOR)) return [];
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry) && !entry.endsWith(".test.ts") ? [path] : [];
  });
}

describe("no hardcoded colour in the client (T5.1)", () => {
  const files = sourceFiles(SRC);

  it("finds application source to check — an empty sweep would pass vacuously", () => {
    expect(files.length).toBeGreaterThan(5);
  });

  for (const [label, pattern] of COLOUR_PATTERNS) {
    it(`contains no ${label}`, () => {
      const offenders = files
        .map((path) => ({ path, line: findMatch(path, pattern) }))
        .filter((r) => r.line !== null)
        .map((r) => `${r.path.slice(SRC.length + 1)}: ${r.line}`);
      expect(offenders).toEqual([]);
    });
  }

  it("catches a colour if one is introduced — the guard is checked in the failing direction", () => {
    const planted = 'const bad = { color: "#533afd" };';
    expect(COLOUR_PATTERNS.some(([, p]) => p.test(planted))).toBe(true);
  });
});

function findMatch(path: string, pattern: RegExp): string | null {
  for (const line of readFileSync(path, "utf8").split("\n")) {
    if (pattern.test(line)) return line.trim();
  }
  return null;
}
