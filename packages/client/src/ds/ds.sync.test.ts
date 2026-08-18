import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { SOURCE, TARGET, plannedFiles } from "../../scripts/sync-ds.mjs";

/**
 * The design system lives at the repository root, outside every package, in a
 * folder whose name contains a space. The client keeps a synced copy under
 * `src/ds/vendor/` rather than importing across that boundary.
 *
 * A copy that nobody checks is a copy that rots. This is the same guard the
 * database uses for its two dialect definitions (`schema.parity.test.ts`):
 * drift is a test failure, not a surprise six weeks later.
 *
 * If this fails: `npm run sync:ds -w @gradtracker/client`.
 */

describe("design system vendor copy", () => {
  const planned = plannedFiles();

  it("copies something at all — a silent empty sync would pass every other check", () => {
    expect(planned.length).toBeGreaterThan(50);
  });

  it("has every source file present in the vendored copy", () => {
    const missing = planned.filter((rel) => !existsSync(join(TARGET, rel)));
    expect(missing).toEqual([]);
  });

  it("has no vendored file that differs from its source", () => {
    const drifted = planned.filter((rel) => {
      const dest = join(TARGET, rel);
      if (!existsSync(dest)) return false; // reported by the test above
      return readFileSync(join(SOURCE, rel)).compare(readFileSync(dest)) !== 0;
    });
    expect(drifted).toEqual([]);
  });

  it("vendors the six stage colours, which are the one thing the app may not re-define", () => {
    const stages = readFileSync(join(TARGET, "tokens/stages.css"), "utf8");
    for (const stage of ["applied", "assessment", "interview", "offer", "rejected", "withdrawn"]) {
      expect(stages).toContain(`--stage-${stage}-bg`);
      expect(stages).toContain(`--stage-${stage}-fg`);
    }
  });
});
