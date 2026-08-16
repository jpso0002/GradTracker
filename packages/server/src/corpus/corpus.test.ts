import { describe, it, expect } from "vitest";
import { StageEnum } from "@gradtracker/shared";
import { loadCorpus, corpusStats } from "./loader.js";

/**
 * Corpus composition (T2.4, T2.5).
 *
 * The corpus is the artefact SM-1, SM-2 and SM-3 are measured against, so its
 * shape is asserted rather than assumed. Deleting the only overdue fixture, or
 * quietly letting the hard negatives rot into easy ones, would leave the
 * accuracy figure looking healthier while meaning less — and nothing would say
 * so. These tests say so.
 */

const corpus = loadCorpus();
const stats = corpusStats(corpus);
const positives = corpus.filter((f) => f.expected.isApplication);
const negatives = corpus.filter((f) => !f.expected.isApplication);
const hardNegatives = negatives.filter((f) => f.expected.note?.startsWith("HARD NEGATIVE"));

describe("corpus size", () => {
  it("has 80 fixtures", () => {
    expect(stats.total).toBe(80);
  });

  it("splits 55 positive / 25 negative", () => {
    expect(stats.positives).toBe(55);
    expect(stats.negatives).toBe(25);
  });

  it("gives every fixture a unique Gmail message id", () => {
    const ids = corpus.map((f) => f.email.gmailMessageId);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("positive coverage (T2.4)", () => {
  it("covers all six stages", () => {
    const present = new Set(positives.map((f) => f.expected.stage));
    for (const stage of StageEnum.options) {
      expect(present.has(stage), `no positive fixture in stage "${stage}"`).toBe(true);
    }
  });

  it("includes the major ATS senders", () => {
    const domains = new Set(
      positives.map((f) => f.email.fromAddress.split("@")[1]?.toLowerCase()),
    );
    for (const ats of ["greenhouse.io", "myworkday.com", "lever.co", "smartrecruiters.com"]) {
      expect(domains.has(ats), `no positive fixture from ${ats}`).toBe(true);
    }
  });

  it("includes email from a person, not only from an ATS", () => {
    // A corpus of nothing but no-reply templates would train the classifier on
    // sender shape rather than content.
    const human = positives.filter(
      (f) => !/no-?reply|donotreply|noreply/i.test(f.email.fromAddress),
    );
    expect(human.length).toBeGreaterThanOrEqual(8);
  });

  it("carries explicit deadlines on a substantial share", () => {
    // T2.4 asks for ~30. The actual figure is what it is — inventing deadlines
    // in emails that would not carry them would make the corpus less realistic,
    // which is a worse trade than missing a soft target. This is the SM-3
    // denominator, and the harness prints it.
    expect(stats.deadlineBearing).toBeGreaterThanOrEqual(25);
  });

  it("uses varied deadline phrasings, not one template", () => {
    const bodies = positives
      .filter((f) => f.expected.hasExplicitDeadlineLanguage)
      .map((f) => f.email.body.toLowerCase());

    const phrasings = [
      /by \d{1,2}:\d{2}[ap]m/, // "by 11:59pm AEST on Wednesday 27 May"
      /within \d+ (business )?days?/, // "within 5 business days"
      /\d{2}\/\d{2}\/\d{4}/, // "12/06/2026"
      /close of business/,
      /no later than/,
      /expires in/,
      /open until|remains open until/,
      /you have until/,
    ];

    for (const pattern of phrasings) {
      expect(
        bodies.some((b) => pattern.test(b)),
        `no deadline fixture uses the pattern ${pattern}`,
      ).toBe(true);
    }
  });

  it("labels a deadline for every fixture claiming deadline language", () => {
    for (const f of positives) {
      if (f.expected.hasExplicitDeadlineLanguage) {
        expect(f.expected.deadlineAt, `${f.email.id} is unscoreable`).not.toBeNull();
      }
    }
  });

  it("includes deadline-shaped text that must NOT be extracted", () => {
    // The hardest deadline cases are the ones that look like deadlines and are
    // not: an interview time, an applications-close date meant for other
    // people, a promise about when the employer will act.
    const controls = ["015-telstra-ack", "034-macquarie-panel", "042-ibm-interview"];
    for (const id of controls) {
      const fixture = corpus.find((f) => f.email.id === id);
      expect(fixture, `missing negative control ${id}`).toBeDefined();
      expect(fixture!.expected.deadlineAt, `${id} must not label a deadline`).toBeNull();
      expect(fixture!.expected.hasExplicitDeadlineLanguage).toBe(false);
    }
  });
});

describe("negative coverage (T2.5)", () => {
  it("has at least 13 hard negatives", () => {
    // These carry the weight. Anything separates a rejection letter from a bank
    // statement; the real test is separating a genuine application update from
    // a job alert using identical vocabulary.
    expect(hardNegatives.length).toBeGreaterThanOrEqual(13);
  });

  it("includes negatives that name companies with live applications", () => {
    const companiesInPipeline = new Set(
      positives.map((f) => f.expected.company).filter((c): c is string => c !== null),
    );
    const confusable = hardNegatives.filter((f) =>
      [...companiesInPipeline].some((c) => f.email.body.includes(c) || f.email.subject.includes(c)),
    );
    // A job alert for a company you have never applied to is easy. One naming a
    // company already in the pipeline is the case that actually matters.
    expect(confusable.length).toBeGreaterThanOrEqual(8);
  });

  it("includes a negative sent from an ATS domain used by real applications", () => {
    // Sender domain alone must not be sufficient to classify — 071 is a mass
    // hiring email from greenhouse.io, the same domain as genuine updates.
    const atsNegatives = negatives.filter((f) => /greenhouse\.io|myworkday\.com/.test(f.email.fromAddress));
    expect(atsNegatives.length).toBeGreaterThan(0);
  });

  it("includes negatives that carry deadline language", () => {
    // Deadline text must not be treated as evidence of an application.
    const withDeadlineText = negatives.filter((f) =>
      /clos(e|ing)|by \d{1,2} \w+|rsvp by|due|register by|apply by/i.test(f.email.body),
    );
    expect(withDeadlineText.length).toBeGreaterThanOrEqual(6);
  });

  it("covers the categories named in the prompt", () => {
    const all = negatives.map((f) => `${f.email.subject} ${f.email.body}`.toLowerCase());
    const categories: [string, RegExp][] = [
      ["job alert / recommendations", /job alert|jobs matching|new jobs|matching your search/],
      ["profile viewed", /viewed your profile|appeared in \d+ searches/],
      ["careers newsletter", /careers connect|careers fair/],
      ["employer event", /insight session|networking|webinar/i],
      ["recruiter cold outreach", /came across your profile|open to a quick chat/],
      ["applications now open", /applications are now open|we're hiring/],
    ];
    for (const [name, pattern] of categories) {
      expect(all.some((t) => pattern.test(t)), `no negative covering "${name}"`).toBe(true);
    }
  });

  it("labels no company, role, stage or deadline on any negative", () => {
    // Enforced by the schema too, but asserted here so a failure names the
    // fixture rather than surfacing as a load error.
    for (const f of negatives) {
      expect(f.expected.company, `${f.email.id}`).toBeNull();
      expect(f.expected.stage, `${f.email.id}`).toBeNull();
      expect(f.expected.deadlineAt, `${f.email.id}`).toBeNull();
    }
  });

  it("explains why every negative is in the corpus", () => {
    for (const f of negatives) {
      expect(f.expected.note, `${f.email.id} has no note`).toBeTruthy();
    }
  });
});
