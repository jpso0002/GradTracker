import { readFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, basename } from "node:path";
import {
  FixtureEmailSchema,
  ExpectedClassificationSchema,
  type Fixture,
} from "@gradtracker/shared";

/**
 * Loads and validates the labelled fixture corpus.
 *
 * Ground truth is validated on load, not trusted. A mislabelled fixture — one
 * that says "not an application" while also naming a company — would silently
 * corrupt every precision and recall figure derived from it, and the resulting
 * number would look perfectly reasonable. Better to refuse to load.
 */

/** Resolved once, here, so no other file has to count `../` levels. Works
 *  identically from `src/` (tests) and `dist/` (built), since both sit four
 *  levels below the repository root. */
const DEFAULT_CORPUS_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../fixtures",
);

export function corpusDir(): string {
  return process.env["FIXTURES_DIR"] ?? DEFAULT_CORPUS_DIR;
}

export class CorpusError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CorpusError";
  }
}

/**
 * Loads every fixture, sorted by id so ordering is deterministic across
 * platforms — Windows and Linux enumerate directories differently, and an
 * accuracy figure that depends on the machine is not a figure.
 */
export function loadCorpus(dir: string = corpusDir()): Fixture[] {
  const emailsDir = join(dir, "emails");
  const expectedDir = join(dir, "expected");

  if (!existsSync(emailsDir) || !existsSync(expectedDir)) {
    throw new CorpusError(
      `Corpus not found at ${dir}. Expected ${emailsDir} and ${expectedDir} to exist.`,
    );
  }

  const emailFiles = readdirSync(emailsDir)
    .filter((f) => f.endsWith(".json"))
    .sort();

  const fixtures: Fixture[] = [];
  const problems: string[] = [];

  for (const file of emailFiles) {
    const id = basename(file, ".json");

    const emailResult = FixtureEmailSchema.safeParse(readJson(join(emailsDir, file), problems, id));
    if (!emailResult.success) {
      problems.push(`${id}: email invalid — ${formatIssues(emailResult.error)}`);
      continue;
    }

    if (emailResult.data.id !== id) {
      problems.push(`${id}: the "id" field says "${emailResult.data.id}" but the filename says "${id}".`);
      continue;
    }

    const expectedPath = join(expectedDir, file);
    if (!existsSync(expectedPath)) {
      problems.push(`${id}: has an email but no label in expected/. Every fixture needs both.`);
      continue;
    }

    const expectedResult = ExpectedClassificationSchema.safeParse(
      readJson(expectedPath, problems, id),
    );
    if (!expectedResult.success) {
      problems.push(`${id}: label invalid — ${formatIssues(expectedResult.error)}`);
      continue;
    }

    fixtures.push({ email: emailResult.data, expected: expectedResult.data });
  }

  // Labels with no email are just as broken as emails with no label, and are
  // easy to leave behind when renaming a fixture.
  for (const file of readdirSync(expectedDir).filter((f) => f.endsWith(".json"))) {
    if (!existsSync(join(emailsDir, file))) {
      problems.push(`${basename(file, ".json")}: has a label but no email in emails/.`);
    }
  }

  if (problems.length > 0) {
    throw new CorpusError(
      `The fixture corpus has ${problems.length} problem(s):\n  ${problems.join("\n  ")}`,
    );
  }

  return fixtures;
}

function readJson(path: string, problems: string[], id: string): unknown {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    problems.push(`${id}: not valid JSON — ${(error as Error).message}`);
    return undefined;
  }
}

function formatIssues(error: { issues: { path: PropertyKey[]; message: string }[] }): string {
  return error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join("; ");
}

/** Summary counts, for the harness header and for sanity-checking corpus
 *  composition as it grows toward 80. */
export function corpusStats(fixtures: Fixture[]) {
  const positives = fixtures.filter((f) => f.expected.isApplication);
  return {
    total: fixtures.length,
    positives: positives.length,
    negatives: fixtures.length - positives.length,
    deadlineBearing: fixtures.filter((f) => f.expected.hasExplicitDeadlineLanguage).length,
  };
}
