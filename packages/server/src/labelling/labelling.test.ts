import { describe, it, expect, beforeEach, afterEach } from "vitest";
import ExcelJS from "exceljs";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readMailboxes } from "../mailbox/reader.js";
import { loadCorpus } from "../corpus/loader.js";
import { FakeEmailClassifier } from "../adapters/classifier/fake.js";
import { runHarness, selectCorpus, CorpusChoiceError } from "../harness/accuracy.js";
import { STAGE_DEFINITIONS } from "../adapters/classifier/prompt.js";
import { exportSheet, importSheet, readSheet, LabelError, HEADERS } from "./sheet.js";
import { verifyManifest } from "./freeze.js";
import { REPOSITORY_ROOT, InsideRepositoryError, assertOutsideRepository } from "./guard.js";
import { buildInventory, formatInventory } from "./inventory.js";
import { run, parseArgs } from "./cli.js";

/**
 * T2.11 — the labelling toolkit. Every email here is synthetic and every file
 * is written to a temporary directory outside the repository, which is the
 * rule the toolkit itself enforces.
 */

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "gt-label-"));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

interface Spec {
  id: string;
  from: string;
  subject: string;
  date: string;
  body: string;
}

function mbox(specs: Spec[]): string {
  return specs
    .map((s) =>
      [
        `From ${s.id} ${s.date}`,
        `From: ${s.from}`,
        `Subject: ${s.subject}`,
        `Date: ${s.date}`,
        `Message-ID: <${s.id}>`,
        "Content-Type: text/plain; charset=utf-8",
        "",
        s.body,
        "",
      ].join("\n"),
    )
    .join("\n");
}

const EMAILS: Spec[] = [
  {
    id: "kpmg-1@smartrecruiters.test",
    from: "KPMG <noreply@smartrecruiters.com>",
    subject: "Your KPMG application has been submitted",
    date: "Mon, 09 Mar 2026 10:55:57 +0000",
    body: "Thank you for applying to the KPMG Graduate Program.",
  },
  {
    id: "pwc-1@criteriacorp.test",
    from: "PwC Early Careers <do-not-reply@criteriacorp.com>",
    subject: "PwC Early Careers - Reminder to complete your online assessments",
    date: "Fri, 13 Mar 2026 02:32:13 +0000",
    body: "Deadline: Saturday, March 14 2026, 01:29 PM AEDT. Start assessment.",
  },
  {
    id: "seek-1@seek.test",
    from: "SEEK <jobmail@s.seek.com.au>",
    subject: "12 new graduate jobs for you",
    date: "Sat, 14 Mar 2026 21:00:00 +0000",
    body: "KPMG and PwC are hiring. Applications close 30 March.",
  },
  {
    id: "spotify-1@spotify.test",
    from: "Spotify <no-reply@spotify.com>",
    subject: "Your receipt",
    date: "Sun, 15 Mar 2026 09:00:00 +0000",
    body: "Thanks for your payment.",
  },
];

async function exportFixture(specs: Spec[] = EMAILS) {
  const source = join(dir, "All mail.mbox");
  writeFileSync(source, mbox(specs));
  const read = await readMailboxes([source]);
  const sheet = join(dir, "labels.xlsx");
  await exportSheet(read.emails, sheet);
  return { sheet, read };
}

/** Fills cells the way a labeller would — through the spreadsheet itself. */
async function label(sheetPath: string, labels: Record<string, Partial<Record<keyof typeof HEADERS, string>>>) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(sheetPath);
  const sheet = workbook.getWorksheet("Label")!;
  const col = new Map<string, number>();
  sheet.getRow(1).eachCell((cell, n) => col.set(String(cell.value), n));
  sheet.eachRow((row, n) => {
    if (n === 1) return;
    const id = String(row.getCell(col.get(HEADERS.messageId)!).value);
    for (const [key, value] of Object.entries(labels[id] ?? {})) {
      row.getCell(col.get(HEADERS[key as keyof typeof HEADERS])!).value = value;
    }
  });
  await workbook.xlsx.writeFile(sheetPath);
}

const FULL_LABELS = {
  "kpmg-1@smartrecruiters.test": { isApplication: "yes", company: "KPMG", role: "Graduate Program", stage: "applied" },
  "pwc-1@criteriacorp.test": {
    isApplication: "yes",
    company: "PwC",
    role: "Early Careers",
    stage: "assessment",
    deadlineLanguage: "yes",
    deadline: "2026-03-14 13:29",
    deadlineTimezone: "Australia/Melbourne",
  },
  "seek-1@seek.test": { isApplication: "no", notes: "Job alert naming live applications" },
  "spotify-1@spotify.test": { isApplication: "no" },
};

describe("the round trip (T2.11 done-when)", () => {
  it("takes a Takeout .mbox to a spreadsheet and back into fixtures the harness scores", async () => {
    const { sheet } = await exportFixture();
    await label(sheet, FULL_LABELS);

    const out = join(dir, "fixtures");
    const result = await importSheet(sheet, out);
    expect(result.written).toBe(4);

    // The harness's own loader validates every file against the schema.
    const fixtures = loadCorpus(out);
    expect(fixtures).toHaveLength(4);

    const { passed, output } = await runHarness({
      classifier: new FakeEmailClassifier({ fixtures }),
      fixtures,
      model: "fake",
      isSelfTest: true,
    });
    expect(passed).toBe(true);
    expect(output).toContain("(4/4)");
    expect(output).toContain("(1/1 deadline-bearing)");

    // "01:29 PM AEDT" on 14 March is 02:29 UTC — daylight saving included.
    const pwc = fixtures.find((f) => f.email.gmailMessageId === "pwc-1@criteriacorp.test")!;
    expect(pwc.expected.deadlineAt).toBe("2026-03-14T02:29:00.000Z");
    expect(pwc.expected.hasExplicitDeadlineLanguage).toBe(true);
    expect(pwc.email.body).toContain("Deadline: Saturday");
  });

  it("names fixture files NNN-slug, the format the corpus uses", async () => {
    const { sheet } = await exportFixture();
    await label(sheet, FULL_LABELS);
    const out = join(dir, "fixtures");
    await importSheet(sheet, out);
    for (const file of readdirSync(join(out, "emails"))) {
      expect(file).toMatch(/^\d{3}-[a-z0-9-]+\.json$/);
    }
  });
});

describe("refusing to write inside the repository (T2.11 done-when)", () => {
  it("refuses to export a spreadsheet into the repository, and writes nothing", async () => {
    writeFileSync(join(dir, "a.mbox"), mbox(EMAILS));
    const { emails } = await readMailboxes([join(dir, "a.mbox")]);
    const target = join(REPOSITORY_ROOT, "labels-must-not-exist.xlsx");

    await expect(exportSheet(emails, target)).rejects.toThrow(InsideRepositoryError);
    expect(existsSync(target)).toBe(false);
  });

  it("refuses a nested path, and a differently-cased path on Windows", () => {
    expect(() => assertOutsideRepository(join(REPOSITORY_ROOT, "fixtures", "real", "x.xlsx"))).toThrow(
      InsideRepositoryError,
    );
    if (process.platform === "win32") {
      expect(() => assertOutsideRepository(join(REPOSITORY_ROOT.toUpperCase(), "x.xlsx"))).toThrow(
        InsideRepositoryError,
      );
    }
  });

  it("refuses to import fixtures into the repository", async () => {
    const { sheet } = await exportFixture();
    await label(sheet, FULL_LABELS);
    const target = join(REPOSITORY_ROOT, "fixtures-must-not-exist");
    await expect(importSheet(sheet, target)).rejects.toThrow(InsideRepositoryError);
    expect(existsSync(target)).toBe(false);
  });

  it("allows a sibling folder that merely shares the repository's name as a prefix", () => {
    expect(() => assertOutsideRepository(`${REPOSITORY_ROOT}-private${"/"}labels.xlsx`)).not.toThrow();
  });
});

describe("the spreadsheet", () => {
  it("offers real dropdowns and quotes the prompt's stage definitions verbatim", async () => {
    const { sheet } = await exportFixture();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(sheet);

    const label = workbook.getWorksheet("Label")!;
    const col = new Map<string, number>();
    label.getRow(1).eachCell((cell, n) => col.set(String(cell.value), n));
    const validation = (header: string) => label.getRow(2).getCell(col.get(header)!).dataValidation;

    expect(validation(HEADERS.isApplication).formulae).toEqual(['"yes,no"']);
    expect(validation(HEADERS.stage).formulae![0]).toContain("assessment");

    const readme: string[] = [];
    workbook.getWorksheet("README")!.eachRow((row) => readme.push(String(row.getCell(2).value)));
    for (const definition of Object.values(STAGE_DEFINITIONS)) {
      expect(readme).toContain(definition);
    }
  });

  it("orders rows by date and leaves duplicate copies out", async () => {
    const source = join(dir, "a.mbox");
    writeFileSync(source, mbox([EMAILS[3]!, EMAILS[0]!, EMAILS[0]!]));
    const { emails } = await readMailboxes([source]);
    const sheet = join(dir, "s.xlsx");
    const result = await exportSheet(emails, sheet);

    expect(result.duplicates).toBe(1);
    const rows = await readSheet(sheet);
    expect(rows.map((r) => r.messageId)).toEqual(["kpmg-1@smartrecruiters.test", "spotify-1@spotify.test"]);
  });

  it("exports a seeded sample of a fixed size, for the agreement exercise", async () => {
    const source = join(dir, "a.mbox");
    writeFileSync(source, mbox(EMAILS));
    const { emails } = await readMailboxes([source]);

    await exportSheet(emails, join(dir, "s1.xlsx"), { sample: 2, seed: "overlap" });
    await exportSheet(emails, join(dir, "s2.xlsx"), { sample: 2, seed: "overlap" });
    const ids = async (f: string) => (await readSheet(join(dir, f))).map((r) => r.messageId);

    expect(await ids("s1.xlsx")).toHaveLength(2);
    expect(await ids("s2.xlsx")).toEqual(await ids("s1.xlsx"));
  });
});

describe("import validation", () => {
  it("rejects a contradictory label with its row number, and writes nothing", async () => {
    const { sheet } = await exportFixture();
    await label(sheet, {
      ...FULL_LABELS,
      "seek-1@seek.test": { isApplication: "no", company: "SEEK" },
    });
    const out = join(dir, "fixtures");

    const error = await importSheet(sheet, out).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(LabelError);
    expect((error as LabelError).problems.join("\n")).toMatch(/row \d+: is_application — is no/);
    expect(existsSync(out)).toBe(false);
  });

  it("requires a stage on every application", async () => {
    const { sheet } = await exportFixture();
    await label(sheet, { "kpmg-1@smartrecruiters.test": { isApplication: "yes", company: "KPMG" } });
    await expect(importSheet(sheet, join(dir, "f"))).rejects.toThrow(/an application needs a stage/);
  });

  it("refuses a deadline in any order but ISO — 07/04 means two different days", async () => {
    const { sheet } = await exportFixture();
    await label(sheet, {
      "pwc-1@criteriacorp.test": { ...FULL_LABELS["pwc-1@criteriacorp.test"], deadline: "14/03/2026 13:29" },
    });
    await expect(importSheet(sheet, join(dir, "f"))).rejects.toThrow(/YYYY-MM-DD/);
  });

  it("requires deadline_language when a deadline is entered", async () => {
    const { sheet } = await exportFixture();
    await label(sheet, {
      "pwc-1@criteriacorp.test": { ...FULL_LABELS["pwc-1@criteriacorp.test"], deadlineLanguage: "" },
    });
    await expect(importSheet(sheet, join(dir, "f"))).rejects.toThrow(/must be yes/);
  });

  it("asks for the deadline itself when deadline_language is yes", async () => {
    // Without a date the fixture cannot be scored for SM-3 — it would sit in
    // the denominator with no right answer.
    const { sheet } = await exportFixture();
    await label(sheet, {
      "pwc-1@criteriacorp.test": { ...FULL_LABELS["pwc-1@criteriacorp.test"], deadline: "" },
    });
    await expect(importSheet(sheet, join(dir, "f"))).rejects.toThrow(/deadline_language is yes, so enter the deadline/);
  });

  it("skips and counts unlabelled rows rather than guessing them", async () => {
    const { sheet } = await exportFixture();
    await label(sheet, { "kpmg-1@smartrecruiters.test": FULL_LABELS["kpmg-1@smartrecruiters.test"] });
    const result = await importSheet(sheet, join(dir, "f"));
    expect(result.written).toBe(1);
    expect(result.unlabelled).toBe(3);
  });

  it("refuses to overwrite a folder that already holds a set", async () => {
    const { sheet } = await exportFixture();
    await label(sheet, FULL_LABELS);
    const out = join(dir, "f");
    mkdirSync(out);
    writeFileSync(join(out, "existing.txt"), "a frozen set lives here");
    await expect(importSheet(sheet, out)).rejects.toThrow(/not empty/);
  });
});

describe("the split and the freeze (D32)", () => {
  // Ten emails: six applications, four not.
  const many: Spec[] = Array.from({ length: 10 }, (_, i) => ({
    id: `m-${i}@example.test`,
    from: i < 6 ? "Careers <careers@greenhouse.io>" : "News <news@newsletter.test>",
    subject: i < 6 ? `Application received ${i}` : `Newsletter ${i}`,
    date: `Mon, ${String(i + 1).padStart(2, "0")} Mar 2026 10:00:00 +0000`,
    body: `Body ${i}.`,
  }));
  const manyLabels = Object.fromEntries(
    many.map((s, i) => [
      s.id,
      i < 6 ? { isApplication: "yes", company: "Acme", role: `Role ${i}`, stage: "applied" } : { isApplication: "no" },
    ]),
  );

  async function importMany(out: string, seed = "fixed") {
    const { sheet } = await exportFixture(many);
    await label(sheet, manyLabels);
    return importSheet(sheet, out, { tuning: 5, seed });
  }

  const messageIds = (setDir: string) =>
    readdirSync(join(setDir, "emails"))
      .map((f) => JSON.parse(readFileSync(join(setDir, "emails", f), "utf8")).gmailMessageId as string)
      .sort();

  it("splits tuning from held-out, keeping the balance of applications", async () => {
    const out = join(dir, "sets");
    const result = await importMany(out);
    const tuning = result.sets.find((s) => s.name === "tuning")!;
    const heldOut = result.sets.find((s) => s.name === "held-out")!;

    expect(tuning.fixtures).toBe(5);
    expect(tuning.applications).toBe(3); // round(5 × 6/10)
    expect(heldOut.fixtures).toBe(5);
    expect(heldOut.applications).toBe(3);
    // Every set is a corpus the harness can load on its own.
    expect(loadCorpus(join(out, "held-out"))).toHaveLength(5);
  });

  it("gives the same split for the same seed — nobody hand-picks the held-out emails", async () => {
    await importMany(join(dir, "a"));
    await importMany(join(dir, "b"));
    expect(messageIds(join(dir, "b", "held-out"))).toEqual(messageIds(join(dir, "a", "held-out")));
  });

  it("freezes the held-out set, and detects any later edit, addition or removal", async () => {
    const out = join(dir, "sets");
    await importMany(out);
    const heldOut = join(out, "held-out");
    expect(verifyManifest(heldOut).ok).toBe(true);

    const [first] = readdirSync(join(heldOut, "expected"));
    const path = join(heldOut, "expected", first!);
    writeFileSync(path, readFileSync(path, "utf8").replace('"isApplication": true', '"isApplication": false'));
    writeFileSync(join(heldOut, "emails", "999-added.json"), "{}");

    const result = verifyManifest(heldOut);
    expect(result.ok).toBe(false);
    expect(result.problems).toContain(`changed: expected/${first}`);
    expect(result.problems).toContain("added: emails/999-added.json");
  });

  it("is scored by the harness only while it is unchanged", async () => {
    const out = join(dir, "sets");
    await importMany(out);
    const heldOut = join(out, "held-out");

    const selected = selectCorpus(["--corpus", heldOut]);
    expect(selected.fixtures).toHaveLength(5);
    expect(selected.header.join("\n")).toContain("unchanged since freezing");
    expect(selectCorpus([`--corpus=${heldOut}`]).fixtures).toHaveLength(5);

    const [first] = readdirSync(join(heldOut, "expected"));
    const path = join(heldOut, "expected", first!);
    writeFileSync(path, readFileSync(path, "utf8") + " ");
    expect(() => selectCorpus(["--corpus", heldOut])).toThrow(/changed since it was frozen/);
  });

  it("tells the harness which folder to use when given the split's parent", async () => {
    const out = join(dir, "sets");
    await importMany(out);
    expect(() => selectCorpus(["--corpus", out])).toThrow(/tuning\/held-out split/);
  });
});

describe("choosing a corpus to score", () => {
  it("refuses --corpus without a folder rather than scoring the default set instead", () => {
    expect(() => selectCorpus(["--corpus"])).toThrow(CorpusChoiceError);
    expect(() => selectCorpus(["--corpus", "--demo"])).toThrow(/needs a folder/);
    expect(() => selectCorpus(["--corpus="])).toThrow(/needs a folder/);
  });

  it("scores the repository's corpus when no --corpus is given", () => {
    const { fixtures, header } = selectCorpus(["--demo"]);
    expect(fixtures.length).toBe(loadCorpus().length);
    expect(header).toEqual([]);
  });
});

describe("inventory", () => {
  it("counts by sender bucket and date, and never prints a subject or body", async () => {
    const source = join(dir, "a.mbox");
    writeFileSync(source, mbox([...EMAILS, EMAILS[0]!]));
    const inventory = buildInventory(await readMailboxes([source]));

    expect(inventory.unique).toBe(4);
    expect(inventory.duplicates).toBe(1);
    expect(inventory.buckets).toEqual({ "candidate application": 2, "job board": 1, other: 1 });
    expect(inventory.earliest!.toISOString().slice(0, 10)).toBe("2026-03-09");

    const text = formatInventory(inventory);
    for (const email of EMAILS) {
      expect(text).not.toContain(email.subject);
      expect(text).not.toContain(email.body);
    }
    expect(text).toContain("NOT a label");
  });

  it("says 'mixed' for a domain sending more than one kind, rather than its first email's kind", async () => {
    // An employer's own domain sends application updates and marketing alike.
    const source = join(dir, "b.mbox");
    writeFileSync(
      source,
      mbox([
        { id: "e1@bolt.test", from: "Bolt <talent@bolt.test>", subject: "Thanks for applying — Bolt", date: "Mon, 02 Mar 2026 00:00:00 +0000", body: "b" },
        { id: "e2@bolt.test", from: "Bolt <events@bolt.test>", subject: "Join our graduate insight night", date: "Tue, 03 Mar 2026 00:00:00 +0000", body: "b" },
      ]),
    );
    const inventory = buildInventory(await readMailboxes([source]));

    expect(inventory.buckets["candidate application"]).toBe(1); // "Thanks for applying"
    expect(inventory.topDomains).toEqual([{ domain: "bolt.test", count: 2, bucket: "mixed" }]);
  });

  it("gives the date range in Melbourne time, as the spreadsheet does", async () => {
    // 22:00 UTC on 1 March is 09:00 on 2 March in Melbourne.
    const source = join(dir, "c.mbox");
    writeFileSync(
      source,
      mbox([{ id: "d1@x.test", from: "X <a@x.test>", subject: "s", date: "Sun, 01 Mar 2026 22:00:00 +0000", body: "b" }]),
    );
    const text = formatInventory(buildInventory(await readMailboxes([source])));
    expect(text).toContain("Date range (Melbourne)     2026-03-02 → 2026-03-02");
  });
});

describe("the command line", () => {
  it("accepts --flag value and --flag=value alike", () => {
    expect(parseArgs(["export", "a.mbox", "--out", "x.xlsx", "--sample=25"]).flags).toEqual(
      new Map([
        ["out", "x.xlsx"],
        ["sample", "25"],
      ]),
    );
  });

  it("runs inventory end to end and reports an unknown command with usage", async () => {
    writeFileSync(join(dir, "a.mbox"), mbox(EMAILS));
    const lines: string[] = [];
    expect(await run(["inventory", join(dir, "a.mbox")], (l) => lines.push(l))).toBe(0);
    expect(lines.join("\n")).toContain("unique                   4");

    const usage: string[] = [];
    expect(await run(["frobnicate"], (l) => usage.push(l))).toBe(1);
    expect(usage.join("\n")).toContain("Usage:");
  });
});
