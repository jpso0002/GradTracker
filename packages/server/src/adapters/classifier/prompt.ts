import { StageEnum } from "@gradtracker/shared";
import type { RawEmail } from "../../ports/index.js";
import { DEFAULT_TIMEZONE, formatWallClock } from "../../time/zoned-time.js";

/**
 * The classification prompt.
 *
 * **Version-stamped.** Every accuracy figure the harness reports is meaningless
 * without knowing which prompt produced it — "96.3%" from an unknown prompt is
 * a number, not evidence. Bump `PROMPT_VERSION` on any change to the text
 * below, and the harness will print it alongside the result.
 *
 * **v2 (28 September 2026)** brought the prompt into line with the labelling
 * guide, before anything is measured (T3.12, D34): a withdrawal confirmation is
 * recognised rather than forbidden (C17); the guide's deadline conventions and
 * naming rule are stated; fields come from this email alone; and the received
 * time is given in the student's timezone (C20).
 */

export const PROMPT_VERSION = "v2";

/** What each stage means, in the model's terms. Deliberately concrete: "an
 *  invitation to complete a test" is checkable, "the assessment stage" is not.
 *
 *  Exported so labellers read the same words the model does: the labelling
 *  spreadsheet quotes these, and a test fails if the labelling guide drifts
 *  from them (T2.12). */
export const STAGE_DEFINITIONS: Record<(typeof StageEnum.options)[number], string> = {
  applied:
    "The application was received or acknowledged. Confirmation emails, 'we have your application', portal submission receipts.",
  assessment:
    "An invitation to complete an online assessment, coding challenge, psychometric or video interview. Something the student must DO, usually by a date.",
  interview:
    "An invitation to interview, an interview scheduling request, or an assessment-centre invitation. Involves speaking with a person.",
  offer: "An offer of employment or an internship place.",
  rejected:
    "The application was unsuccessful, at any stage. Includes 'we have decided to progress other candidates'.",
  // Recognising a withdrawal changes nothing by itself: the pipeline turns it
  // into a question for the student, who alone may set this stage (C17).
  withdrawn:
    "The student withdrew their application — typically a confirmation that their own withdrawal was processed. Label it; the app asks the student before applying it. An employer ending the process is rejected, not withdrawn.",
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

Today's date is ${today.toISOString().slice(0, 10)}. Resolve relative dates such as "by Friday" or "within 5 business days" against the date the email was received in the student's timezone, which is given below — not against today.

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

These are not deadlines either: when the employer will act ("our team will contact you within 48 hours"), a closing date for other applicants, or when the student may reapply.

Return the deadline as an ISO 8601 timestamp. If the email gives a date without a time, use 23:59 local to the email's apparent timezone; if no timezone is discernible, use UTC. An Australian employer writing to the student means Australian eastern time unless the email names another city or timezone.

Resolving what the email says:

  - A duration in hours ("expires in 48 hours") is exact: that long after the received time.
  - A count of days, weeks or business days ("within 7 days", "within a week", "within 5 business days") ends at 23:59 on the last day. Business days are Monday to Friday; ignore public holidays.
  - "By", "before", "until" or "no later than" a date with no time means 23:59 on that date.
  - "Close of business" is 17:00. "End of day" is 23:59.
  - A weekday alone ("by Friday") is the first such day on or after the received date.
  - If a weekday and a date disagree, use the date.
  - If there are several deadlines, use the earliest one the student must meet.

## Fields

Extract only what this email states. You see one email at a time: do not fill a field from other emails or from what you know about the employer.

  - company: the employer's name as the student would recognise it. Not the ATS ("Greenhouse"), not the sending system. Use the name this email gives — in its sentences first, then its sign-off, then its subject — without a country ("PwC Australia" becomes "PwC"), a legal suffix ("Pty Ltd", "Limited", "Co") or team words ("Careers", "Talent", "Graduate Recruitment"). Do not expand or formalise it: "CommBank" stays "CommBank".
  - role: the role title as stated. Do not abbreviate or normalise. Leave out the employer's name and any intake year. Null if this email does not state a role.
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
 *
 * The received time is given in the student's timezone as well as in UTC.
 * Relative deadlines count from the local date, and 08:00 in Melbourne is still
 * the previous day in UTC — given only UTC, "within 7 days" resolves a day
 * early (C20). The server stores no per-student timezone, so the demo's
 * Melbourne is the default.
 */
export function buildUserMessage(email: RawEmail, timeZone: string = DEFAULT_TIMEZONE): string {
  return `From: ${email.fromAddress}
Received: ${formatWallClock(email.receivedAt, timeZone)} ${timeZone} (${email.receivedAt.toISOString()})
Subject: ${email.subject}

${email.body}`;
}
