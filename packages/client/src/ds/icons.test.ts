import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { ICONS } from "./icons";

/**
 * The app bundles a hand-picked subset of Lucide rather than all 2,021 glyphs
 * (see `icons.ts`). That is only safe if the subset provably covers every icon
 * the code asks for — otherwise trimming it produces a blank square that no
 * typechecker will catch, because icon names are strings.
 *
 * So: walk the source for every icon name referenced, and require each one.
 */

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..");

/** `icon="x"`, `iconLeft="x"`, `iconRight="x"`, `name="x"` — the four props
 *  that reach `Icon`, in both the app's `.tsx` and the vendored `.jsx`. */
const REFERENCE = /\b(?:icon|iconLeft|iconRight|name)\s*[:=]\s*"([a-z][a-z0-9-]*)"/g;

function pascal(name: string): string {
  return name.replace(/(^|[-_ ])([a-z0-9])/g, (_m, _a, b: string) => b.toUpperCase());
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(tsx?|jsx)$/.test(entry) && !entry.endsWith(".test.ts") ? [path] : [];
  });
}

function referencedIcons(): Map<string, string> {
  const found = new Map<string, string>();
  for (const path of sourceFiles(SRC)) {
    const text = readFileSync(path, "utf8");
    for (const match of text.matchAll(REFERENCE)) {
      const name = match[1];
      if (name) found.set(name, path.slice(SRC.length + 1));
    }
  }
  return found;
}

describe("bundled icon set", () => {
  const referenced = referencedIcons();

  it("finds icon references to check — an empty sweep would pass vacuously", () => {
    expect(referenced.size).toBeGreaterThan(15);
  });

  it("bundles every icon the app and the design system reference by name", () => {
    // `name="..."` also matches form-field names and other unrelated props, so
    // only names that Lucide actually has are required to be bundled. A real
    // icon that is referenced and missing still fails; a stray `name="status"`
    // does not.
    const missing = [...referenced]
      .filter(([name]) => !(pascal(name) in ICONS))
      .filter(([name]) => LUCIDE_NAMES.has(pascal(name)))
      .map(([name, path]) => `${name} (${path})`);
    expect(missing).toEqual([]);
  });

  it("every bundled icon is a real glyph, not an empty placeholder", () => {
    for (const [name, glyph] of Object.entries(ICONS)) {
      expect(Array.isArray(glyph), `${name} is not a node array`).toBe(true);
      expect((glyph as unknown[]).length, `${name} has no nodes`).toBeGreaterThan(0);
    }
  });
});

/** Loaded once, from the full package, purely to tell an icon name apart from
 *  an unrelated `name` prop. Test-only — never imported by the app. */
const LUCIDE_NAMES: Set<string> = new Set(
  Object.keys((await import("lucide")).icons),
);
