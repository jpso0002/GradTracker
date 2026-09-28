# GradTracker — Architecture & Scope Decision Record

**Project:** GradTracker — AI-powered graduate recruitment tracking dashboard
**Unit:** FIT3162 / FIT3164 / FIT3189 Software Project Part 2 *(FIT3161 / FIT3163 / FIT3188
in semester 1)* · Team of 3
**Status:** Revisions 1–2 agreed before implementation began. Revision 3 records decisions
taken mid-build, reconciled against the working repository.

| Revision | Date | Covers |
|---|---|---|
| 1 | 16 August 2026 | Initial architecture and scope decisions — D1–D15 |
| 2 | 16 August 2026 | Post-documentation-review. Resolves D10; adds D16–D21; records six defects found reviewing the specification against itself; adds the measured cost model and the statistical-power finding. |
| **3** | **28 September 2026** | **Mid-build. Reconciles the condensed RTM (v3) and the September team meetings against the repository. Adds D22–D33; records defects C10–C15, found by inspecting the built system; updates the risks, open items and build order.** |

This document records every architectural and scope decision taken before the build
started, including the options that were rejected and why. It exists so the choices are
traceable at milestone review rather than reconstructed after the fact.

**Companion documents:** [masterplan.md](masterplan.md) · [implementation.md](implementation.md)
· [design.md](design.md) · [app-flow.md](app-flow.md) · [tasks.md](tasks.md)

---

## 1. Divergences from the submitted architecture

The submitted proposal specified a React front-end, a Node **or** Python back-end, and
MySQL with normalised `users` / `jobs` / `email_events` tables. Two deliberate
divergences:

| Submitted | Building | Reason |
|---|---|---|
| Node **or** Python back-end | Node + Express + **TypeScript** | The LLM output schema is defined once (Zod) and reused by the classifier, the API validation layer, and the client. One language, one test runner, one type system across three developers. |
| MySQL | **Postgres** in production, **SQLite** in dev and test | Identical normalised schema and identical SQL. The deciding factor is that a fresh clone runs the full test suite — including the accuracy harness — with no database server installed. That matters more for a marker and for three people on three machines than the engine name does. |

The normalised `users` / `jobs` / `email_events` structure from the proposal is retained
unchanged.

---

## 2. Decisions

### D1 — Stack: TypeScript end-to-end
**Options considered:** (a) TypeScript end-to-end; (b) React + Python/FastAPI; (c) match
the submitted proposal exactly.
**Chosen:** (a) React + Vite client, Node + Express + TypeScript server.
**Reasoning:** A single language removes duplicated type definitions between the
classifier's JSON contract and the API. One toolchain and one test runner is materially
less setup friction for a three-person team on a 12-week clock.
**Trade-off accepted:** Diverges from the Python branch of the proposal. Declared openly
rather than quietly.

### D2 — Database: Postgres in production, SQLite in dev and test
**Options considered:** (a) Postgres + SQLite; (b) MySQL as submitted; (c) SQLite only.
**Chosen:** (a), accessed through Drizzle so the same schema definition drives both.
**Reasoning:** Tests must run on a clean checkout with zero services running. Postgres
also has broader free-tier hosting availability than MySQL for the eventual deployment.
**Trade-off accepted:** A named divergence from the submission (see §1). SQLite-only was
rejected because it weakens the answer to "how does this scale to multiple users".

### D3 — Front-end: React, consuming the existing design system directly
**Chosen:** The components in `GradTracker Design System/components/` are used as-is.
**Reasoning:** They are real React with token-based CSS, and four of them
(`StageBadge`, `ConfidenceMeter`, `DeadlinePill`, `ApplicationRow`) map directly onto the
product's core workflows. No third-party component library is introduced and nothing is
re-implemented.

### D4 — Build against mocks first; real credentials wired later
**Options considered:** (a) demo mode first, no live credentials; (b) live Gmail and
Claude from the start; (c) live Claude, mocked Gmail.
**Chosen:** (a). The full system is built against a mocked Gmail client and a
fixture-backed classifier, seeded with realistic sample data so the dashboard is entirely
explorable offline. Live adapters are written behind the same interfaces, so enabling them
is a configuration change.
**Reasoning:** The mock adapters are required anyway for the offline accuracy harness, so
this costs nothing extra. It is also the safer demonstration at a milestone review — no
live personal inbox projected in front of a room.
**Amended in Revision 2:** the *credential setup* is no longer deferred with the code —
see **D18**.

### D5 — Email retention: message id and metadata only, never body or subject
**Options considered:** (a) message id + metadata; (b) ids and extracted fields only;
(c) also store the subject line.
**Chosen:** (a). `email_events` stores `gmail_message_id`, `thread_id`, `received_at`,
`sender_domain`, the extracted structured fields, and the confidence score.
**Explicitly never stored:** email subject, email body, any raw message content. The body
exists only as a local variable for the duration of the classification call.
**Reasoning:** This is the minimum that still supports deduplication, correct incremental
sync, provenance display ("detected from a Greenhouse email", via sender domain), and a
deep link back to the message in Gmail. Option (c) was rejected because a subject line is
raw email content and would contradict the stated success criterion.
**See also defect C1 (§3)** — the original specification leaked this through a log field.

### D6 — Deployment: local development now, deployable later
**Options considered:** (a) local now, deployable later; (b) deploy for real immediately;
(c) local only, permanently.
**Chosen:** (a). HTTPS enforcement, HSTS, and secure-cookie flags are implemented and
covered by automated tests asserting the middleware behaviour. Deployment configuration is
written but not provisioned.
**Reasoning:** The security success criterion stays automatically verifiable without
spending scarce weeks on hosting. Option (c) was rejected because it undermines the
"runs in a standard browser with no local install" criterion.

### D7 — Multi-account, no administration
**Options considered:** (a) multi-account with no admin layer; (b) single user.
**Chosen:** (a). A `users` table with row-level scoping enforced on every query. Each
student signs in with Google and sees only their own pipeline. No admin panel, no roles,
no permissions model.
**Reasoning:** Matches the submitted schema, lets all three team members use the system
during testing, and keeps the anonymised-aggregate path viable without building anything
for it.

### D8 — Marketing site: out of scope
**Chosen:** The app only. The design system's marketing landing-page kit is not built.
**Reasoning:** It serves none of the seven core workflows and none of the eight success
criteria. Twelve weeks is better spent on classification accuracy and the test harness.

### D9 — Confidence-gated review queue is in the MVP
**Options considered:** (a) review queue plus inline editing; (b) inline editing only.
**Chosen:** (a). The classifier returns a confidence score; any extraction below the
threshold lands in a review queue instead of silently entering the pipeline as fact.
**Reasoning:** This is the strongest available evidence for "no AI-extracted value is ever
treated as final", and it directly addresses the costly false-negative case. The screen
already exists in the design system.

### D10 — Stage taxonomy: six computed stages ✅ *resolved in Revision 2*
**Status in Revision 1:** open, pending team decision.
**Resolved:** six stages, with the brief's other two values computed rather than stored.

**The conflict.** The brief specifies seven stages. `StageBadge` — which the design system
defines as the single source of stage colour — implements six, and they are not the same
six. It has `withdrawn`; it lacks `Follow-up Required` and `Deadline Approaching`.

**Options considered:** (a) six computed stages, treating the design system as correct;
(b) seven literal stages, extending `StageBadge` and storing both values.

**Chosen:** (a).
- **Stage** (derived from the email, one of six): `applied` · `assessment` · `interview` ·
  `offer` · `rejected` · `withdrawn`.
- **Deadline Approaching** → rendered by `DeadlinePill`, which colours itself from
  `daysLeft` (≤2 ruby, 3–7 amber, otherwise muted), recomputed at render time.
- **Follow-up Required** → a derived staleness flag: `now - last_event_at` exceeds a
  per-stage threshold (`applied` 14 days, `assessment` 5, `interview` 7, `offer` 3).

**Reasoning.** "Deadline Approaching" is not a property of an email — it is a property of a
date and today's date. Storing it means a dashboard left open overnight is wrong by
morning, and a passed deadline still reads as "approaching" until something recomputes it.
The same argument applies to follow-up staleness. The same information reaches the screen
either way; computing it means it cannot go stale.

**Trade-off accepted:** a visible deviation from the brief's literal stage list, declared at
review. Option (b) was rejected because airtight wording traceability is worth less than a
dashboard that is correct at the moment it is read.

**Consequence:** this unblocked the database schema — the stage enum is the first thing
written (task T1.4).

### D11 — Model selection: Haiku 4.5 default, Sonnet 5 on escalation
*Superseded by D16, which confirms this choice with measured costs.*

### D12 — Two swappable ports, each with a fake implementation
**Chosen:**
- `GmailClient` — `listSince(historyId)`, `fetchMessage(id)`. The fake reads from the
  fixture directory.
- `EmailClassifier` — `classify(email) → { isApplication, company, role, stage, deadline,
  nextAction, confidence }`. The fake is a recorded-response map keyed by fixture id.

No code above these ports knows that Gmail or Claude exists, so the entire pipeline is
testable offline with no network access.
**Added in Revision 2:** this property is enforced by a lint rule, not by discipline — no
module above the port line may import a vendor SDK (task T2.1).

### D13 — Field-level provenance is the correction-persistence mechanism
**Chosen:** A `job_field_provenance` table. Every extractable field on a job carries
`source: 'ai' | 'human'`. Correcting a field flips it to `human`, and subsequent
classifications skip any field marked `human`.
**Reasoning:** This makes "the correction persists across syncs" a write-path check
enforced by the database, not a convention that a future contributor can accidentally
break. It also drives the visual distinction between AI-extracted and human-verified
values.

### D14 — The accuracy harness is a CI gate, not a report
**Chosen:** `npm run accuracy` prints accuracy, precision, recall, false-negative count,
and deadline-detection rate against the ≥95% and ≥80% thresholds, and **exits non-zero if
either threshold fails**. Every false negative is named by fixture id.
**Extended in Revision 2:** the harness also prints a **Wilson 95% confidence interval**
beside the point estimate — see D17.

### D15 — Sync safety
**Chosen:** Token-bucket rate limiter; exponential backoff with jitter on HTTP 429 and
`rateLimitExceeded`. The `historyId` advances **only** after the batch commits, within the
same transaction. A 404 on an expired `historyId` falls back to a bounded full resync.
**Reasoning:** A crash mid-sync must cause a re-read, never a skip. A skipped email is a
missed application, which is the failure mode the product exists to prevent.

---

### D16 — Classifier model: Haiku 4.5, escalating to Sonnet 5 *(Revision 2)*

**Options considered:** (a) `claude-haiku-4-5` with escalation to `claude-sonnet-5` below
0.6 confidence; (b) `claude-opus-5` throughout; (c) benchmark all three in Phase 2 and
decide on measured accuracy-per-dollar.

**Chosen:** (a).

**Measured cost basis.** Prices verified against current published rates rather than
estimated. A full initial scan is bounded at 2,000 messages (see §6).

| Model | Input / output per Mtok | Context | Per 2,000-email scan | ~15 dev scans |
|---|---|---|---|---|
| **Haiku 4.5** (chosen) | $1 / $5 | 200K | **~$4.30** | **~$65** |
| Sonnet 5 | $3 / $15 (intro $2 / $10 to 31 Aug 2026) | 1M | ~$9.50 | ~$143 |
| Opus 5 | $5 / $25 | 1M | ~$15.50 | ~$233 |

**Reasoning:** classification here is short structured extraction, which Haiku 4.5 handles
well, and it supports structured outputs. The stated project constraint is free-tier API
budgets, and this is the only option that comfortably fits it. Escalation to Sonnet 5 on
low-confidence results means the harder cases still get a more capable model.

**Trade-off accepted and stated:** if measured accuracy falls short of 95%, model capability
becomes one of the first suspects, and switching to Opus 5 costs roughly 3.5×. The harness
reports accuracy per model precisely so this trade-off can be evidenced rather than argued
(task T2.8).

**Correction to the Revision 1 cost model.** Revision 1 assumed prompt caching would offset
the system-prompt cost. It will not: **Haiku 4.5's minimum cacheable prefix is 4,096 tokens**
and a classification system prompt is far below that, so the prompt is billed in full on
every call. The figures above reflect this. The offsetting measure is D20.

### D17 — Fixture corpus: 80 synthetic now, ~300 real later *(Revision 2)*

**Problem identified during review.** A corpus of 80 emails cannot support the ≥95% claim.
One email is worth 1.25 percentage points, so 96.3% and 95.0% differ by a single
classification. The 95% confidence interval on a measured 95% at n=80 is approximately
**±5 percentage points** — the true value could be anywhere from 90% to 100%. Reaching
±2.5% requires roughly **300 labelled emails**.

**Options considered:** (a) 80 synthetic now, ~300 real hand-labelled later; (b) write ~300
synthetic fixtures immediately; (c) keep 80 and report the confidence interval.

**Chosen:** (a), **plus the confidence-interval reporting from (c)**.

- **Now (task T2.4–T2.5):** 80 authored fixtures — 55 application positives across all six
  stages, 15 hard negatives (LinkedIn job alerts, careers newsletters, "someone viewed your
  application", recruiter cold outreach), 10 easy negatives. Their job is to prove the
  harness works and give a first number.
- **Throughout the semester (task T8.3):** each team member hand-labels ~100 real emails
  from their own inbox. This is the corpus the SM-1 claim actually rests on.
- **Always:** the harness prints the Wilson 95% confidence interval beside the point
  estimate, so the figure can never be quoted without its uncertainty.

**Reasoning:** option (b) was rejected because 300 fixtures written by one author share one
author's assumptions — precision without validity. Measuring the wrong distribution more
precisely is not an improvement.

**Scheduling consequence:** T8.3 **starts in week 3, not week 11**. It is the longest-lead
item in the project and the only one that converts the accuracy figure from a demonstration
into evidence.

### D18 — Live-adapter spike moved to week 1 *(Revision 2)*

**Problem identified during review.** The phased plan placed all live-credential work at
weeks 9–11. Google Cloud project setup, OAuth consent screen configuration, and test-user
allowlisting fail in ways that take days to resolve. Discovering a blocker in week 10 of 12
is the project's single largest schedule risk.

**Chosen:** a throwaway spike in **week 1** (tasks T0.1–T0.3), ahead of all other work:
create the Google Cloud project, configure the consent screen with `gmail.readonly`, add all
three team members as test users, and fetch one real Gmail message with a disposable script.
Then park it until Phase 7.

**Reasoning:** half a day of work removes the largest schedule unknown while there are eleven
weeks of slack rather than two. It does not change D4 — the system is still built against
mocks; only the credential *setup* moves earlier.

### D19 — Structured outputs via `output_config.format`, not tool-use schema *(Revision 2)*

**Superseded:** Revision 1 specified constraining the classifier's JSON via a tool-use
schema.
**Chosen:** `output_config.format` with `zodOutputFormat(ClassificationSchema)` and
`messages.parse()`.
**Reasoning:** the same Zod schema already defined in `packages/shared` is validated by the
API itself and returns a typed object, removing a parsing layer. Supported on Haiku 4.5,
Sonnet 5 and Opus 5.
**Note:** the schema's string-length and numeric-range constraints are not part of the JSON
Schema subset the API enforces; the SDK strips them from the transmitted schema and
validates them client-side. Behaviour is correct; the enforcement point differs.

### D20 — Batches API for initial inbox scans *(Revision 2)*

**Chosen:** route the initial full inbox scan through the Batches API. Incremental syncs
remain synchronous.
**Reasoning:** the Batches API is **50% cheaper** and the initial scan is not
latency-sensitive — it runs in the background while the student watches progress, and
typically completes within an hour. This roughly halves the largest single cost in the
project and is the direct offset to the caching correction noted in D16.
**Consequence:** initial scan cost on Haiku 4.5 drops to approximately **$2.15**.

### D21 — Three parallel owner lanes *(Revision 2)*

**Chosen:** work is divided into three lanes that diverge after Phase 2 and run in parallel
until Phase 7.

| Lane | Owns |
|---|---|
| **A — Domain** | Schema, classification pipeline, stage engine, matching, provenance, ranking |
| **B — Quality** | Fixtures, accuracy harness, security and retention tests, live adapters |
| **C — Interface** | App shell, all five views, inline editing, review queue |

**Reasoning:** this is the actual reason the ports and fakes are built in Phase 2 rather than
alongside the live adapters. Once the port interfaces are stable contracts, the three lanes
cannot block each other.

---

### Revision 3 — decisions taken mid-build *(28 September 2026)*

Taken after reconciling the condensed RTM (v3, 24 August) and the team's September meetings
against the working repository. The build order these produce is the Plan of record in
[tasks.md](tasks.md).

### D22 — One implementation: this repository *(Revision 3)*

**Chosen:** all three lanes build in this single repository, and every plan is reconciled
against its actual state.

**Reasoning:** three people building against shared contracts — the Zod schemas and the two
ports — in one codebase cannot drift into incompatible implementations; the tests and the
type system arbitrate. Where any plan or document disagrees with the code, the code is the
authority.

### D23 — Ingestion: hybrid and local, classified live *(Revision 3)*

**Chosen:** mail enters through one ingest path that accepts two kinds of input — harvest
files produced by reading a mailbox through the team's Claude Gmail connector, and Gmail
exports (a Google Takeout `.mbox`, or individual `.eml` files). Every email is classified by
the live model. The three demo modes — a single real account, a dedicated test inbox, or
both — are simply different databases filled from different inputs.

**Rejected:**

| Option | Why not |
|---|---|
| Gmail API with OAuth in Google's testing mode | Free for up to 100 named test users, so cost is not the obstacle. About two weeks of work — OAuth, sessions, token encryption, a live Gmail client, incremental sync — for a capability the local demo does not need. **Deferred on effort, not cost.** |
| IMAP with an app password | Stores a credential, which RQ-01 forbids. |
| Replaying pre-classified data only | Demonstrates everything except the classifier — the component the product exists to show. |

**Reasoning:** the pipeline takes a `RawEmail` and has never cared where it came from, so a
second reader is small work and the three demo modes cost nothing extra. The export route has
a property the harvest lacks: every step from raw email to dashboard is GradTracker's own
code, reproducible from the same file on demand. The harvest remains the quickest way to show
a real account.

**Consequences:**
- **One mailbox, one path.** The connector yields Gmail API ids and exports yield RFC 822
  Message-IDs, so the same email arriving both ways would become two events, invisibly to the
  duplicate protection.
- Every event records its source (T7.7), which also fixes defect C10.
- RQ-01 stays "Deferred — justified", with its justification amended to say that
  testing-mode OAuth was considered and deferred on effort (§4.4).

### D24 — Demo data: real job-board mail plus authored applications, marked synthetic *(Revision 3)*

**Chosen:** a dedicated test inbox subscribed to graduate job boards supplies realistic
*negative* mail. Application emails — confirmations, assessments, interviews, offers,
rejections — are **authored as `.eml` files** with realistic applicant-tracking-system
senders, as the 80 fixtures are. Authored emails are tagged synthetic at ingest, and shown
with a visible "Synthetic" tag and no Gmail link.

**Rejected:**

| Option | Why not |
|---|---|
| Job-board mail alone | Produces an empty dashboard. Job ads are exactly what the classifier is built to reject — a job alert naming real companies and a deadline is one of its designed hard negatives. |
| Fabricated emails sent from a second Gmail account | Every sender becomes `gmail.com`: "Detected from" says nothing, and sender-domain matching merges different roles at one company. |
| Mail sent from employers' real domains | Fails SPF and DKIM and lands in spam — and is not something to do. |

**Reasoning:** realism on both sides. The negatives are genuinely real; the positives carry
realistic senders, which delivered mail could not.

**Consequence:** authored emails **never** count toward the headline accuracy figure (D32),
and the demo never presents them as real.

### D25 — Refresh ingests a drop folder *(Revision 3)*

**Chosen:** the dashboard's Refresh runs `POST /api/sync`, which ingests any new files placed
in a configured folder. `sync_state.state` is the lock, so a concurrent request returns 409;
processed files are recorded and skipped thereafter.

**Rejected:** a browser upload control — upload handling and size limits, for no gain on a
local demo; and leaving ingestion as a terminal command, which would leave RQ-02's on-demand
clause unmet.

**Consequence:** T3.8 is reinstated in this local form and T4.6 completes with it. The
Gmail-API form of T3.8 moves to T7.2 and stays deferred.

### D26 — Ambiguous matches go to review *(Revision 3)*

**Chosen:** when an email matches an existing application on company and sender domain
alone, with role similarity actively low, it is **not merged**. It becomes a pending review
item carrying a suggested application. The review card asks whether it is the same
application or a new one, and the suggested application's row shows a "Review required"
marker linking to the item.

**Rejected:**

| Option | Why not |
|---|---|
| Tighten the rule — low similarity always creates a new application | Right in the Macquarie case, wrong whenever an employer renames a role between emails; the student would merge the duplicates by hand. |
| Leave matching as it is | The 18 August harvest silently merged two genuinely separate Macquarie applications — Technology, and Data (Sydney) — into one. |

**Reasoning:** the product's own principle: when it is unsure, it asks. A silent merge
destroys an application's history; a question costs the student one click.

**Consequence:** supersedes the §6 assumption that sender domain acts as a tiebreak. A new
`suggested_job_id` column (T3.10) and a row marker (T6.6).

### D27 — Correction editing: panel edit mode with Save/Cancel *(Revision 3)*

**Chosen:** the detail panel switches into edit mode with all five extractable fields
editable. Changes are held until **Save** commits them in one request, or **Cancel**
discards them. Save sends **only the fields actually changed**, and warns if an ingest
updated the application while the panel was open.

**Rejected:** per-field inline editing with Enter and Escape (the original T6.1); per-field
auto-save with Undo.

**Reasoning:** an explicit commit is easier to reason about and to demonstrate. The
changed-fields rule is what keeps it compatible with provenance: sending all five would mark
every field human-edited — locking each against future classification — though the student
changed nothing.

**Consequence:** T4.9 must land first, since the panel exposes a stage control.

### D28 — Review threshold: a per-user slider *(Revision 3)*

**Chosen:** the confidence below which extractions go to review is a per-user setting, set
by a slider in Settings; "review everything" is the slider at its maximum. The column,
`users.review_threshold`, has existed since T1.4 — it simply is not read yet. A change
applies to **newly ingested mail only**.

**Rejected:** a two-way toggle — less control, and the API contract already carries a numeric
`reviewThreshold`; and a fixed constant.

**Reasoning:** re-routing mail already processed would un-assert applications the student
may already have acted on.

### D29 — Calendar and Archive leave the navigation *(Revision 3)*

**Chosen:** both sidebar items, and their placeholder routes, are removed.

**Reasoning:** the deadline pill on every row already shows what is due and overdue, which is
what a calendar view was for; Archive only duplicated the pipeline's Archived tab. Calendar
integration was already out of scope.

### D30 — Company search that keeps rank order *(Revision 3)*

**Chosen:** a search box narrows the pipeline by company or role while preserving the
server's order. Resolves the flag the RTM placed on the old R09 company filter.

**Reasoning:** the tension the RTM identified is with **re-sorting**, not with filtering. A
filter that keeps order is the rule the stage chips already follow. A sort control remains
excluded.

### D31 — Scope boundaries confirmed *(Revision 3)*

- **No manual "add application".** Applications enter from email; "adding" in a walkthrough
  means confirming an item from the review queue.
- **No GradTracker login for the demo.** The local demo is operated by the team.
- **"Upcoming jobs to apply for" is a stretch goal after the MVP** (backlog S1). It would need
  a new classification category, table and view, and would persist extracted content from
  non-application email for the first time — a privacy change to be decided deliberately,
  not drifted into.

### D32 — Evaluation dataset protocol *(Revision 3)*

**Chosen:**

| Set | Contents | Purpose |
|---|---|---|
| **Tuning** | The 80 authored fixtures, plus ~40 real emails | Iterate the prompt and threshold here — never on held-out |
| **Held-out** | ~200 real emails: about half application emails from the three members' own inboxes, half real negatives weighted toward the hard ones | The headline figure |
| *Excluded from the headline* | Authored emails; public datasets | — |

Each member exports their **own** mail; nobody reads anyone else's inbox. Labelling uses a
spreadsheet template with a converter back to fixtures, against a one-page guide whose stage
definitions are the classifier prompt's own. About 25 emails are labelled by two people
independently and their agreement is reported. **The held-out set is frozen before any model
sees it.** Its final size is set from an inventory of what the exports actually contain.
Real email content never enters git.

**Rejected:**

| Option | Why not |
|---|---|
| The model pre-labels, humans verify | Circular: a held-out set shaped by the model's own guesses inflates that model's measured accuracy. |
| Authored emails in the headline | Partly measures the classifier against the team's own writing. |
| Public datasets | None known for graduate-recruitment email; searching costs time for little return. |
| A natural, unenriched sample | About 98% negatives, where a classifier answering "no" to everything scores about 98%. Enrichment is declared, and precision and recall are reported separately. |

**Reasoning:** the 80 fixtures already shaped the prompt, so they are tuning data by
definition (defect C14) — which frees every new label for the held-out set.

**Consequence:** next action, being free text, is judged acceptable or not after each run
rather than labelled in advance (T2.10, defect C13).

### D33 — How the accuracy claim is stated *(Revision 3)*

**Chosen:** every reported proportion — accuracy, precision, recall, false-negative rate,
deadline detection, next-action acceptance — carries its Wilson 95% interval. The claim is a
**point estimate with its interval**, not a guaranteed floor.

**Reasoning:** at n≈200 and about 97% measured accuracy, the interval runs roughly
93.6–98.6%. A lower bound at 95% would need about 98% measured. The point estimate with its
interval is the honest claim; presenting 95% as a floor would over-claim.

---

## 3. Defects found reviewing the specification *(Revision 2)*

Six defects found reviewing the four specification documents against each other. Each is
assigned to the task that fixes it. **These were errors in the specification, not risks** —
they are recorded because the correction is itself a decision.

| # | Defect | Resolution | Task |
|---|---|---|---|
| **C1** | The classifier's declared output included a `reasoning` field, described as "logged for debugging, never persisted". Logs persist, and a useful reasoning string quotes the email — so the no-raw-content criterion was violated through the log file rather than the database. | `reasoning` becomes development-only, scrubbed, and never written to a persisted log. | T2.3 |
| **C2** | Two documents disagreed on which clock governs deadline urgency: ranking was specified server-side, while `daysLeft` was specified client-side against local midnight. A job could display "2 days left" while ranked in the 3–7 day bucket. | The client sends its IANA timezone; the server ranks using it. One clock governs both. | T3.7 |
| **C3** | JSON output was specified via tool-use schema. | Replaced by `output_config.format` — see D19. | T2.3 |
| **C4** | The cost model assumed prompt caching would offset the system-prompt cost. Haiku 4.5's minimum cacheable prefix (4,096 tokens) is far above a classifier prompt. | Cost model corrected; Batches API adopted as the offset — see D16 and D20. | T7.4 |
| **C5** | D10 was recorded as open in all four documents. | Now resolved; the four documents are updated. | T1.1 |
| **C6** | `gmail.readonly` is a Google *restricted* scope. Production verification requires a paid third-party security assessment. | Not a blocker — test-user mode permits 100 users with no verification — but it means the app **cannot be publicly launched as specified**. Recorded as a documented limitation. | T8.2 |

### Defects found inspecting the built system *(Revision 3)*

Defects C7–C9, found while building the API and client, are recorded in
[tasks.md](tasks.md). Revision 3 adds six more, each found by checking the running system or
the RTM against the code, rather than documents against each other.

| # | Defect | Resolution | Task |
|---|---|---|---|
| **C10** | Every timeline "Open in Gmail" link searches `rfc822msgid:`, which matches an email's RFC 822 `Message-ID` header — but events store Gmail API ids. Every link in the real-inbox demo searched for something that does not exist. The test checked only the link's shape. | Record each event's source and build the link per id format; no link for authored emails; verify by clicking against real Gmail. | T7.7 |
| **C11** | A correction setting a terminal stage left the application `active`, so it vanished from both tabs — the defect fixed in the pipeline on 18 August, surviving on a second code path. | **Fixed** at the repository, which now derives status from stage on every write, so no path can disagree — including a third affected path, review confirm. | T4.9 |
| **C12** | RQ-03 requires an interval on accuracy, precision, recall and false negatives; the harness printed one for accuracy only. | **Fixed** — an interval on every reported proportion (D33). | T2.9 |
| **C13** | RQ-04 compares every extracted field against ground truth, but next action is free text with no scoring method. | Judged acceptable or not after each live run (D32). | T2.10 |
| **C14** | RQ-03 requires a dataset the classifier was not tuned against; the 80 fixtures shaped the prompt. | They become the tuning set; a new held-out set is frozen before any model run (D32). | T8.3 |
| **C15** | Documents gave the unit as FIT3163 — the semester-1 code. | Both semesters' codes recorded. **Fixed.** | — |
| **C16** | Confirming a review item that matches an existing application applied every detected field as a human correction: an older, lower-stage email moved the stage and `lastEventAt` backwards and locked all five fields, so no later email could move the application again. Found by probe while fixing C11. | A match applies the email as the pipeline would; only fields the student edited become human. | T3.11 |

---

## 4. Recorded risks and limitations

Stated in writing before review rather than raised in the Q&A.

### 4.1 The accuracy claim rests on a corpus the team has not yet built

The fixture corpus written during development proves that the harness works and produces a
first accuracy number. It **cannot** validate the classifier against the real distribution
of a student's inbox, because the fixtures encode the author's assumptions about what
recruitment emails look like.

Compounding this, at n=80 the measurement itself is imprecise: **±5 percentage points at
95% confidence** (see D17). The ≥95% claim becomes defensible only once the team hand-labels
roughly 300 real emails. The harness accepts them as a directory drop-in, and this
limitation is stated in the project documentation. *Revision 3:* the harness prints an
interval beside accuracy only, not every figure — defect C12, fixed by T2.9. The protocol for
the real corpus is D32.

### 4.2 The application cannot be publicly launched as specified

`gmail.readonly` is a Google restricted scope. Publishing the app to users beyond the
100-test-user allowlist requires annual third-party security assessment at significant cost.
This does not affect the project — all testing happens within the allowlist — but it bounds
the "early careers services as a future consumer" framing, and is better stated than
discovered.

### 4.3 Model capability is a confounder if accuracy falls short

Choosing Haiku 4.5 for cost (D16) means that a sub-95% result has two candidate explanations:
the prompt, or the model. The per-model benchmark in T2.8 exists to separate them.

### 4.4 The RQ-01 justification invites one fair question *(Revision 3)*

The RTM defers hosted OAuth because publishing `gmail.readonly` beyond Google's 100-user
allowlist requires a paid security assessment. That is true — but the same allowlist means
testing-mode OAuth for **one demo account costs nothing**, so an assessor can fairly ask why
the demo did not use it. The honest answer is effort, not cost: roughly two weeks for a
capability the local demo does not need, since ingesting a connector read or user-exported
files means no credential is ever handled (D23). The RTM should say so.

### 4.5 The demo inbox contains authored emails *(Revision 3)*

Application emails in the test-inbox demo are written by the team (D24). They are marked
synthetic in the product and excluded from the accuracy figure, and the demo must say so
aloud. Presenting authored mail as real is the one thing an assessor could fairly call
misleading.

---

## 5. Open items

| # | Item | Status |
|---|---|---|
| 1 | D10 stage taxonomy | ✅ **Resolved in Revision 2** — six computed stages |
| 2 | Google Cloud OAuth consent screen and test-user allowlist | ⏸ **Deferred in Revision 3**, with hosted OAuth (D23) |
| 3 | Real labelled email corpus | **Protocol agreed in Revision 3** (D32); the held-out size is set after the inventory |
| 4 | Classifier model choice | ✅ **Resolved in Revision 2** — Haiku 4.5 + Sonnet 5 escalation; **measurement pending** (T2.8) |
| 5 | Anthropic API key | **Open** — created, not yet verified (blocker B3) |
| 6 | Mailbox exports from all three members | **Open** — blocker B6 |

Items 5 and 6 block the live classifier and the evidence chain respectively. **Neither blocks
the first two steps of the build order.**

---

## 6. Assumptions made without consultation

All reversible; recorded for transparency.

- **Job identity:** normalised company name plus fuzzy role-title match (Dice coefficient
  ≥ 0.6 on bigrams) within a single user, with sender domain as a tiebreak. Over-merging is
  treated as worse than duplication: a duplicate is visible and correctable, a wrong merge
  silently destroys an application's history. *Revision 3: the sender-domain tiebreak is
  superseded by D26 — a domain-only match with low role similarity goes to review.*
- **Review-queue threshold:** starts at confidence 0.75, to be tuned against the fixture
  corpus. Escalation to Sonnet 5 triggers below 0.6. *Revision 3: a per-user setting (D28).*
- **Stage progression:** stages only advance forward, except that `rejected` and
  `offer received` may arrive from any stage. `withdrawn` is never AI-assigned.
- **Initial scan bound:** the first scan reads the most recent **2,000 messages or 180 days**,
  whichever is smaller. Unbounded scans are a cost and rate-limit hazard, and older mail has
  no live pipeline value.
- **Ranking is not user-overridable:** filters re-filter but never re-sort. A student who can
  sort the pipeline by company name has rebuilt their spreadsheet, defeating the criterion
  the ranking exists to satisfy.
- **Cross-user access returns 404, not 403:** a 403 confirms the record exists.
- **Disconnecting Gmail keeps pipeline data:** the corrections are the student's work. The
  confirmation dialog states this explicitly.
- **Aggregate-data path:** every job row carries a stable anonymous user key and there is no
  free-text notes field, so a future anonymised aggregate query never has to touch
  identifying data. No code is written for this in the MVP.

---

## 7. Agreed build order

Nine phases, 54 tasks, tracked in [tasks.md](tasks.md) with owner lanes, dependencies and
per-task completion criteria.

| Phase | Weeks | Deliverable |
|---|---|---|
| **0 — De-risk** | 1 | Google Cloud project, OAuth consent screen, throwaway live-fetch spike *(new in Revision 2 — see D18)* |
| 1 — Foundation | 1–2 | Schema, migrations, provenance model, seed data |
| 2 — Harness | 2–3 | Ports, fakes, fixture corpus, accuracy harness — *the requirement-proving core, built early on purpose* |
| 3 — Pipeline | 3–5 | Classification pipeline, stage engine, matching, provenance write path, ranking |
| 4 — API | 5–6 | All routes, user scoping, validation, security middleware |
| 5 — Dashboard | 6–8 | App shell, pipeline view, detail panel, responsive behaviour |
| 6 — Human-in-the-loop | 8–9 | Inline correction, AI-vs-human visual contract, review queue |
| 7 — Live adapters | 9–11 | Real Gmail client, real Claude classifier, Batches API, progressive first-scan UI |
| 8 — Traceability | 11–12 | Traceability document, limitations document, real corpus, README |

**Critical path:** `T0.1 → T1.4 → T2.1 → T2.6 → T3.4 → T4.4 → T5.5 → T6.1 → T7.6 → T8.1`.

**T8.3 (real labelled corpus) sits off the critical path but starts in week 3.** A late start
there is the difference between "we measured 96%" and "we measured 96% on emails we wrote
ourselves."

**Revision 3.** The current build order — seven steps by dependency, with the evaluation
dataset running alongside — is the Plan of record in [tasks.md](tasks.md). The live
classifier and the labelled corpus are now on the critical path.
