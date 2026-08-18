# GradTracker — a guided tour of the codebase

**Who this is for:** anyone on the team who needs to understand how this project works, without having to read 7,000 lines of TypeScript first. It assumes you can read basic code and have seen a website before. It does not assume you know React, Zod, Drizzle, or what a "port and adapter" is — those are explained as they come up.

**How to read it:** top to bottom the first time. After that, use it as a map — each section says which files it is describing, so you can jump to the real code.

---

## 1. What the product actually does

A final-year student applies to 30 or 40 graduate programs. Every one of them replies by email — confirmations, online assessment invitations, interview bookings, rejections — from a different system, in a different format, with the deadline buried three paragraphs down. Most students end up keeping a spreadsheet, and the spreadsheet goes stale within a week.

GradTracker reads that inbox and builds the spreadsheet for them. One screen, one ordering: **the most urgent thing is at the top.**

That is the entire product. Everything in the codebase is in service of two hard problems underneath it:

1. **Reading an email correctly.** "Complete your online assessment by Friday" has to become `stage: assessment, deadline: 2026-03-14T13:29Z`. That is what the AI classifier does.
2. **Knowing which application an email belongs to.** An email from `criteriacorp.com` about "Grad 26 Cognify" and an email from `smartrecruiters.com` about "your KPMG application" are the *same job*. Getting this wrong destroys a student's history.

---

## 2. The whole system in one page

Here is the life of a single email, start to finish. Every step is a real function you can go and read.

```
     Gmail
       │
       ▼
 ┌───────────────┐   Is this even worth looking at?
 │  preFilter    │   Skips the student's own sent mail, calendar
 └───────┬───────┘   notifications, bounce messages.
         │
         ▼
 ┌───────────────┐   Have we seen this exact message before?
 │  idempotency  │   If yes, stop. Costs nothing, changes nothing.
 └───────┬───────┘
         │
         ▼
 ┌───────────────┐   Claude reads subject + body and returns structured
 │  classifyOne  │   fields: company, role, stage, deadline, confidence.
 └───────┬───────┘   ← THE RETENTION BOUNDARY. Subject and body are
         │             dropped here and never travel further.
         ▼
 ┌───────────────┐   Not a job application? Counted, then discarded.
 │  isApplication│   Nothing is written to the database at all.
 └───────┬───────┘
         │
         ▼
 ┌───────────────┐   Confidence below 0.75? Don't assert it as fact —
 │  review gate  │   put it in a queue and ask the student.
 └───────┬───────┘
         │
         ▼
 ┌───────────────┐   Does this belong to an application we already know
 │   findMatch   │   about, or is it a new one?
 └───────┬───────┘
         │
    ┌────┴────┐
    ▼         ▼
 new job   existing job
              │
              ▼
        ┌───────────────┐   Should the stage move? "applied" arriving
        │  decideStage  │   after "interview" must not drag it backwards.
        └───────┬───────┘
                ▼
        ┌───────────────┐   Write the fields — unless the student has
        │applyExtraction│   corrected them by hand, in which case leave
        └───────┬───────┘   their answer alone. Forever.
                ▼
          jobs + email_events rows
                │
                ▼
        GET /api/jobs  →  ranked  →  React dashboard
```

Read that once more, because the rest of this document is just detail hanging off it.

---

## 3. Vocabulary

You will hit these words in every file. Learn them now and the code stops looking cryptic.

| Term | What it means here |
|---|---|
| **Job** | One application to one role at one company. Confusingly *not* "a task" — it's the thing shown as a row on the dashboard. Table: `jobs`. |
| **Email event** | One email that was about a job. The timeline you see in the detail panel is a list of these. Table: `email_events`. |
| **Stage** | Where an application has got to: `applied`, `assessment`, `interview`, `offer`, `rejected`, `withdrawn`. Exactly six, defined once. |
| **Classification** | What the AI extracted from one email: company, role, stage, deadline, next action, and a confidence between 0 and 1. |
| **Confidence** | How sure the model is, 0 to 1. Below 0.75 the email goes to the review queue instead of being treated as fact. |
| **Provenance** | Who decided a field's value — the AI (`ai`) or the student (`human`). This is what makes a correction stick. |
| **Fixture** | A fake email stored as a file in `fixtures/`, paired with the correct answer. Used for testing and offline demos. |
| **Port / adapter** | A port is an interface ("something that can fetch emails"); an adapter is a real implementation of it (real Gmail, or the fake that reads fixtures). |
| **Retention boundary** | The one point in the code where email subjects and bodies stop existing. Nothing past it can leak them, because nothing past it *has* them. |

---

## 4. How the repository is laid out

This is a **monorepo**: several related packages living in one Git repository, managed together. `package.json` at the root declares them as `workspaces`, which means one `npm install` at the top installs everything and the packages can import each other by name.

```
GradTracker/
├── packages/
│   ├── shared/      Types and validation rules used by BOTH sides
│   ├── server/      The API, the database, and all the real logic
│   └── client/      The React dashboard in the browser
├── GradTracker Design System/   Pre-built UI components (buttons, badges…)
├── fixtures/        80 fake emails + the correct answer for each
├── docs/            Planning and reference documents (incl. this one)
└── package.json     Workspace definitions and the npm scripts
```

Three things worth understanding about *why* it is split this way:

**`shared` exists so the client and server can never disagree.** If the server decides a job has six possible stages and the client thinks there are seven, you get bugs that only appear in production. So the six stages are defined once, in `packages/shared/src/schema/stage.ts`, and both sides import that. Same for every type that crosses between them.

**`server` holds all the logic, not just database calls.** Deciding whether a stage should advance, whether two emails are the same application, what order to show things in — all of it is server-side, in `packages/server/src/domain/`. The client is mostly display.

**The design system is a separate folder, outside the packages.** It is a library of ready-made UI components. The client keeps a *copy* of it in `src/ds/vendor/` (more on that in §9).

---

## 5. `packages/shared` — one source of truth

Start here, because everything else references it.

### Zod, in one paragraph

TypeScript types vanish when the code runs. If a server sends `{"stage": "banana"}`, TypeScript cannot stop it — the type checker ran on your laptop, not at runtime. **Zod** solves this: you write a *schema* that exists as real code at runtime, and you get the TypeScript type out of it for free.

```ts
// packages/shared/src/schema/stage.ts:12
export const StageEnum = z.enum([
  "applied", "assessment", "interview", "offer", "rejected", "withdrawn",
]);

export type Stage = z.infer<typeof StageEnum>;   // ← the type, derived
```

`StageEnum.parse("banana")` throws at runtime. `Stage` is a normal TypeScript union type. One definition, both protections. This pattern is used for every shape in the project.

### The three files that matter

**`schema/stage.ts`** — the six stages, plus the rules about them:

```ts
export const STAGE_RANK = { applied: 1, assessment: 2, interview: 3, offer: 4,
                            rejected: 0, withdrawn: 0 };        // :31
export const TERMINAL_STAGES = new Set(["rejected", "withdrawn"]);  // :41
export const ALWAYS_APPLIES  = new Set(["rejected", "offer"]);      // :50
export const USER_ONLY_STAGES = new Set(["withdrawn"]);             // :56
```

Read those four lines carefully — they encode real decisions. Ranks let the code check "is this stage further along than that one?" with a `>`. Terminal stages are ends of the road. `ALWAYS_APPLIES` means an offer or rejection is believed no matter what stage the job was in. `USER_ONLY_STAGES` means **the AI is never allowed to withdraw an application on the student's behalf** — only a human can.

**`schema/classification.ts`** — what the AI must return for one email:

```ts
export const ClassificationSchema = z.object({   // :20
  isApplication: z.boolean(),
  company: z.string().min(1).max(160).nullable(),
  role: z.string().min(1).max(160).nullable(),
  stage: StageEnum.nullable(),
  deadlineAt: z.string().datetime().nullable(),
  nextAction: z.string().max(120).nullable(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().max(300).optional(),     // dev-only, never stored
});
```

This one schema does three jobs at once: it tells Claude what shape to reply in, it validates the reply, and it types everything downstream.

Note `nullable()` on company and role. The model is *required* to say "I don't know" rather than guess. A wrong guess enters the pipeline as a fact; a null gets caught and asked about.

**`schema/api.ts`** — the request and response shape of every API endpoint.

---

## 6. `packages/server` — ports and adapters

### The pattern, with an analogy

Your laptop charger has a plug. The laptop does not care whether the electricity behind the wall socket comes from coal, solar, or a diesel generator — it only cares that the socket has the right shape.

A **port** is the socket: an interface describing what you need. An **adapter** is what's behind it.

GradTracker has exactly two ports, in `packages/server/src/ports/`:

```ts
// ports/gmail-client.ts:44
export interface GmailClient {
  listSince(historyId: string | null, pageToken?: string): Promise<GmailPage>;
  fetchMessage(id: string): Promise<RawEmail>;
}

// ports/email-classifier.ts
export interface EmailClassifier {
  classify(email: RawEmail): Promise<ClassificationResult>;
}
```

And two sets of adapters in `adapters/`: real ones (Gmail API, Anthropic API) and fake ones that read the fixture corpus. `adapters/index.ts` picks between them based on the `GMAIL_ADAPTER` and `CLASSIFIER_ADAPTER` environment variables, and **forces fake whenever `NODE_ENV=test`** — so a test run can never accidentally call a paid API.

This is why you can clone this repo with no Google account and no API key and still run the whole thing.

The fake Gmail client (`adapters/gmail/fake.ts`) is worth a look because it is not a stub that returns three canned emails. It simulates paging, an advancing cursor, and cursor *expiry* — the situations where a bug loses a student's email permanently.

### The retention boundary

This is the most important idea in the codebase, and it is enforced by a *type*.

The rule: **no email subject or body is ever stored, logged, or written anywhere.** GradTracker reads a student's private inbox; the promise is that nothing but extracted facts survives.

Most projects would enforce that with a code review comment saying "remember not to log the body". This one enforces it structurally:

```ts
// domain/classify/pipeline.ts:28
export interface ClassifiedEmail {
  gmailMessageId: string;
  gmailThreadId: string;
  receivedAt: Date;
  senderDomain: string | null;      // ← "greenhouse.io", never the full address
  classification: Omit<Classification, "reasoning">;
  model: ClassifierModel;
}
```

`RawEmail` (which has `subject`, `body`, `fromAddress`) goes into `classifyOne()` at line 94. A `ClassifiedEmail` comes out. It has no subject, no body, no sender address — only the *domain*, so the UI can say "detected from a Greenhouse email".

Everything downstream receives a `ClassifiedEmail`. **It is structurally incapable of persisting content it cannot see.** Two tests police this: `db/schema.retention.test.ts` fails if anyone adds a `subject` column, and `domain/classify/retention.test.ts` checks the pipeline itself.

There's a matching guard for logs in `ports/redact.ts`: if an email needs to appear in a log line or an error message, it appears as an `EmailRef` — ids, domain, timestamp, nothing else.

---

## 7. The pipeline, step by step

**File: `packages/server/src/domain/classify/pipeline.ts`.** If you read one file in this project, read this one. `processEmail()` at line 162 is the spine of the entire product.

### Step 1 — pre-filter (line 57)

A cheap check before spending money on a model call. It skips three things: mail the student sent themselves, calendar notifications, and bounce/delivery daemons.

Note what the comment there insists on: the pre-filter **must never make a classification judgement**. A rule like "no 'application' in the subject → drop it" would create *false negatives* — silently missed applications that never even reach the model, and therefore never show up in accuracy measurements either. The comment records that an earlier version dropped a genuine Google confirmation this way.

### Step 2 — idempotency

```ts
if (await deps.repo.hasProcessedMessage(userId, raw.gmailMessageId)) {
  return { kind: "already-processed" };
}
```

Idempotent means "running it twice does the same thing as running it once". If a sync crashes halfway and restarts, already-processed emails cost nothing. Note the ordering: this check comes *before* the model call, not after.

### Step 3 — classify, and drop the content (line 94)

```ts
const { reasoning: _discarded, model, usage: _usage, ...classification } = result;
```

`reasoning` is a debugging field where the model explains itself — which means it *quotes the email*. It is destructured out here and never returned, so it cannot end up in a log.

### Step 4 — not an application

```ts
if (!c.isApplication) return { kind: "not-application" };
```

Counted, never stored. No row, no id, not even the domain. In the demo harvest, 12 of 52 emails ended here — OTP codes, a loan confirmation, shop promotions with the word "offer" in the subject.

### Step 5 — the review gate

```ts
if (c.confidence < deps.reviewThreshold) {     // default 0.75
  const event = await deps.repo.insertEmailEvent(userId, {
    ...common, jobId: null, reviewStatus: "pending",
  });
  return { kind: "queued-for-review", eventId: event!.id };
}
```

Below the threshold, the email becomes a *question* rather than a *fact* — an event with **no job attached**, so nothing is asserted until the student confirms it. The same happens if company or role came back null.

### Step 6 — matching (see §8)

Either a new job is created, or the email attaches to an existing one.

### Step 7 — stage decision and provenance (see §8)

### Step 8 — record the event

Every accepted email inserts an `email_events` row, which is what draws the timeline in the UI. It also advances `lastEventAt` — even when nothing changed, because an employer saying "still reviewing" means the job is not stale.

---

## 8. The three algorithms

These are the parts that are genuinely clever. Each lives in its own file, is a **pure function** (no database, no clock, no network — same input, same output), and has a dedicated test file.

### 8a. Matching — which application does this email belong to?

**File: `domain/matching/match.ts`.** The guiding rule is at the top of the file and worth quoting: *over-merging is worse than duplicating.* A duplicate row is visible and the student can fix it. A wrong merge silently destroys a real application's history, and nobody finds out until a deadline is missed.

**Normalising the company** (line 41) strips legal noise so the same employer matches itself:

```
"Macquarie Group"  → "macquarie"
"Deloitte Pty Ltd" → "deloitte"
"Bain & Company"   → "bain company"   ← "Company" survives; "Co" would not
```

**Normalising the role** (line 84) strips words that appear in *every* graduate job title — "graduate", "program", "intern", "2027" — leaving only the distinguishing part:

```
"2027 Graduate Program - Technology"        → "technology"
"2027 ANZ Graduate Program - Data (Sydney)" → "anz data sydney"
```

The comment explains why: without stripping, "Graduate Engineer" and "Graduate Trader" score 0.60 similar, because the shared word "Graduate" is most of both strings — and two completely different applications would merge.

**Comparing the leftovers** uses the **Sørensen–Dice coefficient** (line 105). Don't be put off by the name; it is simple. Chop each string into overlapping two-character pairs, count how many pairs they share, and divide:

```
"technology" → te, ec, ch, hn, no, ol, lo, og, gy   (9 pairs)
"technical"  → te, ec, ch, hn, ni, ic, ca, al       (8 pairs)
shared: te, ec, ch, hn = 4

score = (2 × 4) / (9 + 8) = 0.47
```

0.6 or above (`ROLE_SIMILARITY_THRESHOLD`, line 162) counts as the same role. Character pairs are used rather than whole words because titles vary by word order and inflection — "Graduate Engineer" and "Engineering Graduate" are the same job.

**`findMatch()` (line 196)** puts it together:

1. Normalised company must match **exactly**. No fuzzy matching on company — that is the guard against merging PwC with PwC Legal.
2. Among that company's jobs, if role similarity ≥ 0.6, it's a match.
3. Otherwise fall back to the **sender domain** — the same ATS domain at the same company. This catches employers who rename a role mid-process.

A known cost of rule 3, found by running this on a real inbox: two genuinely different applications at the *same* employer, sent from the *same* ATS, will merge. Macquarie's "Graduate Program – Technology" and "ANZ Graduate Program – Data (Sydney)" both come from `recruitment.macquarie.com`, and they collapsed into one job. The file's own header warns about exactly this trade-off.

Rule 3 also has a subtle guard worth noticing: a `null` domain never matches another `null` domain. "Unknown" is not an identity.

### 8b. The stage engine — should this application move forward?

**File: `domain/stages/engine.ts`, `decideStage()` at line 41.**

The problem: emails do not arrive in order. Gmail can deliver a confirmation after an interview invite. A rejection can arrive before the acknowledgement it supersedes. A re-sync replays history from the start. The engine's entire job is to make the stage **independent of arrival order**.

The rules, in the order they are checked:

| Check | Outcome | Why |
|---|---|---|
| No stage detected | ignore | The email said nothing about progress |
| Field is human-locked | ignore | A human decision outranks everything |
| Detected stage is `withdrawn` | ignore | The AI may never withdraw for the student |
| Job is already `withdrawn` | ignore | The student chose it; a later rejection doesn't overwrite it |
| Detected is `offer` or `rejected` | **apply** | These can arrive from anywhere, and the newest wins |
| Job is already terminal | ignore | Ordinary emails after a rejection are stale replays |
| Detected rank > current rank | **apply** | Forward only |
| Otherwise | ignore | Would regress |

This is why, in the real harvest, KPMG's "application submitted" email arriving 24 seconds *after* the assessment invitation did not drag the job back from `assessment` to `applied`.

The same file has two smaller functions: `isFollowUpRequired()` (line 84) flags a job as needing chasing if nothing has happened for longer than its stage tolerates (14 days at `applied`, 5 at `assessment`), and `deriveNextAction()` (line 101) decides the one line of text a row shows.

Note that staleness is **computed, never stored** — a stored "needs follow-up" flag would be wrong by the following morning.

### 8c. Ranking — what goes at the top?

**File: `domain/ranking/rank.ts`.** The product's whole promise is "your most urgent thing is at the top", and it reduces to one comparator function being right.

Jobs are sorted on four keys in order (line 89):

1. **Urgency bucket** ascending — overdue (0), imminent ≤2 days (1), soon 3–7 (2), far 8–14 (3), none (4)
2. **Stage rank** descending — an offer outranks an application
3. **`lastEventAt`** ascending — stalest first
4. **Company A–Z** — a stable tiebreak

That fourth key looks pointless but is not: without it, two jobs identical on the first three keys would swap places between page loads, which reads as a bug.

**The timezone detail** (`daysUntil`, line 49) is the subtlest code in the project. The naive version:

```ts
const days = (deadline - now) / 86400000;   // WRONG
```

At 11pm on Thursday, a Friday 9am deadline is 0.4 "days" away — so it rounds to 0 and the UI says "due today" for something due *tomorrow*. The real implementation converts both instants to a calendar date **in the student's timezone** and subtracts whole days. The browser sends its timezone in an `x-timezone` header on every request, and the server ranks with it, so the ordering and the label can never disagree.

---

## 9. Storing things: the database layer

### The schema — `db/schema.sqlite.ts`

Five tables, described with **Drizzle**, a library that lets you define tables in TypeScript and get type-safe queries out of it.

| Table | Holds |
|---|---|
| `users` | One row per student. Note: **no password column**, deliberately — sign-in is Google only. |
| `jobs` | One row per application. The dashboard rows. |
| `email_events` | One row per email that mattered. The timeline. **This is the retention boundary** — no subject, body, or sender address column may ever exist here. |
| `job_field_provenance` | Who set each field: `ai` or `human`. One row per (job, field). |
| `sync_state` | The Gmail cursor and progress counters. |

There is a second schema file, `schema.pg.ts`, for PostgreSQL in production. `schema.parity.test.ts` fails if the two ever drift apart.

### The repository — `db/repository.ts`

The **only** code allowed to touch the database. Everything else calls these functions. The design point is in the header:

> **Every method takes `userId` as its first argument.** Omitting it is an arity error; passing an unbranded string is a type error.

That second half refers to a trick in `shared/src/schema/stage.ts:125`:

```ts
export type UserId = string & { readonly __brand: "UserId" };
```

A "branded type" is a string that TypeScript refuses to treat as an ordinary string. You cannot accidentally pass a job id where a user id belongs — it will not compile. So one user reading another user's data is a **compile-time failure**, not a runtime data leak.

---

## 10. The API — `packages/server/src/routes/`

Express, three route files, all mounted in `app.ts`.

**`routes/jobs.ts`** — `GET /api/jobs` (ranked list + the four stat-card numbers), `GET /api/jobs/:id` (one job with its timeline), `PATCH /api/jobs/:id` (inline correction), `POST /api/jobs/:id/withdraw`.

Two deliberate behaviours that look like bugs until you know why:

- **A job belonging to another user returns 404, not 403.** A 403 says "this exists but isn't yours", which is itself a disclosure.
- **There is no `?sort=` parameter.** The ranking is the product's one opinion. A student who can sort by company name has rebuilt the spreadsheet this exists to replace.

**`routes/review.ts`** — the queue of low-confidence detections, plus confirm and dismiss. The key line in its header: everything the student confirms is written as `human`, not `ai`. They looked at it and said yes, so a later sync must not overwrite it. Dismissed items are *marked*, never deleted — the unique constraint on `(user_id, gmail_message_id)` is what stops a re-sync resurrecting an email the student already rejected.

**`routes/sync.ts`** — `GET /api/sync/status` works. `POST /api/sync` returns **501 Not Implemented** with an explanation, because the sync orchestrator is deferred. The comment is worth internalising: *a "Refresh" button that appears to work and does not is worse than one that says it cannot.*

**`middleware/validate.ts`** validates every request body against a Zod schema at the boundary. Unknown fields are stripped, which is a security property — a client cannot smuggle `status` or `userId` into a PATCH.

**`middleware/context.ts`** is demo-mode authentication: it resolves the single local user instead of reading a session cookie. Real OAuth is deferred. Because that is exactly the kind of gap that ships by accident, it refuses to start unless `ALLOW_UNAUTHENTICATED=1` is set, and refuses outright when `NODE_ENV=production`.

---

## 11. `packages/client` — the dashboard

A React single-page app, built with Vite.

### Structure

```
src/
├── main.tsx        Boots React, installs icons, wraps in providers
├── App.tsx         The routes
├── shell/          Sidebar + toasts — the frame around every page
├── views/          The actual screens
├── api/client.ts   Typed wrapper around fetch()
├── hooks/          useAsync — loading/error/data state
├── format.ts       Date formatting, and nothing else
└── ds/             The design system
```

### Routing

`App.tsx` maps URLs to views. The interesting choice: the detail panel is a **route** (`/pipeline/:jobId`), not a piece of component state. That means a student can bookmark one application, and the browser back button closes the panel instead of leaving the pipeline entirely.

Several routes deliberately render a `BlankView` that says what is missing and when it is planned. Blank means blank — no placeholder content pretending to be a feature.

### Data fetching — `hooks/useAsync.ts`

One small state machine used by every view: `{ data, loading, error, offline, reload }`. Two details worth stealing for your own projects:

- `offline` is separate from `error`. "We couldn't reach the server" and "the server said no" are different situations with different fixes, and the UI shows a different thing for each.
- The effect sets a `cancelled` flag on cleanup, so a slow first request cannot overwrite a fast second one.

### The API client — `api/client.ts`

Every response is **parsed** with the shared Zod schema, not just cast:

```ts
return ListJobsResponseSchema.parse(await response.json());
```

If the server's contract changes, this fails loudly right here, next to the request — rather than three components deep as `undefined is not an object`.

It also attaches the browser's timezone to every request as the `x-timezone` header.

### The design system — `src/ds/`

The `GradTracker Design System/` folder at the repo root is a library of pre-built components: `Button`, `StageBadge`, `ApplicationRow`, `StatCard`, and so on, plus design tokens (colours, spacing, type) as CSS variables.

Because that folder sits outside the packages and has a space in its name, the client keeps a **synced copy** in `src/ds/vendor/`, produced by `scripts/sync-ds.mjs`. A test (`ds.sync.test.ts`) fails if the copy drifts from the source, so it cannot silently rot.

`src/ds/index.ts` re-exports the public surface. Views import from `../ds`, never from `vendor/` directly.

There is a strict rule enforced by `no-hardcoded-colour.test.ts`: **no file in `src/` may declare a colour.** Everything uses a token like `var(--surface-page)`. That is what makes the light/dark toggle work everywhere at once.

### The main screen — `views/PipelineView.tsx`

Worth reading for one line of its header comment: *the list arrives already ranked by the server, and nothing here re-sorts it.* Stage chips filter and tabs switch between Active and Archived; neither touches the order.

---

## 12. Fixtures and the accuracy harness

This is the part most student projects skip, and it is arguably the most valuable thing in the repository.

### The corpus — `fixtures/`

80 emails, each stored twice:

```
fixtures/emails/001-deloitte-oa-invite.json     ← the email
fixtures/expected/001-deloitte-oa-invite.json   ← the correct answer
```

```json
{ "isApplication": true, "company": "Deloitte", "role": "Audit Graduate Program",
  "stage": "assessment", "deadlineAt": "2026-05-23T13:59:00+00:00",
  "hasExplicitDeadlineLanguage": true }
```

The corpus mixes genuine application emails with deliberate **hard negatives** — LinkedIn job alerts, a bank statement, marketing offers — because a classifier that says "yes" to everything scores 100% on a corpus of only positives.

`corpus/loader.ts` validates the labels on load rather than trusting them. A mislabelled fixture would silently corrupt every accuracy number derived from it, and the resulting figure would look perfectly reasonable.

### The harness — `harness/`

`npm run accuracy` runs the classifier over all 80 fixtures, compares to the labels, and prints a report.

The numbers it computes, in plain English. Imagine 80 emails, 50 of them genuinely applications:

- **True positives** — application emails correctly identified.
- **False positives** — junk wrongly called an application. Annoying but *visible*: a wrong row appears and the student deletes it.
- **False negatives** — a real application missed. **This is the expensive one** — the student never learns it existed, and misses the deadline.
- **Precision** = of everything we called an application, how much really was. Punishes false positives.
- **Recall** = of all real applications, how many we caught. Punishes false negatives.

The gates in `harness/metrics.ts:251`:

```ts
export const THRESHOLDS = { ACCURACY: 0.95, DEADLINE_DETECTION: 0.8 };
```

95% overall accuracy, 80% of explicit deadlines detected. **The command exits non-zero when a threshold fails**, which is what makes it a gate rather than a report someone reads once and forgets.

The prompt in `adapters/classifier/prompt.ts` is version-stamped (`PROMPT_VERSION`) and printed with every report — because "96.3% accuracy" from an unknown prompt is a number, not evidence.

### The escalation trick — `domain/classify/escalate.ts`

Every email is classified by Claude Haiku (fast, cheap). If it comes back with confidence below 0.6, the same email is re-classified by Claude Sonnet (slower, stronger). You pay for the expensive model only on the hard minority.

The implementation is elegant: `EscalatingClassifier` is itself an `EmailClassifier` that wraps two others, so the pipeline never learns escalation exists.

Note the comment on why the escalated answer *replaces* the first rather than being blended: combining two disagreeing classifications produces a result neither model actually gave, which is untraceable when a human reviews it.

---

## 13. The tests

21 test files, run with `npm test` (Vitest). They fall into three groups:

**Logic tests** — pure functions with known answers: `match.test.ts`, `engine.test.ts`, `rank.test.ts`, `apply.test.ts`, `pipeline.test.ts`.

**Contract tests** — things that must not drift apart: `schema.parity.test.ts` (SQLite vs Postgres schemas), `ds.sync.test.ts` (design system copy vs source), `corpus.test.ts` (fixture labels are valid).

**Guard tests** — rules that must never be broken, even by accident:

| Test | Fails if… |
|---|---|
| `schema.retention.test.ts` | anyone adds a `subject`/`body`/`from_address` column |
| `domain/classify/retention.test.ts` | the pipeline lets content past the boundary |
| `no-hardcoded-colour.test.ts` | any file in `src/` writes a raw colour |
| `harness.test.ts` | a deliberately broken classifier *doesn't* fail the gate |

That last one is a nice idea: it tests the test. A quality gate that cannot detect a broken classifier is worthless, so they break one on purpose and assert that the harness notices.

---

## 14. Running it yourself

### Normal setup

```bash
npm install
cp .env.example .env      # works unedited — both adapters default to "fake"
npm run typecheck         # also compiles the server to dist/
npm run db:migrate        # creates dev.db
npm run db:seed           # 25 sample applications
```

Then two terminals:

```bash
ALLOW_UNAUTHENTICATED=1 npm run dev:server    # API on :3000
npm run dev:client                            # dashboard on :5173
```

### On a machine with no Node installed

Some of our machines have **Bun** but not Node. The `npm` scripts will fail with `command not found` — and note that piping into `tail` can hide that failure, so check exit codes. Bun runs the same code:

```bash
~/.bun/bin/bun install
~/.bun/bin/bunx tsc --build
DATABASE_URL="file:./dev.db" ~/.bun/bin/bun packages/server/dist/db/migrate.js
DATABASE_URL="file:./dev.db" ~/.bun/bin/bun packages/server/dist/db/seed-cli.js
ALLOW_UNAUTHENTICATED=1 DATABASE_URL="file:./dev.db" ~/.bun/bin/bun packages/server/dist/server.js
SERVER_ORIGIN=http://localhost:3000 ~/.bun/bin/bunx vite --config packages/client/vite.config.ts packages/client
```

The npm scripts use `node --env-file-if-exists=.env`, a Node-specific flag Bun doesn't accept — which is why these call the compiled files in `dist/` directly and pass `DATABASE_URL` inline. Bun loads `.env` automatically anyway.

### Three ways to fill the database

| | Command | Gives you |
|---|---|---|
| **Seed** | `npm run db:seed` | 25 invented applications covering every stage and every urgency bucket. Deadlines are relative to now, so it never goes stale. Best for UI work. |
| **Fixtures** | the fake adapters, used by tests | The 80-email corpus. Best for testing the pipeline. |
| **Harvest** | `npm run harvest -- <file.json>` | Real emails from a real inbox, classified in-session, run through the **real** pipeline. Best for finding out what actually breaks. |

The harvest file lives **outside** the repository because it contains real subjects and bodies. Only extracted fields reach the database.

---

## 15. Where to start reading

If you have an hour:

1. `packages/shared/src/schema/stage.ts` — 130 lines, and the vocabulary of everything else
2. `packages/server/src/domain/classify/pipeline.ts` — the spine
3. `packages/server/src/domain/matching/match.ts` — the cleverest part
4. `packages/server/src/routes/jobs.ts` — how it reaches the browser
5. `packages/client/src/views/PipelineView.tsx` — how it gets drawn

If you need to change something:

| To change… | Go to… |
|---|---|
| What the AI is asked to extract | `adapters/classifier/prompt.ts` and `shared/schema/classification.ts` |
| Which emails get skipped before the model | `pipeline.ts` → `preFilter()` |
| When two emails count as the same application | `domain/matching/match.ts` |
| Whether a stage advances | `domain/stages/engine.ts` |
| What order the dashboard shows | `domain/ranking/rank.ts` |
| A database column | both `schema.sqlite.ts` **and** `schema.pg.ts`, then `npm run db:generate` |
| Anything visual | the design system, not the views |

---

## 16. What is not built yet

Being clear about this saves you hunting for code that does not exist:

- **Google OAuth and sessions** (T4.1–T4.3) — demo mode resolves a single local user instead
- **The live Gmail adapter** (T7.2) — the fake reads fixtures; real emails come in via harvest
- **The live Claude adapter** (T7.3) — same
- **The sync orchestrator** (T3.8) — no incremental "Refresh"; `POST /api/sync` honestly returns 501
- **The review queue screen** (T6.3) — `GET /api/review` works and returns the pending items; only the UI is missing
- **Settings, Calendar, Archive screens** — blank on purpose
- **Postgres deployment** (T8.5) — the schema exists and is parity-tested; nothing is deployed

Each is deferred with its acceptance criteria intact in `docs/tasks.md`, not deleted.

---

## 17. The one idea to take away

Nearly every design decision in this codebase follows the same principle:

> **Make the wrong thing impossible, rather than asking people to remember not to do it.**

- Email content can't be stored — the type going past the boundary doesn't have it.
- One user can't read another's data — the repository won't compile without a branded `UserId`.
- The client and server can't disagree about a type — there is only one definition.
- A correction can't be silently reverted — one function owns every write and checks provenance first.
- A broken classifier can't ship — the accuracy gate exits non-zero.

Comments explain *why* a decision was made, because the "what" is already in the code. When you add to this project, follow the same pattern: if you find yourself writing "remember to…", ask whether the compiler or a test could remember it for you instead.
