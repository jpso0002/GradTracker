import { describe, it, expect } from "vitest";
import {
  normaliseCompany,
  diceCoefficient,
  roleSimilarity,
  findMatch,
  ROLE_SIMILARITY_THRESHOLD,
  type MatchCandidate,
} from "./match.js";

const candidate = (over: Partial<MatchCandidate> = {}): MatchCandidate => ({
  id: "job-1",
  companyNormalised: "deloitte",
  role: "Audit Graduate Program",
  senderDomain: "greenhouse.io",
  ...over,
});

describe("normaliseCompany", () => {
  it("strips legal suffixes", () => {
    expect(normaliseCompany("Deloitte Pty Ltd")).toBe("deloitte");
    expect(normaliseCompany("Xero Limited")).toBe("xero");
    expect(normaliseCompany("Zip Co")).toBe("zip");
  });

  it("removes 'pty ltd' as a unit before 'ltd' can match half of it", () => {
    expect(normaliseCompany("Acme Pty. Ltd.")).toBe("acme");
  });

  it("strips geography that carries no identity", () => {
    expect(normaliseCompany("Accenture Australia")).toBe("accenture");
    expect(normaliseCompany("Macquarie Group")).toBe("macquarie");
  });

  it("keeps 'Company' where it is part of the name", () => {
    // Stripping it would collapse Bain & Company into "bain", which is a
    // different firm from Bain Capital.
    expect(normaliseCompany("Bain & Company")).toBe("bain company");
  });

  it("makes trivially different spellings match", () => {
    expect(normaliseCompany("PwC")).toBe(normaliseCompany("pwc"));
    expect(normaliseCompany("Commonwealth Bank")).toBe(normaliseCompany("commonwealth bank"));
  });

  it("does not collapse genuinely different companies", () => {
    expect(normaliseCompany("Deloitte")).not.toBe(normaliseCompany("Deloitte Digital"));
    expect(normaliseCompany("NAB")).not.toBe(normaliseCompany("ANZ"));
  });
});

describe("diceCoefficient", () => {
  it("scores identical strings 1", () => {
    expect(diceCoefficient("Graduate Engineer", "Graduate Engineer")).toBe(1);
  });

  it("scores a spelling variant highly", () => {
    expect(diceCoefficient("Audit Graduate Program", "Audit Graduate Programme")).toBeGreaterThan(0.9);
  });

  it("tolerates reordering", () => {
    // Character bigrams rather than word sets, precisely so this scores well.
    expect(diceCoefficient("Graduate Engineer", "Engineer, Graduate")).toBeGreaterThan(
      ROLE_SIMILARITY_THRESHOLD,
    );
  });

  it("scores raw titles high on shared boilerplate — the reason roleSimilarity exists", () => {
    // "Graduate Engineer" and "Graduate Trader" are completely different roles,
    // yet raw character bigrams put them AT the 0.6 threshold, because the
    // shared word "Graduate" is most of both strings. Matching on this directly
    // would merge two separate applications at the same employer.
    expect(diceCoefficient("Graduate Engineer", "Graduate Trader")).toBeGreaterThanOrEqual(0.6);
  });
});

describe("roleSimilarity", () => {
  it("separates roles that raw Dice would have merged", () => {
    expect(roleSimilarity("Graduate Engineer", "Graduate Trader")).toBeLessThan(
      ROLE_SIMILARITY_THRESHOLD,
    );
    expect(roleSimilarity("Audit Graduate Program", "Consulting Graduate Program")).toBeLessThan(
      ROLE_SIMILARITY_THRESHOLD,
    );
  });

  it("still matches the same role written differently", () => {
    expect(roleSimilarity("Audit Graduate Program", "Audit Graduate Programme")).toBe(1);
    expect(
      roleSimilarity("Graduate Software Engineer", "Software Engineer, Graduate"),
    ).toBeGreaterThanOrEqual(ROLE_SIMILARITY_THRESHOLD);
  });

  it("falls back to the full titles when both reduce to nothing", () => {
    // Otherwise two empty strings would compare as identical and merge.
    expect(roleSimilarity("Graduate Program", "Graduate Programme")).toBeGreaterThan(0.8);
  });

  it("strips the intake year, which is not part of the role", () => {
    expect(roleSimilarity("Graduate Program 2026", "Graduate Program 2027")).toBeGreaterThan(0.8);
  });

  it("counts a repeated bigram only once", () => {
    // Without multiset handling, "aaaa" vs "aa" would score 1.
    expect(diceCoefficient("aaaa", "aa")).toBeLessThan(1);
  });

  it("handles empty input without dividing by zero", () => {
    expect(diceCoefficient("", "")).toBe(1);
    expect(diceCoefficient("", "Graduate")).toBe(0);
  });
});

describe("findMatch", () => {
  it("matches the same company and a similar role", () => {
    const match = findMatch(
      { company: "Deloitte", role: "Audit Graduate Programme", senderDomain: "greenhouse.io" },
      [candidate()],
    );
    expect(match?.reason).toBe("role-similarity");
    expect(match?.candidate.id).toBe("job-1");
  });

  it("matches through a legal suffix difference", () => {
    const match = findMatch(
      { company: "Deloitte Pty Ltd", role: "Audit Graduate Program", senderDomain: null },
      [candidate()],
    );
    expect(match).not.toBeNull();
  });

  it("does not match a different company, however similar the role", () => {
    const match = findMatch(
      { company: "KPMG", role: "Audit Graduate Program", senderDomain: "greenhouse.io" },
      [candidate()],
    );
    expect(match).toBeNull();
  });

  it("starts a new job for a different role at the same company", () => {
    // A student may hold two live applications at one employer. Merging them
    // would destroy one application's history.
    const match = findMatch(
      { company: "Deloitte", role: "Consulting Graduate Program", senderDomain: null },
      [candidate()],
    );
    expect(match).toBeNull();
  });

  it("falls back to sender domain when a role is renamed mid-process", () => {
    const match = findMatch(
      { company: "Deloitte", role: "Assurance Analyst, Graduate Intake", senderDomain: "greenhouse.io" },
      [candidate()],
    );
    expect(match?.reason).toBe("sender-domain");
  });

  it("never matches two unknown sender domains to each other", () => {
    // "unknown" is not an identity. Treating null as a matchable value is
    // exactly how unrelated applications get merged.
    const match = findMatch(
      { company: "Deloitte", role: "Completely Different Role", senderDomain: null },
      [candidate({ senderDomain: null })],
    );
    expect(match).toBeNull();
  });

  it("prefers the most similar role when several candidates share a company", () => {
    const match = findMatch(
      { company: "Deloitte", role: "Consulting Graduate Program", senderDomain: null },
      [
        candidate({ id: "audit", role: "Audit Graduate Program" }),
        candidate({ id: "consulting", role: "Consulting Graduate Programme" }),
      ],
    );
    expect(match?.candidate.id).toBe("consulting");
  });

  it("returns null for an empty company rather than matching everything", () => {
    expect(findMatch({ company: "", role: "Anything", senderDomain: null }, [candidate()])).toBeNull();
    expect(findMatch({ company: "Pty Ltd", role: "Anything", senderDomain: null }, [candidate()])).toBeNull();
  });

  it("matches against the corrected company, which is what makes a correction persist", () => {
    // The student corrected "Deloitte Digital" to "Deloitte". The job row now
    // holds the corrected normalised value, so later Deloitte emails land on
    // the corrected job rather than spawning a duplicate.
    const corrected = candidate({ companyNormalised: normaliseCompany("Deloitte") });
    const match = findMatch(
      { company: "Deloitte", role: "Audit Graduate Program", senderDomain: null },
      [corrected],
    );
    expect(match).not.toBeNull();
  });
});
