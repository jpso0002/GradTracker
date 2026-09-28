# Labelling guide

**The one reference for labelling emails for GradTracker's accuracy evaluation** (T2.12,
used for T8.3). If the guide and your instinct disagree, follow the guide. If the guide is
silent, label what you think is right, say what you did in `notes`, and raise it with the
team — the answer is added here so the next labeller does the same.

**Why this matters.** The model is scored against what you write, so a wrong or inconsistent
label is a wrong accuracy figure. Labellers must agree with each other (we measure it, §7) and
with the rules the model was given. **Text in grey quote boxes is the classifier prompt's own
wording** ([`prompt.ts`](../packages/server/src/adapters/classifier/prompt.ts)); a test fails
if this page and the prompt drift apart.

---

## 1. Privacy first

- **Label your own mail only.** Nobody reads anyone else's inbox (D32).
- The spreadsheet contains real email. Keep it, and everything the toolkit writes, **outside
  the GradTracker folder** — the toolkit refuses to write inside it — and out of shared chats.
- **Leaving an email out is always allowed:** leave `is_application` blank and the import
  skips it (and counts it). Use this for your own sent mail, which GradTracker never
  classifies, and for anything you would not want in the evaluation.
- If `body_truncated` says `yes` and the part you need is missing, leave the row out rather
  than guess.

## 2. Is it an application email? (`is_application`)

The prompt's definition:

> An email about an application THIS student has already submitted, or about a process they are already in.

and its test for every hard case:

> The distinguishing question is always: **has this student already applied, or is this email inviting them to?** If it is inviting them, it is not an application.

**`no`** — even when it names an employer you applied to, a real role and a deadline:

> - Job alerts and recommendations (LinkedIn, Seek, Indeed, "jobs you may be interested in").
> - Careers-service newsletters, employer events, webinars, networking invitations.
> - Recruiter cold outreach about a role the student has not applied for.
> - "Someone viewed your profile", "your profile appeared in searches".
> - Anything unrelated to employment.

Also `no`: registering interest or joining a talent community; creating or verifying a portal
account; a reminder to finish an application you never submitted; "applications are now
open" from an employer you have applied to; a friend's email about your application.

**`yes`** includes the easily missed: an informal email from a person about your application,
and a calendar invitation to an interview you are in.

## 3. Company and role

The prompt's rules — the labels follow them exactly:

> Extract only what this email states. You see one email at a time: do not fill a field from other emails or from what you know about the employer.

> - company: the employer's name as the student would recognise it. Not the ATS ("Greenhouse"), not the sending system. Use the name this email gives — in its sentences first, then its sign-off, then its subject — without a country ("PwC Australia" becomes "PwC"), a legal suffix ("Pty Ltd", "Limited", "Co") or team words ("Careers", "Talent", "Graduate Recruitment"). Do not expand or formalise it: "CommBank" stays "CommBank".
> - role: the role title as stated. Do not abbreviate or normalise. Leave out the employer's name and any intake year. Null if this email does not state a role.

The harness compares these exactly, ignoring only case and spacing — "Deloitte" and
"Deloitte Australia" are different answers — which is why the rule is mechanical. In practice:

- A sign-off `Macquarie Group Graduate Recruitment` → `Macquarie Group`; `Zip Co Talent` →
  `Zip`.
- `the CommBank Technology Graduate Program` → company `CommBank`, role `Technology Graduate
  Program`. Keep stream names as written: `Graduate Program, Data & Analytics`.
- **Blank when this email does not say** — even when you know it from earlier emails. A label
  the model could only know from the thread marks it wrong for not guessing.

## 4. Stage

Label the stage **this email** shows, not where the application is overall — the app puts
emails in order itself. The definitions, verbatim from the prompt:

| Stage | Definition |
|---|---|
| `applied` | The application was received or acknowledged. Confirmation emails, 'we have your application', portal submission receipts. |
| `assessment` | An invitation to complete an online assessment, coding challenge, psychometric or video interview. Something the student must DO, usually by a date. |
| `interview` | An invitation to interview, an interview scheduling request, or an assessment-centre invitation. Involves speaking with a person. |
| `offer` | An offer of employment or an internship place. |
| `rejected` | The application was unsuccessful, at any stage. Includes 'we have decided to progress other candidates'. |
| `withdrawn` | The student withdrew their application — typically a confirmation that their own withdrawal was processed. Label it; the app asks the student before applying it. An employer ending the process is rejected, not withdrawn. |

Cases the definitions settle:

- An acknowledgement that **mentions** a future test without inviting you to one → `applied`.
- A one-way recorded video interview → `assessment`. An assessment centre → `interview`.
- "Your application is under review" → `applied`. A reminder about an assessment you were
  invited to → `assessment`.

**`withdrawn`** — label a confirmation of the student's own withdrawal `withdrawn`, as the
definition says. Labelling it changes nothing in the app by itself: GradTracker puts the email
in **Needs review**, and only the student's confirmation sets the stage (C17, fixed by prompt
v2).

## 5. Deadlines

`deadline_language` is `yes` only for an application email that sets a deadline **the student
must meet** — and then `deadline` is required.

> Extract a deadline ONLY when the email states one explicitly — "by Friday 23 May", "within 5 business days", "before 11:59pm AEST on 23/05". Do not treat an interview time as a deadline unless the email frames it as something to respond by.

> These are not deadlines either: when the employer will act ("our team will contact you within 48 hours"), a closing date for other applicants, or when the student may reapply.

Nor is vague urgency ("soon", "at your earliest convenience"). **Is one:** a date to book,
confirm or respond by, and an offer's response date.

**Writing it:** `YYYY-MM-DD HH:MM` (24-hour), or `YYYY-MM-DD` alone for a date with no time,
which the import reads as 23:59 — the prompt's rule:

> If the email gives a date without a time, use 23:59 local to the email's apparent timezone; if no timezone is discernible, use UTC. An Australian employer writing to the student means Australian eastern time unless the email names another city or timezone.

**Resolving it** — the prompt's rules, counted from the `received (Melbourne)` column, which
is also the received time the model is shown:

> - A duration in hours ("expires in 48 hours") is exact: that long after the received time.
> - A count of days, weeks or business days ("within 7 days", "within a week", "within 5 business days") ends at 23:59 on the last day. Business days are Monday to Friday; ignore public holidays.
> - "By", "before", "until" or "no later than" a date with no time means 23:59 on that date.
> - "Close of business" is 17:00. "End of day" is 23:59.
> - A weekday alone ("by Friday") is the first such day on or after the received date.
> - If a weekday and a date disagree, use the date.
> - If there are several deadlines, use the earliest one the student must meet.

Examples from the corpus:

| The email says | Label | Fixture |
|---|---|---|
| A date and a time — "by 11:59pm AEST on Wednesday 27 May" | That time: `2026-05-27 23:59` | 019 |
| A date alone — "by", "until", "no later than", "before", "open until" | The date alone (→ 23:59) | 026, 043, 047 |
| "Close of business" on a date | 17:00 that day | 022 |
| "End of day" | The date alone (→ 23:59) — it names no time | 027 |
| A weekday alone — "by Friday" | The first such day on or after the received date | 027 |
| Hours — "expires in 48 hours" | Exactly that long after the received time | 021 |
| Days or weeks — "within 7 days", "within a week" | The date that many days after the received date (→ 23:59) | 020, 030 |
| Business days — "within 5 business days" | Count Monday–Friday after the received date, ignoring public holidays (→ 23:59) | 023, 037, 045 |
| A weekday and date that disagree — "Friday 23 May" when 23 May is a Saturday | The date, and say so in `notes` | 001 |
| More than one deadline | The earliest one the student must meet | — |

**`deadline_timezone`** — the zone the email states or clearly means. An abbreviation names a
city's zone: AEST/AEDT → `Australia/Melbourne` or `Australia/Sydney` (the same clock), ACST/ACDT →
`Australia/Adelaide`, AWST → `Australia/Perth`, NZST/NZDT → `Pacific/Auckland`, SGT →
`Asia/Singapore`, GMT/BST → `Europe/London`; `Australia/Brisbane` when the email says Queensland
or Brisbane time. Do not correct an "AEST" written during daylight saving — senders use it
loosely for east-coast time; the import works out the offset. With no zone stated, an
Australian employer writing to an Australian student means Australian time — keep the default
`Australia/Melbourne` unless the email names another city. `UTC` only when nothing suggests a
place.

## 6. Worked examples — the hard cases

From the authored corpus (`fixtures/`), where each has a note saying why it is there.

| The email | Label | Why |
|---|---|---|
| LinkedIn: "Graduate Software Engineer at Atlassian and 12 other new jobs", one with "Apply by 30 May" (004) | `no` | An invitation to apply. A deadline to apply is not your deadline. |
| SEEK: "5 new Graduate Data Analyst jobs matching your search", naming employers you *have* applied to (059) | `no` | These listings are invitations, whatever else you applied to. |
| "Someone at Deloitte viewed your profile", while your Deloitte application is live (005) | `no` | Nothing about the application changed. |
| Your university's careers newsletter listing graduate program deadlines (061) | `no` | A newsletter, even from your own university. |
| "Join our graduate insight session", from the Deloitte team that sent your assessment (062) | `no` | Marketing from the right people is still marketing. |
| "EY Graduate Program applications are now open", from EY, where you have applied (066) | `no` | An invitation to apply. |
| "We're hiring — 12 new graduate roles at REA Group", from greenhouse.io (071) | `no` | Same ATS as real updates: the sender never decides it. |
| A recruiter: "Graduate Analyst opportunity — are you open?" (063) | `no` | You never applied. It reads like an interview invitation; it is not one. |
| A friend: "dinner friday?", adding "how did the deloitte thing go" (077) | `no` | Personal mail. |
| "Chat about the Graduate Developer role?", from a person at Xero after your technical exercise (039) | `yes` · `interview` · deadline 26 June | Informal, no booking link — still an invitation to speak with someone, with a date to reply by. |
| "Interview — Associate Product Manager", from SEEK the employer (040) | `yes` · `interview` | SEEK the company, not SEEK the job board. |
| Telstra acknowledgement: "Applications close on 30 June…" (015) | `yes` · `applied` · no deadline | That closing date is for other applicants. |
| Macquarie: panel interview "confirmed for Thursday 18 June at 2:00pm" (034) | `yes` · `interview` · no deadline | An interview's time is not a deadline. |
| IBM: "Our scheduling team will contact you within 48 hours" (042) | `yes` · `interview` · no deadline | Their action, not yours. |
| IBM: "Withdrawal confirmed" (057) | `yes` · `withdrawn` | §4. |

## 7. Doing it

Commands are for Windows PowerShell; on a Mac use `npm` instead of `npm.cmd`. Paths are
examples — anything written must be outside the repository.

1. **Export your own mail** (B6). In Gmail, search for application senders and subjects and
   label the results; do the same for job boards (the hard negatives). Export those labels
   with Google Takeout and save the `.mbox` somewhere like `Documents\gradtracker-private\`.
2. **Inventory** — counts and sender domains only, never a subject or body. Share the counts;
   the held-out size is set from them (D32).
   ```powershell
   npm.cmd run label -- inventory "$HOME\Documents\gradtracker-private\takeout.mbox"
   ```
3. **Export a spreadsheet** — one row per email, oldest first, duplicates removed.
   ```powershell
   npm.cmd run label -- export "$HOME\Documents\gradtracker-private\takeout.mbox" --out "$HOME\Documents\gradtracker-private\labels.xlsx"
   ```
4. **Label** the `Label` tab in Excel or Google Sheets: white columns only, your initials in
   `labeller`. Sorting and filtering are fine; the grey columns must not be edited. The
   `README` tab is a short reminder of this guide.
5. **Import** — every row is checked, each problem is listed by row number, and nothing is
   written unless all rows pass. `--tuning` sets aside your share of the ~40 real tuning emails
   (about 13 each), chosen by seed with the sheet's balance of applications kept; the rest
   become `held-out\`, which is **frozen** — `MANIFEST.json` records a hash of every file.
   ```powershell
   npm.cmd run label -- import "$HOME\Documents\gradtracker-private\labels.xlsx" --out "$HOME\Documents\gradtracker-private\sets" --tuning 13 --seed ds10-2026
   ```
6. **Verify the freeze** before every measurement. A held-out set edited after a model has
   seen it is no longer held-out.
   ```powershell
   npm.cmd run label -- verify "$HOME\Documents\gradtracker-private\sets\held-out"
   ```
7. **Score** — the harness refuses a held-out set that changed since it was frozen. Until the
   live classifier lands (T7.3, T2.8) this runs the fake, which proves the set loads and is
   internally consistent.
   ```powershell
   npm.cmd run accuracy -- --corpus "$HOME\Documents\gradtracker-private\sets\held-out"
   ```

**Agreement (~25 emails labelled twice).** `export --sample 25 --seed <text>` draws the same
25 rows every time from the same export and seed; two people label separate copies, and
`npm.cmd run label -- agreement <first.xlsx> <second.xlsx>` reports agreement per field with
Cohen's κ and lists every disagreement by row. **Pending team confirmation:** whose emails form
the sample. The proposal consistent with §1 is that the owner draws it, reads it first and
deletes any row they would not show a teammate, and the second labeller sees only that file.

**One headline across three inboxes. Pending team confirmation:** each member will hold their own
frozen held-out set. The proposal is that each member scores their own set and the harness pools
the counts, so nobody handles another member's email. Pooling is not built yet.
