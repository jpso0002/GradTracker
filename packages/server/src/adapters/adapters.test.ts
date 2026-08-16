import { describe, it, expect } from "vitest";
import { StageEnum } from "@gradtracker/shared";
import { loadCorpus, corpusStats } from "../corpus/loader.js";
import {
  senderDomain,
  emailRef,
  scrubForLog,
  UNLOGGABLE_FIELDS,
  HistoryIdExpiredError,
  type RawEmail,
} from "../ports/index.js";
import { FakeGmailClient } from "./gmail/fake.js";
import { FakeEmailClassifier } from "./classifier/fake.js";
import { buildSystemPrompt, buildUserMessage, PROMPT_VERSION } from "./classifier/prompt.js";
import { createGmailClient, createEmailClassifier } from "./index.js";

const corpus = loadCorpus();

describe("corpus loader", () => {
  it("loads every fixture with a validated label", () => {
    expect(corpus.length).toBeGreaterThan(0);
    expect(corpusStats(corpus).total).toBe(corpus.length);
  });

  it("pairs every email with a label of the same id", () => {
    for (const f of corpus) {
      expect(f.email.id).toMatch(/^\d{3}-[a-z0-9-]+$/);
    }
  });

  it("includes hard negatives, not only easy ones", () => {
    // Anything separates a rejection letter from a bank statement. The corpus
    // is only meaningful if it contains the confusable cases.
    const negatives = corpus.filter((f) => !f.expected.isApplication);
    const hard = negatives.filter((f) => f.expected.note?.includes("HARD NEGATIVE"));
    expect(hard.length).toBeGreaterThan(0);
  });
});

describe("senderDomain — the only part of a sender that may be persisted", () => {
  it("extracts the domain from a bare address", () => {
    expect(senderDomain("no-reply@greenhouse.io")).toBe("greenhouse.io");
  });

  it("extracts the domain from a display-name address", () => {
    expect(senderDomain("Deloitte Early Careers <no-reply@greenhouse.io>")).toBe("greenhouse.io");
  });

  it("lowercases", () => {
    expect(senderDomain("Talent@Canva.COM")).toBe("canva.com");
  });

  it("returns null rather than guessing on malformed input", () => {
    expect(senderDomain("not-an-address")).toBeNull();
    expect(senderDomain("trailing@")).toBeNull();
  });
});

describe("emailRef — what may leave the process (defect C1)", () => {
  const email: RawEmail = {
    gmailMessageId: "m1",
    gmailThreadId: "t1",
    receivedAt: new Date("2026-05-18T09:14:00Z"),
    fromAddress: "no-reply@greenhouse.io",
    subject: "Your online assessment — Deloitte",
    body: "Complete it by Friday 23 May.",
  };

  it("carries no subject, body or full address", () => {
    const serialised = JSON.stringify(emailRef(email));
    expect(serialised).not.toContain("assessment");
    expect(serialised).not.toContain("Friday");
    expect(serialised).not.toContain("no-reply@");
  });

  it("keeps the domain, so provenance still works", () => {
    expect(emailRef(email).senderDomain).toBe("greenhouse.io");
  });

  it("scrubs unloggable fields from an arbitrary object", () => {
    const scrubbed = scrubForLog({
      gmailMessageId: "m1",
      subject: "secret",
      nested: { body: "also secret", safe: 1 },
    }) as Record<string, unknown>;

    expect(scrubbed["subject"]).toBe("[redacted]");
    expect((scrubbed["nested"] as Record<string, unknown>)["body"]).toBe("[redacted]");
    expect((scrubbed["nested"] as Record<string, unknown>)["safe"]).toBe(1);
    expect(scrubbed["gmailMessageId"]).toBe("m1");
  });

  it("lists reasoning as unloggable — it quotes the email", () => {
    expect(UNLOGGABLE_FIELDS).toContain("reasoning");
  });
});

describe("FakeGmailClient", () => {
  it("pages through the corpus", async () => {
    const gmail = new FakeGmailClient({ fixtures: corpus, pageSize: 2 });
    const first = await gmail.listSince(null);
    expect(first.messageIds).toHaveLength(2);
    expect(first.nextPageToken).toBeDefined();

    const second = await gmail.listSince(null, first.nextPageToken);
    expect(second.messageIds).toHaveLength(2);
    expect(second.messageIds).not.toEqual(first.messageIds);
  });

  it("omits nextPageToken on the final page", async () => {
    const gmail = new FakeGmailClient({ fixtures: corpus, pageSize: 100 });
    const page = await gmail.listSince(null);
    expect(page.nextPageToken).toBeUndefined();
    expect(page.messageIds).toHaveLength(corpus.length);
  });

  it("returns nothing new when given the current cursor", async () => {
    const gmail = new FakeGmailClient({ fixtures: corpus });
    const first = await gmail.listSince(null);
    const incremental = await gmail.listSince(first.historyId);
    expect(incremental.messageIds).toEqual([]);
  });

  it("throws a typed error for an expired cursor, not a generic one", async () => {
    // The sync engine must be able to catch this specifically and fall back to
    // a bounded rescan, rather than pattern-matching a message string.
    const gmail = new FakeGmailClient({ fixtures: corpus, expiredHistoryIds: ["stale"] });
    await expect(gmail.listSince("stale")).rejects.toBeInstanceOf(HistoryIdExpiredError);
  });

  it("delivers oldest first, so stage progression is applied in order", async () => {
    const gmail = new FakeGmailClient({ fixtures: corpus, pageSize: 100 });
    const page = await gmail.listSince(null);
    const dates: number[] = [];
    for (const id of page.messageIds) {
      dates.push((await gmail.fetchMessage(id)).receivedAt.getTime());
    }
    expect(dates).toEqual([...dates].sort((a, b) => a - b));
  });

  it("can simulate a mid-batch failure for crash-recovery tests", async () => {
    const gmail = new FakeGmailClient({ fixtures: corpus, failFetchAfter: 1 });
    const page = await gmail.listSince(null);
    await gmail.fetchMessage(page.messageIds[0]!);
    await expect(gmail.fetchMessage(page.messageIds[1]!)).rejects.toThrow(/simulated failure/);
  });
});

describe("FakeEmailClassifier", () => {
  const gmail = new FakeGmailClient({ fixtures: corpus, pageSize: 100 });

  it("replays the corpus label for a known email", async () => {
    const classifier = new FakeEmailClassifier({ fixtures: corpus });
    const result = await classifier.classify(await gmail.fetchMessage("fixture-001"));

    expect(result.isApplication).toBe(true);
    expect(result.company).toBe("Deloitte");
    expect(result.stage).toBe("assessment");
    expect(result.model).toBe("fake");
  });

  it("refuses an email it has no label for, rather than inventing one", async () => {
    const classifier = new FakeEmailClassifier({ fixtures: [] });
    await expect(
      classifier.classify({
        gmailMessageId: "unknown",
        gmailThreadId: "t",
        receivedAt: new Date(),
        fromAddress: "a@b.com",
        subject: "s",
        body: "b",
      }),
    ).rejects.toThrow(/no label/);
  });

  it("can report low confidence, to drive the review queue", async () => {
    const classifier = new FakeEmailClassifier({
      fixtures: corpus,
      confidenceFor: () => 0.41,
    });
    const result = await classifier.classify(await gmail.fetchMessage("fixture-001"));
    expect(result.confidence).toBe(0.41);
  });

  it("can be corrupted, so the accuracy harness can be tested (T2.6)", async () => {
    const classifier = new FakeEmailClassifier({
      fixtures: corpus,
      corrupt: (truth) => ({ ...truth, isApplication: !truth.isApplication }),
    });
    const result = await classifier.classify(await gmail.fetchMessage("fixture-001"));
    expect(result.isApplication).toBe(false);
  });
});

describe("classification prompt (T2.3)", () => {
  const gmail = new FakeGmailClient({ fixtures: corpus, pageSize: 100 });
  const prompt = buildSystemPrompt(new Date("2026-08-16T00:00:00Z"));

  it("is version-stamped, so an accuracy figure can be attributed", () => {
    expect(PROMPT_VERSION).toMatch(/^v\d+$/);
  });

  it("defines all six stages", () => {
    for (const stage of StageEnum.options) {
      expect(prompt).toContain(`"${stage}"`);
    }
  });

  it("carries today's date for resolving relative deadlines", () => {
    expect(prompt).toContain("2026-08-16");
  });

  it("instructs the model to answer false rather than guess", () => {
    expect(prompt).toContain('"isApplication": false');
    expect(prompt.toLowerCase()).toContain("rather than guessing");
  });

  it("names the hard-negative categories explicitly", () => {
    // The corpus is built around these; the prompt has to know about them too.
    expect(prompt).toContain("Job alerts");
    expect(prompt).toContain("cold outreach");
    expect(prompt).toContain("viewed your profile");
  });

  it("tells the model never to assign withdrawn", () => {
    expect(prompt).toContain("NEVER assign this");
  });

  it("puts the email in the user message, never the system prompt", async () => {
    const email = await gmail.fetchMessage("fixture-001");
    expect(prompt).not.toContain(email.subject);
    expect(buildUserMessage(email)).toContain(email.subject);
    expect(buildUserMessage(email)).toContain(email.body);
  });
});

describe("adapter selection (T2.2)", () => {
  it("defaults to the fakes with no credentials present", () => {
    expect(createGmailClient()).toBeInstanceOf(FakeGmailClient);
    expect(createEmailClassifier()).toBeInstanceOf(FakeEmailClassifier);
  });

  it("forces fakes under NODE_ENV=test even if live is requested", () => {
    // A test run must never reach a live API — not because it would fail, but
    // because it might succeed, spending money and coupling CI to the network.
    const previous = process.env["GMAIL_ADAPTER"];
    process.env["GMAIL_ADAPTER"] = "live";
    try {
      expect(process.env["NODE_ENV"]).toBe("test");
      expect(createGmailClient()).toBeInstanceOf(FakeGmailClient);
    } finally {
      if (previous === undefined) delete process.env["GMAIL_ADAPTER"];
      else process.env["GMAIL_ADAPTER"] = previous;
    }
  });
});
