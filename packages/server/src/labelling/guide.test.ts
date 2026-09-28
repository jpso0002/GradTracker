import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { StageEnum } from "@gradtracker/shared";
import { STAGE_DEFINITIONS, buildSystemPrompt } from "../adapters/classifier/prompt.js";
import { REPOSITORY_ROOT } from "./guard.js";

/**
 * The labelling guide (T2.12) must say what the prompt says. Labellers and the
 * model share one definition of each stage; if the prompt changes and the guide
 * does not, labels and model drift apart silently, and every figure measured
 * against those labels is off by the difference — with nothing to show it.
 */

const guide = readFileSync(join(REPOSITORY_ROOT, "docs", "labelling-guide.md"), "utf8").replace(/\r\n/g, "\n");
const prompt = buildSystemPrompt(new Date("2026-01-01T00:00:00Z"));

describe("the labelling guide", () => {
  it("quotes all six stage definitions verbatim, each beside its stage", () => {
    const lines = guide.split("\n");
    for (const stage of StageEnum.options) {
      const row = lines.find((line) => line.includes(`\`${stage}\``) && line.includes(STAGE_DEFINITIONS[stage]));
      expect(row, `the guide's definition of "${stage}" is missing or differs from prompt.ts`).toBeDefined();
    }
  });

  it("quotes the prompt word for word wherever it quotes it", () => {
    // The guide's convention: a grey quote box holds the prompt's own words.
    const quotes = guide
      .split("\n")
      .filter((line) => line.startsWith(">"))
      .map((line) => line.replace(/^>\s?/, "").trim())
      .filter((line) => line !== "");

    expect(quotes.length).toBeGreaterThanOrEqual(10);
    for (const quote of quotes) {
      expect(prompt.includes(quote), `quoted in the guide but not in the prompt: "${quote}"`).toBe(true);
    }
  });
});
