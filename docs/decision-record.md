# GradTracker — Architecture & Scope Decision Record

**Project:** GradTracker — AI-powered graduate recruitment tracking dashboard
**Unit:** FIT3163 · Team of 3 · 12-week semester
**Date of decisions:** 16 August 2026
**Status:** Agreed, pre-implementation. No code written at the time of writing.

This document records every architectural and scope decision taken before the build
started, including the options that were rejected and why. It exists so the choices are
traceable at milestone review rather than reconstructed after the fact.

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
**Note:** Gmail read scope on an unverified Google Cloud app is limited to explicitly
added test users. This must be set up before live testing.

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

### D10 — Stage taxonomy reconciled with the design system *(open — see §4)*
**Problem identified:** The brief specifies seven stages. `StageBadge` — which the design
system defines as the single source of stage colour — implements six, and they are not the
same six. It has `withdrawn`; it lacks `Follow-up Required` and `Deadline Approaching`.
**Proposed resolution:** The design system is treated as correct, because
"Deadline Approaching" is not a property of an email — it is a property of a date and
today's date.
- **Stage** (derived from the email, one of six): applied · assessment pending ·
  interview scheduled · offer received · rejected · withdrawn.
- **Deadline Approaching** is rendered by `DeadlinePill`, which colours itself from
  `daysLeft`, so urgency is computed at render time and cannot go stale.
- **Follow-up Required** becomes a derived flag on the next action, from staleness rules.

The same information reaches the screen; it simply cannot freeze at the moment an email
arrived. **This one is awaiting confirmation** — the alternative is to follow the brief
literally and extend `StageBadge` to seven stages.

### D11 — Model selection: Haiku 4.5 default, Sonnet 5 on escalation
**Chosen:** `claude-haiku-4-5` as the default classifier, escalating to `claude-sonnet-5`
only for low-confidence results.
**Reasoning:** Classification here is short structured extraction, which Haiku handles
well, and cost control matters at 600+ emails in an initial inbox scan under free-tier
budgets. The accuracy harness reports per-model figures so the trade-off is demonstrated
rather than asserted.

### D12 — Two swappable ports, each with a fake implementation
**Chosen:**
- `GmailClient` — `listSince(historyId)`, `fetchMessage(id)`. The fake reads from the
  fixture directory.
- `EmailClassifier` — `classify(email) → { isApplication, company, role, stage, deadline,
  nextAction, confidence }`. The fake is a recorded-response map keyed by fixture id.

No code above these ports knows that Gmail or Claude exists, so the entire pipeline is
testable offline with no network access.

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
either threshold fails**.
**Fixture corpus:** approximately 80 labelled emails including deliberate hard negatives
(LinkedIn job alerts, university careers newsletters, "someone viewed your application"),
of which roughly 30 are deadline-bearing with known expected values in varied date
formats.

### D15 — Sync safety
**Chosen:** Token-bucket rate limiter; exponential backoff with jitter on HTTP 429 and
`rateLimitExceeded`. The `historyId` advances **only** after the batch commits, within the
same transaction. A 404 on an expired `historyId` falls back to a bounded full resync.
**Reasoning:** A crash mid-sync must cause a re-read, never a skip. A skipped email is a
missed application, which is the failure mode the product exists to prevent.

---

## 3. Recorded risk — the accuracy claim

The fixture corpus written for this project can prove that the harness works and can
produce a first accuracy number. It **cannot** validate the classifier against the real
distribution of a student's inbox, because the fixtures encode the author's assumptions
about what recruitment emails look like.

The ≥95% claim only becomes defensible once the team hand-labels a corpus of several
hundred real emails. The harness is built so that dropping real labelled data in is a
directory copy. This limitation is to be stated in the project documentation rather than
glossed over at review.

---

## 4. Open items

| # | Item | Needs |
|---|---|---|
| 1 | D10 stage taxonomy — six computed stages vs. seven literal stages | Team decision |
| 2 | Google Cloud OAuth consent screen and test-user allowlist | Setup before live testing |
| 3 | Real labelled email corpus for the accuracy claim | Team effort, see §3 |

---

## 5. Assumptions made without consultation

All reversible; recorded for transparency.

- **Job identity:** normalised company name plus fuzzy role-title match within a single
  user, with sender domain as a tiebreak.
- **Review-queue threshold:** starts at confidence 0.75, to be tuned against the fixture
  corpus.
- **Stage progression:** stages only advance forward, except that `rejected` and
  `offer received` may arrive from any stage.
- **Aggregate-data path:** every job row carries a stable anonymous user key and there is
  no free-text notes field, so a future anonymised aggregate query never has to touch
  identifying data. No code is written for this in the MVP.

---

## 6. Agreed build order

1. Schema, migrations, provenance model, seed data
2. Ports, fakes, fixture corpus, accuracy harness — *the requirement-proving core, built
   early on purpose*
3. Classification pipeline and stage engine
4. API with per-user scoping, input validation, security middleware, and their tests
5. Dashboard — pipeline, urgency sort, summary strip, detail panel
6. Inline correction and the review queue
7. Live Gmail and Claude adapters, dropped in behind the existing ports
8. Traceability document mapping each success criterion to the test that proves it
