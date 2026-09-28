import { readMailboxes } from "../mailbox/reader.js";
import { buildInventory, formatInventory } from "./inventory.js";
import { exportSheet, importSheet, LabelError } from "./sheet.js";
import { verifyManifest } from "./freeze.js";
import { compareSheets, formatAgreement } from "./agreement.js";
import { InsideRepositoryError } from "./guard.js";

/**
 * The labelling toolkit (T2.11).
 *
 *   npm run label -- inventory <export...>
 *   npm run label -- export    <export...> --out <sheet.xlsx> [--sample <n>] [--seed <text>]
 *   npm run label -- import    <sheet.xlsx> --out <folder> [--tuning <n>] [--seed <text>]
 *   npm run label -- agreement <sheet-a.xlsx> <sheet-b.xlsx>
 *   npm run label -- verify    <held-out folder>
 *
 * An <export> is a Google Takeout .mbox, a .eml file, or a folder of either.
 * The rules for labelling are in docs/labelling-guide.md.
 */

const USAGE = `Usage:
  npm run label -- inventory <export...>
  npm run label -- export    <export...> --out <sheet.xlsx> [--sample <n>] [--seed <text>]
  npm run label -- import    <sheet.xlsx> --out <folder> [--tuning <n>] [--seed <text>]
  npm run label -- agreement <sheet-a.xlsx> <sheet-b.xlsx>
  npm run label -- verify    <held-out folder>

An <export> is a Google Takeout .mbox, a .eml file, or a folder of either.
Anything written contains real email, so it must be outside the repository.
The labelling rules are in docs/labelling-guide.md.`;

interface Parsed {
  command: string;
  positional: string[];
  flags: Map<string, string>;
}

export function parseArgs(argv: string[]): Parsed {
  const [command = "", ...rest] = argv;
  const positional: string[] = [];
  const flags = new Map<string, string>();
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i]!;
    if (arg.startsWith("--")) {
      const [name, inline] = arg.slice(2).split("=", 2) as [string, string | undefined];
      const value = inline ?? rest[i + 1];
      if (value === undefined || (inline === undefined && value.startsWith("--"))) {
        throw new Error(`--${name} needs a value.`);
      }
      flags.set(name, value);
      if (inline === undefined) i += 1;
    } else {
      positional.push(arg);
    }
  }
  return { command, positional, flags };
}

function wholeNumber(flags: Map<string, string>, name: string): number | undefined {
  const raw = flags.get(name);
  if (raw === undefined) return undefined;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0) throw new Error(`--${name} must be a whole number, not "${raw}".`);
  return n;
}

function required(value: string | undefined, what: string): string {
  if (!value) throw new Error(`Missing ${what}.\n\n${USAGE}`);
  return value;
}

export async function run(argv: string[], log: (line: string) => void = console.log): Promise<number> {
  const { command, positional, flags } = parseArgs(argv);

  switch (command) {
    case "inventory": {
      required(positional[0], "an export to read");
      log(formatInventory(buildInventory(await readMailboxes(positional))));
      return 0;
    }

    case "export": {
      required(positional[0], "an export to read");
      const out = required(flags.get("out"), "--out <sheet.xlsx>");
      const read = await readMailboxes(positional);
      const sample = wholeNumber(flags, "sample");
      const seed = flags.get("seed");
      const result = await exportSheet(read.emails, out, {
        ...(sample !== undefined ? { sample } : {}),
        ...(seed !== undefined ? { seed } : {}),
      });
      log(`Wrote ${result.rows} emails to ${out}`);
      if (result.duplicates) log(`  ${result.duplicates} duplicate copies left out`);
      if (read.skipped.length) log(`  ${read.skipped.length} unreadable messages skipped`);
      if (result.truncated) log(`  ${result.truncated} bodies cut to fit a spreadsheet cell (see body_truncated)`);
      return 0;
    }

    case "import": {
      const sheet = required(positional[0], "a labelled sheet");
      const out = required(flags.get("out"), "--out <folder>");
      const tuning = wholeNumber(flags, "tuning");
      const seed = flags.get("seed");
      const result = await importSheet(sheet, out, {
        ...(tuning !== undefined ? { tuning } : {}),
        ...(seed !== undefined ? { seed } : {}),
      });
      for (const set of result.sets) {
        log(`${set.name.padEnd(9)} ${String(set.fixtures).padStart(4)} fixtures (${set.applications} applications) → ${set.dir}`);
      }
      if (result.unlabelled) log(`${result.unlabelled} unlabelled rows skipped`);
      if (result.sets.some((s) => s.name === "held-out")) {
        log("The held-out set is frozen: MANIFEST.json holds a hash of every file.");
        log("Check it with `npm run label -- verify <held-out folder>` before every measurement.");
      }
      return 0;
    }

    case "agreement": {
      const a = required(positional[0], "the first labeller's sheet");
      const b = required(positional[1], "the second labeller's sheet");
      log(formatAgreement(await compareSheets(a, b)));
      return 0;
    }

    case "verify": {
      const dir = required(positional[0], "a held-out folder");
      const result = verifyManifest(dir);
      if (result.ok) {
        log(`Frozen set intact — digest ${result.digest}`);
        return 0;
      }
      log("The held-out set has changed since it was frozen:");
      for (const problem of result.problems) log(`  ${problem}`);
      return 1;
    }

    default:
      log(USAGE);
      return command === "" || command === "help" ? 0 : 1;
  }
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("labelling/cli.js")) {
  run(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (error: unknown) => {
      const known = error instanceof LabelError || error instanceof InsideRepositoryError;
      console.error(known ? (error as Error).message : error);
      process.exit(1);
    },
  );
}
