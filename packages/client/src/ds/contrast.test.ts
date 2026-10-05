import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * T6.5 — colour contrast, computed from the design system's own token files
 * with the WCAG 2.1 formula. Until this test, nothing in the repository checked
 * contrast (RQ-09 claimed the design system "enforces" it).
 *
 * Two lists. **Required** pairs are the ones GradTracker's screens put text or
 * a control boundary on, and must pass: 4.5:1 for text, 3:1 for a component
 * boundary or indicator (1.4.3, 1.4.11). **Known failures** are the design
 * system's own pairs that do not pass today — recorded in
 * docs/accessibility-audit.md, and pinned here as failing, so that a token fix
 * at the source flips this test and the entry is removed rather than forgotten.
 */

const TOKENS = join(dirname(fileURLToPath(import.meta.url)), "vendor", "tokens");
const css = ["colors.css", "stages.css"].map((file) => readFileSync(join(TOKENS, file), "utf8")).join("\n");

function declarations(selector: string): Record<string, string> {
  const out: Record<string, string> = {};
  const escaped = selector.replace(/[[\]"=]/g, "\\$&");
  for (const block of css.matchAll(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`, "g"))) {
    for (const declaration of block[1]!.replace(/\/\*[\s\S]*?\*\//g, "").split(";")) {
      const colon = declaration.indexOf(":");
      if (colon > 0) out[declaration.slice(0, colon).trim()] = declaration.slice(colon + 1).trim();
    }
  }
  return out;
}

const THEMES = {
  light: declarations(":root"),
  dark: { ...declarations(":root"), ...declarations('[data-theme="dark"]') },
};
type Theme = keyof typeof THEMES;

function hex(theme: Theme, token: string, depth = 0): string {
  const value = THEMES[theme][token];
  if (value === undefined) throw new Error(`${token} is not defined in the ${theme} theme`);
  const reference = /^var\((--[a-z0-9-]+)\)$/.exec(value);
  if (reference) {
    if (depth > 10) throw new Error(`${token} refers to itself`);
    return hex(theme, reference[1]!, depth + 1);
  }
  if (!/^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(value)) throw new Error(`${token} is not an opaque colour: ${value}`);
  return value;
}

function luminance(colour: string): number {
  const digits = colour.slice(1);
  const full = digits.length === 3 ? [...digits].map((d) => d + d).join("") : digits;
  const channel = (i: number) => {
    const c = parseInt(full.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
}

export function contrast(theme: Theme, foreground: string, background: string): number {
  const [a, b] = [luminance(hex(theme, foreground)), luminance(hex(theme, background))].sort((x, y) => y - x);
  return (a! + 0.05) / (b! + 0.05);
}

const TEXT = 4.5;
const BOUNDARY = 3;
const BOTH: Theme[] = ["light", "dark"];

/** [themes, foreground, background, minimum, where the app uses it] */
const REQUIRED: Array<[Theme[], string, string, number, string]> = [
  [BOTH, "--text-body", "--surface-page", TEXT, "body text"],
  [BOTH, "--text-body", "--surface-card", TEXT, "panel and card text"],
  [BOTH, "--text-body", "--surface-sunken", TEXT, "offline banner"],
  [BOTH, "--text-heading", "--surface-page", TEXT, "headings, company names"],
  [BOTH, "--text-heading", "--surface-selected", TEXT, "the selected row's company"],
  [BOTH, "--text-secondary", "--surface-card", TEXT, "Tag text — Edited, Review required"],
  [BOTH, "--text-muted", "--surface-page", TEXT, "row captions, descriptions"],
  [BOTH, "--text-muted", "--surface-card", TEXT, "field labels in the panel and review cards"],
  [BOTH, "--text-nav", "--surface-sunken", TEXT, "sidebar items, demo-mode note"],
  [BOTH, "--text-nav", "--surface-card", TEXT, "the phone's tab bar"],
  [BOTH, "--text-secondary", "--surface-selected", TEXT, "a selected card's role and next action"],
  [BOTH, "--text-secondary", "--surface-hover", TEXT, "a hovered card's role and next action"],
  [BOTH, "--text-link", "--surface-card", TEXT, "Open in Gmail"],
  [BOTH, "--text-on-primary", "--accent-primary", TEXT, "primary buttons"],
  [BOTH, "--accent-primary", "--surface-card", BOUNDARY, "the active tab's underline"],
  ...(["applied", "assessment", "interview", "offer", "rejected", "withdrawn"] as const).map(
    (stage): [Theme[], string, string, number, string] => [BOTH, `--stage-${stage}-fg`, `--stage-${stage}-bg`, TEXT, `${stage} badge`],
  ),
];

/** The design system's pairs that fail today (docs/accessibility-audit.md). */
const KNOWN_FAILURES: Array<[Theme, string, string, number, string]> = [
  ["light", "--text-muted", "--surface-sunken", TEXT, "sidebar section headings"],
  ["light", "--text-muted", "--surface-hover", TEXT, "a hovered row's role"],
  ["light", "--text-muted", "--surface-selected", TEXT, "the selected row's role"],
  ["dark", "--text-on-primary", "--accent-primary-hover", TEXT, "a hovered primary button"],
  ["dark", "--ruby-deep", "--surface-card", TEXT, "Input's error text"],
  ["dark", "--indigo-700", "--accent-primary-subdued", TEXT, "Badge tone ai — not used by the app"],
  ["dark", "--indigo-600", "--accent-primary-wash", TEXT, "Badge tone indigo — not used by the app"],
  ["light", "--border-input", "--surface-card", BOUNDARY, "input and select borders"],
  ["dark", "--border-input", "--surface-card", BOUNDARY, "input and select borders"],
];

describe("colour contrast, from the token files (T6.5, WCAG 2.1 AA)", () => {
  it("found tokens to check — an empty parse would pass vacuously", () => {
    expect(Object.keys(THEMES.light).length).toBeGreaterThan(40);
    expect(THEMES.dark["--surface-page"]).not.toBe(THEMES.light["--surface-page"]);
  });

  it("computes the WCAG ratio correctly", () => {
    // Black on white is 21:1 by definition; ink on white is the system's body text.
    THEMES.light["--test-black"] = "#000000";
    expect(contrast("light", "--test-black", "--white")).toBeCloseTo(21, 5);
  });

  for (const [themes, foreground, background, minimum, use] of REQUIRED) {
    for (const theme of themes) {
      it(`${theme}: ${foreground} on ${background} reaches ${minimum}:1 (${use})`, () => {
        expect(contrast(theme, foreground, background)).toBeGreaterThanOrEqual(minimum);
      });
    }
  }

  // The focus ring is translucent, so it is composited over the surface first.
  // A 3px glow at 28% (light) and 36% (dark) is visible, but under the 3:1 a
  // focus indicator needs against what surrounds it (1.4.11).
  for (const theme of BOTH) {
    it(`${theme}: the focus ring is still below 3:1 against a card — a design-system fix`, () => {
      const ring = /rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/.exec(THEMES[theme]["--focus-ring"]!)!;
      const [r, g, b, alpha] = [Number(ring[1]), Number(ring[2]), Number(ring[3]), Number(ring[4])];
      const card = hex(theme, "--surface-card").slice(1);
      const under = [0, 2, 4].map((i) => parseInt(card.slice(i, i + 2), 16));
      const blended = [r, g, b].map((c, i) => Math.round(c * alpha + under[i]! * (1 - alpha)));
      THEMES[theme]["--test-ring"] = `#${blended.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
      expect(contrast(theme, "--test-ring", "--surface-card")).toBeLessThan(BOUNDARY);
    });
  }

  for (const [theme, foreground, background, minimum, use] of KNOWN_FAILURES) {
    it(`${theme}: ${foreground} on ${background} is still below ${minimum}:1 (${use}) — a design-system fix`, () => {
      // When this fails, the source was fixed: delete the entry here and in
      // docs/accessibility-audit.md.
      expect(contrast(theme, foreground, background)).toBeLessThan(minimum);
    });
  }
});
