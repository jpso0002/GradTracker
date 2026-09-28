import { describe, it, expect } from "vitest";
import { cohensKappa, compareRows, formatAgreement } from "./agreement.js";
import type { SheetRow } from "./sheet.js";

/** Label agreement (D32). Rows are built directly — no spreadsheet needed to
 *  test the arithmetic. */

let counter = 0;
function row(over: Partial<SheetRow> & { messageId: string }): SheetRow {
  counter += 1;
  return {
    sheetRow: counter + 1,
    row: String(counter),
    received: "",
    from: "a@b.test",
    senderDomain: "b.test",
    subject: "s",
    body: "b",
    isApplication: "",
    company: "",
    role: "",
    stage: "",
    deadlineLanguage: "",
    deadline: "",
    deadlineTimezone: "Australia/Melbourne",
    notes: "",
    labeller: "",
    threadId: "",
    receivedUtc: "",
    sourceFile: "",
    bodyTruncated: "no",
    ...over,
  };
}

describe("Cohen's kappa", () => {
  it("matches a hand-computed value", () => {
    // 10 emails. A: 5 yes, 5 no. B agrees on 8, differs on 2 (one each way).
    // observed = 0.8; chance = 0.5·0.5 + 0.5·0.5 = 0.5; κ = (0.8 − 0.5)/(1 − 0.5) = 0.6
    const a = ["y", "y", "y", "y", "y", "n", "n", "n", "n", "n"];
    const b = ["y", "y", "y", "y", "n", "n", "n", "n", "n", "y"];
    expect(cohensKappa(a.map((x, i): [string, string] => [x, b[i]!]))).toBeCloseTo(0.6);
  });

  it("is undefined, not 1, when both labellers used a single category", () => {
    // Perfect agreement on a sample with no variation tells you nothing.
    expect(cohensKappa([["no", "no"], ["no", "no"]])).toBeNull();
  });

  it("is lower than raw agreement on a skewed sample — the reason it is reported", () => {
    // 9 negatives both say no to; one positive only A catches. Raw agreement
    // is 90%, but chance agreement is also high.
    const pairs: [string, string][] = [...Array(9).fill(["no", "no"]), ["yes", "no"]];
    const kappa = cohensKappa(pairs)!;
    expect(kappa).toBeLessThan(0.9);
    expect(kappa).toBeCloseTo(0);
  });
});

describe("comparing two labellers' sheets", () => {
  const a = [
    row({ messageId: "1", isApplication: "yes", company: "KPMG", role: "Graduate", stage: "applied" }),
    row({ messageId: "2", isApplication: "yes", company: "PwC", role: "Tech", stage: "assessment" }),
    row({ messageId: "3", isApplication: "no" }),
    row({ messageId: "4", isApplication: "yes", company: "nbn", role: "Grad", stage: "interview" }),
    row({ messageId: "5", isApplication: "" }), // unlabelled by A
  ];
  const b = [
    row({ messageId: "1", isApplication: "yes", company: "kpmg ", role: "Graduate", stage: "applied" }),
    row({ messageId: "2", isApplication: "yes", company: "PwC", role: "Tech", stage: "interview" }),
    row({ messageId: "3", isApplication: "yes", company: "SEEK", role: "Ads", stage: "applied" }),
    row({ messageId: "4", isApplication: "yes", company: "nbn", role: "Grad", stage: "interview" }),
    row({ messageId: "5", isApplication: "no" }),
  ];
  const report = compareRows(a, b);

  it("compares only emails both people labelled", () => {
    expect(report.overlap).toBe(4);
  });

  it("measures is_application over every overlapping email", () => {
    expect(report.isApplication.agreement.successes).toBe(3);
    expect(report.isApplication.agreement.n).toBe(4);
  });

  it("compares fields only where both said application", () => {
    // Email 3 is a disagreement about is_application, not about stage.
    expect(report.stage.agreement.n).toBe(3);
    expect(report.stage.agreement.successes).toBe(2);
  });

  it("uses the harness's text rule — case and surrounding space do not count", () => {
    expect(report.company.agreement.successes).toBe(3);
  });

  it("lists each disagreement by row so it can be resolved", () => {
    const fields = report.disagreements.map((d) => d.field);
    expect(fields).toEqual(["stage", "is_application"]);
    expect(formatAgreement(report)).toContain('"assessment" vs "interview"');
  });
});
