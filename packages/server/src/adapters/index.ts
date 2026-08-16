import type { EmailClassifier, GmailClient } from "../ports/index.js";
import { FakeGmailClient } from "./gmail/fake.js";
import { FakeEmailClassifier } from "./classifier/fake.js";

/**
 * Adapter selection.
 *
 * Both default to `fake`, and are FORCED to fake under NODE_ENV=test. A test
 * run must never be able to reach a live API — not because it would fail, but
 * because it might succeed, quietly spending money and making the suite depend
 * on the network.
 */

type AdapterMode = "fake" | "live";

function mode(envVar: string): AdapterMode {
  if (process.env["NODE_ENV"] === "test") return "fake";
  return process.env[envVar] === "live" ? "live" : "fake";
}

export function createGmailClient(): GmailClient {
  if (mode("GMAIL_ADAPTER") === "live") {
    throw new Error(
      "The live Gmail adapter is not implemented yet (task T7.2). Unset GMAIL_ADAPTER to use the fixture-backed fake.",
    );
  }
  return new FakeGmailClient();
}

export function createEmailClassifier(): EmailClassifier {
  if (mode("CLASSIFIER_ADAPTER") === "live") {
    throw new Error(
      "The live Claude adapter is not implemented yet (task T7.3). Unset CLASSIFIER_ADAPTER to use the fixture-backed fake.",
    );
  }
  return new FakeEmailClassifier();
}

export { FakeGmailClient } from "./gmail/fake.js";
export { FakeEmailClassifier } from "./classifier/fake.js";
export { buildSystemPrompt, buildUserMessage, PROMPT_VERSION } from "./classifier/prompt.js";
