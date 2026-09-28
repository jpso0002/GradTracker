import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Classification, Fixture } from "@gradtracker/shared";
import type { EmailClassifier, RawEmail } from "../ports/index.js";
import { loadCorpus } from "../corpus/loader.js";
import { FakeEmailClassifier } from "../adapters/classifier/fake.js";
import { PROMPT_VERSION } from "../adapters/classifier/prompt.js";
import { buildReport, type Scored } from "./metrics.js";
import { formatReport } from "./report.js";
import { MANIFEST, verifyManifest } from "../labelling/freeze.js";

/**
 * The accuracy gate (T2.6).
 *
 *   npm run accuracy                     self-test against the fake
 *   npm run accuracy -- --demo           injected errors, to see the report shape
 *   npm run accuracy -- --live           the real model (T2.8, needs an API key)
 *   npm run accuracy -- --corpus <dir>   a labelled set made with the labelling
 *                                        toolkit (T2.11), outside the repository
 *
 * **Exits non-zero when a threshold fails**, which is what makes this a CI gate
 * rather than a report someone reads once and forgets.
 */

export interface HarnessOptions {
  classifier: EmailClassifier;
  fixtures: Fixture[];
  model: string;
  isSelfTest: boolean;
}

function toRawEmail(fixture: Fixture): RawEmail {
  return {
    gmailMessageId: fixture.email.gmailMessageId,
    gmailThreadId: fixture.email.gmailThreadId,
    receivedAt: new Date(fixture.email.receivedAt),
    fromAddress: fixture.email.fromAddress,
    subject: fixture.email.subject,
    body: fixture.email.body,
  };
}

export async function runHarness(options: HarnessOptions): Promise<{ output: string; passed: boolean }> {
  const scored: Scored[] = [];

  for (const fixture of options.fixtures) {
    const predicted = await options.classifier.classify(toRawEmail(fixture));
    scored.push({ fixture, predicted });
  }

  const report = buildReport(scored);
  const output = formatReport(report, {
    promptVersion: PROMPT_VERSION,
    model: options.model,
    isSelfTest: options.isSelfTest,
  });

  return { output, passed: report.passed };
}

/**
 * A plausible error pattern for `--demo`.
 *
 * Modelled on how this classifier is actually expected to fail rather than on
 * random noise: the hard negatives that name pipeline companies get mistaken
 * for applications, an informal human email gets missed, and a couple of
 * relative deadlines land on the wrong day.
 */
export function demoCorruption(correct: Classification, fixtureId: string): Classification {
  // Hard negatives naming companies already in the pipeline — the case the
  // corpus exists to test.
  if (["059-seek-recommendations", "061-monash-careers-newsletter"].includes(fixtureId)) {
    return { ...correct, isApplication: true, company: "REA Group", confidence: 0.55 };
  }

  // An informal human email missed — a false negative, the costly direction.
  if (["039-xero-chat", "063-recruiter-cold-outreach"].includes(fixtureId)) {
    return { ...correct, isApplication: false, company: null, role: null, stage: null, deadlineAt: null, confidence: 0.38 };
  }

  // Relative deadlines resolved to the wrong day.
  if (["023-deloitte-immersive", "045-zip-offer"].includes(fixtureId) && correct.deadlineAt) {
    const wrong = new Date(correct.deadlineAt);
    wrong.setUTCDate(wrong.getUTCDate() + 2);
    return { ...correct, deadlineAt: wrong.toISOString() };
  }

  // A deadline invented where none was stated.
  if (fixtureId === "034-macquarie-panel") {
    return { ...correct, deadlineAt: "2026-06-18T04:00:00.000Z" };
  }

  return correct;
}

export class CorpusChoiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CorpusChoiceError";
  }
}

/**
 * Which fixtures to score: the repository's corpus, or `--corpus <dir>` (also
 * `--corpus=<dir>`) — a set made by the labelling toolkit, outside the
 * repository.
 *
 * A frozen held-out set is checked against its freeze before it is loaded, and
 * refused if anything changed: a held-out set edited after a model has been run
 * on it is no longer held-out, and its figure would be a tuning figure (D32).
 */
export function selectCorpus(args: string[]): { fixtures: Fixture[]; header: string[] } {
  const i = args.findIndex((a) => a === "--corpus" || a.startsWith("--corpus="));
  if (i === -1) return { fixtures: loadCorpus(), header: [] };

  const arg = args[i]!;
  const dir = arg.startsWith("--corpus=") ? arg.slice("--corpus=".length) : args[i + 1];
  // Without this, a missing folder would silently score the default corpus
  // and report its figure as if it were the one asked for.
  if (dir === undefined || dir === "" || dir.startsWith("--")) {
    throw new CorpusChoiceError("--corpus needs a folder: npm run accuracy -- --corpus <folder>");
  }

  if (!existsSync(join(dir, "emails")) && existsSync(join(dir, "held-out"))) {
    throw new CorpusChoiceError(
      `${dir} holds a tuning/held-out split. Point --corpus at ${join(dir, "tuning")} or ${join(dir, "held-out")}.`,
    );
  }

  const header: string[] = [];
  if (existsSync(join(dir, MANIFEST))) {
    const verification = verifyManifest(dir);
    if (!verification.ok) {
      throw new CorpusChoiceError(
        [
          "Refusing to score: this held-out set has changed since it was frozen.",
          ...verification.problems.map((p) => `  ${p}`),
        ].join("\n"),
      );
    }
    header.push(`Frozen held-out set, unchanged since freezing — digest ${verification.digest}`);
  }

  const fixtures = loadCorpus(dir);
  header.push(`Corpus: ${dir} (${fixtures.length} fixtures)`);
  return { fixtures, header };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const live = args.includes("--live");
  const demo = args.includes("--demo");

  let selected: ReturnType<typeof selectCorpus>;
  try {
    selected = selectCorpus(args);
  } catch (error) {
    if (!(error instanceof CorpusChoiceError)) throw error;
    console.error(error.message);
    process.exit(1);
  }
  const { fixtures } = selected;
  for (const line of selected.header) console.log(line);

  if (live) {
    console.error(
      [
        "Live mode is not wired up yet (task T2.8, blocked on B3 — the Anthropic API key).",
        "The live classifier adapter lands at T7.3.",
        "",
        "Until then the corpus and the gate are exercised against the fake:",
        "  npm run accuracy          self-test",
        "  npm run accuracy -- --demo   report shape with injected errors",
      ].join("\n"),
    );
    process.exit(2);
  }

  // `--invert` exists so the CI gate can be verified from the command line
  // rather than only in a unit test: a gate that has never been observed
  // failing is not known to be a gate. It should always exit 1.
  const invert = args.includes("--invert");

  const classifier = new FakeEmailClassifier({
    fixtures,
    ...(invert
      ? { corrupt: (truth: Classification) => ({ ...truth, isApplication: !truth.isApplication }) }
      : demo
        ? { corrupt: demoCorruption }
        : {}),
  });

  const { output, passed } = await runHarness({
    classifier,
    fixtures,
    model: invert ? "fake (inverted — gate check)" : demo ? "fake (errors injected)" : "fake",
    isSelfTest: true,
  });

  console.log(output);
  process.exit(passed ? 0 : 1);
}

// Only run when invoked directly, so the module can be imported by tests.
if (process.argv[1]?.includes("accuracy")) {
  main().catch((error: unknown) => {
    console.error("Accuracy harness failed:", error);
    process.exit(1);
  });
}
