import type { Classification } from "@gradtracker/shared";
import type { EmailClassifier, ClassificationResult, RawEmail } from "../../ports/index.js";
import { DEFAULT_TIMEZONE, formatWallClock, wallClockToInstant } from "../../time/zoned-time.js";

/**
 * The presentation's classifier: scripted, not a model (D36).
 *
 * No API credit was bought for the demo, so the emails a teammate sends during
 * the presentation are written in advance and recognised here by their
 * subject. Each script returns what the prompt (v2) asks a model to return for
 * that email — the same fields, the same deadline conventions — and the result
 * then goes through the real pipeline: confidence gate, matching, stage engine
 * and provenance. Only the answer is scripted.
 *
 * Anything else is sent to review at low confidence rather than guessed, so a
 * stray email in the demo inbox can never invent an application.
 *
 * The production path is the live Claude adapter (T7.3), behind the same port.
 */

export interface DemoScript {
  id: string;
  /** What the teammate types as the subject. Matched case-insensitively. */
  subject: string;
  /** The body to paste. The backup trigger uses this exact email too. */
  body: string;
  /** The sender the backup trigger uses; a live email keeps its real sender. */
  backupFrom: string;
  classify(receivedAt: Date): Classification;
}

/** 23:59 on the Nth day after the received date, in the student's timezone —
 *  the prompt's rule for "within N days". */
function endOfDayAfter(receivedAt: Date, days: number): string {
  const [date] = formatWallClock(receivedAt, DEFAULT_TIMEZONE).split(" ");
  const [y, m, d] = date!.split("-").map(Number);
  const target = new Date(Date.UTC(y!, m! - 1, d! + days));
  return wallClockToInstant(
    { year: target.getUTCFullYear(), month: target.getUTCMonth() + 1, day: target.getUTCDate(), hour: 23, minute: 59 },
    DEFAULT_TIMEZONE,
  ).toISOString();
}

export const DEMO_SCRIPTS: readonly DemoScript[] = [
  {
    id: "accenture-interview",
    subject: "Interview invitation — Accenture Technology Graduate",
    body: [
      "Dear Sam,",
      "",
      "Thank you for completing the digital assessment for the Technology Graduate role at Accenture.",
      "",
      "We'd like to invite you to an interview. Please book a time within 3 days using the link below.",
      "",
      "Book your interview: https://example.com/accenture/interview",
      "",
      "Accenture Recruitment",
    ].join("\n"),
    backupFrom: "no-reply@accenture.com",
    classify: (receivedAt) => ({
      isApplication: true,
      company: "Accenture",
      role: "Technology Graduate",
      stage: "interview",
      deadlineAt: endOfDayAfter(receivedAt, 3),
      nextAction: "Book interview time",
      confidence: 0.93,
    }),
  },
  {
    id: "seek-alert",
    subject: "New graduate jobs matching your search",
    body: [
      "Based on your saved search 'graduate melbourne'",
      "",
      "Graduate Software Engineer, Afterpay, Melbourne. Closing 6 November",
      "Associate Product Manager (Graduate), Linktree, Melbourne",
      "",
      "View all matches",
      "Manage your job alerts in your SEEK account.",
    ].join("\n"),
    backupFrom: "noreply@seek.com.au",
    // Not an application: two jobs the student could apply for (D43).
    classify: () => ({
      isApplication: false,
      company: null,
      role: null,
      stage: null,
      deadlineAt: null,
      nextAction: null,
      confidence: 0.97,
      openings: [
        { company: "Afterpay", role: "Graduate Software Engineer", location: "Melbourne", closesAt: closing(11, 6), source: "SEEK" },
        { company: "Linktree", role: "Associate Product Manager (Graduate)", location: "Melbourne", closesAt: null, source: "SEEK" },
      ],
    }),
  },
  {
    id: "kestrel-ambiguous",
    subject: "Quick question about your application",
    body: [
      "Hi Sam,",
      "",
      "Thanks for your interest in joining us. Before we go any further, could you let me know whether you're still available to start in February?",
      "",
      "Cheers,",
      "Mia",
      "Kestrel Partners",
    ].join("\n"),
    backupFrom: "mia@kestrel-partners.example",
    // No role and no clear stage: a model should be unsure, and an unsure
    // answer goes to the student instead of the dashboard.
    classify: () => ({
      isApplication: true,
      company: "Kestrel Partners",
      role: null,
      stage: "applied",
      deadlineAt: null,
      nextAction: "Reply about February availability",
      confidence: 0.47,
    }),
  },
];

/** 23:59 Melbourne daylight time on a day in 2026 — a closing date as written. */
const closing = (month: number, day: number) =>
  `2026-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T12:59:00.000Z`;

const UNRECOGNISED: Classification = {
  isApplication: true,
  company: null,
  role: null,
  stage: null,
  deadlineAt: null,
  nextAction: null,
  confidence: 0.3,
};

export function findScript(subject: string): DemoScript | undefined {
  const wanted = subject.trim().toLowerCase();
  return DEMO_SCRIPTS.find((s) => wanted.includes(s.subject.toLowerCase()));
}

export class ScriptedEmailClassifier implements EmailClassifier {
  classify(email: RawEmail): Promise<ClassificationResult> {
    const script = findScript(email.subject);
    const answer = script ? script.classify(email.receivedAt) : UNRECOGNISED;
    return Promise.resolve({ ...answer, model: "fake", usage: { inputTokens: 0, outputTokens: 0 } });
  }
}
