import { StageEnum } from "@gradtracker/shared";
import type { RawEmail } from "../../ports/index.js";

/**
 * The classification prompt.
 *
 * **Version-stamped.** Every accuracy figure the harness reports is meaningless
 * without knowing which prompt produced it — "96.3%" from an unknown prompt is
 * a number, not evidence. Bump `PROMPT_VERSION` on any change to the text
 * below, and the harness will print it alongside the result.
 */

export const PROMPT_VERSION = "v1";

/** What each stage means, in the model's terms. Deliberately concrete: "an
 *  invitation to complete a test" is checkable, "the assessment stage" is not. */
const STAGE_DEFINITIONS: Record<(typeof StageEnum.options)[number], string> = {
  applied:
    "The application was received or acknowledged. Confirmation emails, 'we have your application', portal submission receipts.",
  assessment:
    "An invitation to complete an online assessment, coding challenge, psychometric or video interview. Something the student must DO, usually by a date.",
  interview:
    "An invitation to interview, an interview scheduling request, or an assessment-centre invitation. Involves speaking with a person.",
  offer: "An offer of employment or an internship place.",
  rejected:
    "The application was unsuccessful, at any stage. Includes 'we have decided to progress other candidates'.",
  withdrawn:
    "The student withdrew. NEVER assign this — only the student can, in the app. Present here only so you recognise and do not mislabel it.",
};

/**
 * The system prompt.
 *
 * `today` is injected rather than read from a clock so the prompt is
 * deterministic and the harness can replay a fixture with the date it was
 * actually received — resolving "by Friday" against the wrong week is a silent
 * source of deadline errors.
 */
export function buildSystemPrompt(today: Date): string {
  const stages = StageEnum.options
    .map((stage) => `  - "${stage}": ${STAGE_DEFINITIONS[stage]}`)
    .join("\n");

  return `You classify emails for a graduate job-application tracker used by university students.

Today's date is ${today.toISOString().slice(0, 10)}. Resolve relative dates such as "by Friday" or "within 5 business days" against the email's received date, which is given below — not against today.

## Your task

Decide whether an email is about the student's OWN job application, and if so extract structured fields.

## Stages

${stages}

## What counts as a job-application email

An email about an application THIS student has already submitted, or about a process they are already in.

## What does NOT count

These are the cases that matter most, because getting them wrong pollutes the student's pipeline with things they never applied to:

  - Job alerts and recommendations (LinkedIn, Seek, Indeed, "jobs you may be interested in").
  - Careers-service newsletters, employer events, webinars, networking invitations.
  - Recruiter cold outreach about a role the student has not applied for.
  - "Someone viewed your profile", "your profile appeared in searches".
  - Anything unrelated to employment.

A job alert can use almost identical vocabulary to a real application update — company name, role title, a deadline. The distinguishing question is always: **has this student already applied, or is this email inviting them to?** If it is inviting them, it is not an application.

## When you are unsure

Return "isApplication": false rather than guessing.

A false positive is visible on the dashboard and the student can dismiss it. A wrong guess about company, role or deadline is worse: it looks authoritative and may be acted upon. Do not infer a deadline that is not stated.

## Deadlines

Extract a deadline ONLY when the email states one explicitly — "by Friday 23 May", "within 5 business days", "before 11:59pm AEST on 23/05". Do not treat an interview time as a deadline unless the email frames it as something to respond by.

Return the deadline as an ISO 8601 timestamp. If the email gives a date without a time, use 23:59 local to the email's apparent timezone; if no timezone is discernible, use UTC.

## Fields

  - company: the employer's name as the student would recognise it. Not the ATS ("Greenhouse"), not the sending system.
  - role: the role title as stated. Do not abbreviate or normalise.
  - stage: one of the six above, or null if not an application.
  - deadlineAt: ISO timestamp or null.
  - nextAction: the single next thing the student must do, imperative and specific — "Complete online assessment", "Confirm Thursday 14:00 slot". Null if there is nothing to do.
  - confidence: your confidence in this classification, 0 to 1. Be honest. Low confidence routes the email to human review, which is the correct outcome when the email is genuinely ambiguous.`;
}

/**
 * The user message. Contains the email itself.
 *
 * This is the only place subject and body leave the pipeline, and they go to
 * the model — never to a log, never to the database. The returned string is
 * held only for the duration of the request.
 */
export function buildUserMessage(email: RawEmail): string {
  return `From: ${email.fromAddress}
Received: ${email.receivedAt.toISOString()}
Subject: ${email.subject}

${email.body}`;
}
