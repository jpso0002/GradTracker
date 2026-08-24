# GradTracker — Full Project Context

> **What this file is.** A self-contained context payload for a fresh Claude chat that has
> **no access to this repository**. Everything needed is stated inline; nothing here relies
> on being able to open a file. Written to be blunt rather than diplomatic — if you are
> using this to help explain the project to teammates, soften it yourself.
>
> **Accurate as of:** 24 August 2026. Last commit `ea9ae44`, 18 August 2026.
> **Repo state:** clean apart from documentation edits made 24 August.

---

## 1. The product

**GradTracker** is an AI-powered graduate recruitment tracking dashboard.

A final-year university student applies to 20–40 graduate programs and internships in a
season. Every application generates a scatter of emails from different systems — the
employer's own address, plus Workday, Greenhouse, Lever, SmartRecruiters, Criteria Corp,
PageUp. Deadlines arrive buried in bodies. Applications sit in different stages
simultaneously. The student loses track, and the failure mode is silent: a missed
assessment window looks exactly like nothing happening.

The existing answer is a spreadsheet the student maintains by hand and stops maintaining
by week three.

**What GradTracker does:** reads the student's Gmail, uses an LLM to decide which emails are
job applications, extracts **company, role, stage, deadline and next action** from each one,
groups emails into applications, and renders a **single pipeline ranked by urgency**.

**The product's one opinion:** what you should do next. There is deliberately no sort
control — a student who can sort by company name has rebuilt the spreadsheet the product
exists to replace.

### The six stages

`applied` · `assessment` · `interview` · `offer` · `rejected` · `withdrawn`

Progression is forward-only, except `rejected` and `offer` which apply from any stage.
`withdrawn` is **never** AI-assigned — only a human sets it.

---

## 2. Where the project actually is — the blunt version

### 2.1 The headline

**The backend is finished and tested. The dashboard works. There is no live classifier.**

`packages/server/src/adapters/classifier/` contains exactly two files: `fake.ts` and
`prompt.ts`. The fake replays pre-written labels from a fixture corpus. **No adapter calls
a real model.**

The demo that reads a real inbox works because 32 emails were classified **by a human
operating a model in a chat session**, written into a JSON file, and replayed through the
real pipeline. Everything downstream of classification — matching, stage progression,
provenance, ranking, retention — is genuine and tested. Classification itself is a
human-in-the-loop stand-in.

Three consequences, stated plainly:

1. **The product cannot classify an email on its own.**
2. **The risk register's "misclassification of emails" critical risk is currently
   unmeasurable.** You cannot misclassify if you are not classifying.
3. **The 100% accuracy figure printed by the harness is a self-test** — the fake classifier
   replays the corpus labels, so it scores the corpus against itself. The harness output
   says so explicitly. It proves the harness works. It proves nothing about a model.

The unblock is an **Anthropic API key**, at roughly **$1.30** for the benchmark.

### 2.2 Status by phase

| Phase | Scope | Status |
|---|---|---|
| **0 — De-risk** | Google Cloud project, API key, spike | ⏸ Descoped for the demo track |
| **1 — Foundation** | Monorepo, shared Zod schemas, DB schema, migrations, repository, seed | ✅ Complete |
| **2 — Harness** | Ports, fake adapters, prompt, fixture corpus, accuracy harness, Wilson intervals | ✅ T2.1–T2.7 · T2.8 blocked on API key |
| **3 — Pipeline** | Matching, stage engine, provenance, classification pipeline, ranking, harvest | ✅ Complete · T3.8 sync orchestrator deferred |
| **4 — API** | Job routes, review routes, sync routes, detected company/role | ✅ T4.4, T4.5, T4.8 · ◐ T4.6 partial · ⏸ T4.1–T4.3 auth deferred · ☐ T4.7 security suite |
| **5 — Dashboard** | Design system, shell, API client, pipeline view, detail panel | ✅ T5.1–T5.3, T5.5, T5.6 · ◐ T5.7 partial · ⏸ T5.4 deferred · ☐ T5.8, T5.9 |
| **6 — Human-in-the-loop** | Inline editing, review queue view, settings | ☐ Not started |
| **7 — Live adapters** | **Real Gmail client, real Claude classifier** | ⏸ Deferred |
| **8 — Traceability** | Traceability doc, limitations doc, 300 real labelled emails | ⏸ Deferred |

### 2.3 Hard numbers

| | |
|---|---|
| Tests | **365 passing**, 21 files |
| Source | ~10,161 lines TypeScript/TSX (excludes vendored design system and build output) |
| Fixture corpus | 80 labelled emails — 55 application / 25 not |
| Deadline-bearing fixtures | 26, across eight distinct phrasings |
| Hard negatives | 15 (8 name companies with live applications; 1 from a genuine ATS domain) |
| Real emails harvested | 32 → 8 applications, 20 updates, 4 correctly rejected |
| Gates | `npm test`, `npm run lint`, `npm run typecheck`, `npm run accuracy` — all green |

---

## 3. What "completed" looks like

The finished product, per the masterplan:

A student signs in with Google once, granting **read-only** Gmail access. GradTracker scans
the inbox, classifies every email, and builds a pipeline. Thereafter it syncs incrementally.

**One screen** shows every live application ranked by urgency: what is overdue, what is due
this week, what has gone quiet and needs a follow-up. Each row carries company, role, a
stage badge, the single next action, and a deadline pill coloured by how close it is.

Clicking a row opens a detail panel: the extracted fields, each marked with **how the value
was obtained** — a confidence meter if the model extracted it, an "Edited" tag if the
student corrected it, never both. Below that, a timeline of every email in the application,
each linking back into Gmail.

Anything the model got wrong, the student corrects inline. The correction is permanent —
a later sync carrying a conflicting value **must not** overwrite it.

Emails the model was not confident about never enter the pipeline as fact. They go to a
review queue where the student confirms or dismisses them.

**What is never stored:** email subjects, bodies, or full sender addresses. Only the
extracted fields, plus the sender's domain and the Gmail message id.

### Explicitly out of scope

Marketing site · administrator roles · multi-user accounts · calendar integration ·
mobile apps · sending email on the student's behalf (the OAuth scope makes it technically
impossible) · job-board scraping · application autofill.

---

## 4. The unit, the team, and the dates

| | |
|---|---|
| **Unit** | FIT3161 / FIT3163 / FIT3188 Software Project, Monash University |
| **Team** | DS-10 — William Moreton, Jordan Psomas, Athan Vass |
| **Duration** | 12-week semester (this is semester 2; the project began in semester 1) |
| **Client** | The teaching team. There is no external client. |
| **Budget** | Zero. No cloud spend is provided. |

### Lanes, per the meeting of 19 August 2026

- **William** — front-end, wireframes, risk register
- **Jordan** — the classifier and its tuning *(this is the user of this document)*
- **Athan** — backend and client-server architecture

**⚠️ Note the divergence.** The minutes assign Athan to *"begin implementation"* of the
backend and William to *"continue developing wireframes"*. Both largely exist already —
the backend is complete with 365 tests and the dashboard is built against a full design
system. The team has confirmed it is aware of the shared repository, but any plan should
account for the fact that the minutes describe a project earlier than the one that exists.

### Dates

| When | What |
|---|---|
| **19 Aug 2026** | Team meeting (source of the current action items) |
| **25 Aug 2026** | RTM condensed from 19 requirements to 7–10 — **the only hard-dated deliverable** |
| Week of 25 Aug | Individual sign-off; each member presents draft pitch slides |
| **2 Sep 2026** | Next team meeting (5:30 PM Zoom) + TA sign-off |
| Unknown | **Mid-semester pitch date is not recorded in the minutes** |

### What the mid-semester pitch is actually about

Per the TA, the pitch is **project management and progress, not the product**:
milestone progress and methodology adaptation · current project-management and development
issues · risk management and anticipated issues · the updated RTM with next steps.

For the **final** demo the TA's framing is different: pitch it **like presenting to
investors** — explain why each feature is useful and how it helps the target audience
achieve their goal, not merely what was built. Function over visual polish. The demo must
show the product solves the problem identified in semester 1.

---

## 5. Success metrics — and what evidence actually exists

This table is the spine of the RTM and the pitch. **The right-hand column is the honest
part.**

| ID | Metric | Target | Evidence today |
|---|---|---|---|
| **SM-1** | Application vs non-application classification | ≥95% accuracy, precision and recall separate | ⚠️ **Harness exists and gates CI, but has only ever run against a fake classifier.** The 100% figure is the corpus scored against itself. No model has been measured. |
| **SM-2** | False negatives tracked as a first-class number | Reported explicitly | ✅ Counter built, printed, asserted. Same caveat as SM-1. |
| **SM-3** | Deadline extraction from emails with explicit deadline language | ≥80% | ✅ 26 deadline-bearing fixtures across eight phrasings; scoring separates date-correct from exact-time. Same caveat. |
| **SM-4** | Student finds their most urgent item within one screen | Top item is the right answer to "what next" | ✅ Deterministic ranking function, 14 tests, order-independence asserted. **Not yet true at mobile widths — T5.8 unbuilt.** |
| **SM-5** | Zero credentials stored | OAuth only, tokens encrypted, HTTPS, validation, secure sessions | ⚠️ **Partially evidenced.** No password column exists (asserted by test). Token encryption, HTTPS and session flags are **unimplemented** — T4.1–T4.3 deferred. `security.test.ts` (T4.7) does not exist. |
| **SM-6** | No raw email content persists | Only structured fields stored | ✅ **Strongest evidence in the project.** Two independent guards: a forbidden-column check across 27 column names in both SQL dialects, and a content search that runs the whole corpus through the real pipeline then searches every value of every row of all five tables for every fixture's subject, body phrases and sender address. Both verified in the failing direction. |
| **SM-7** | Corrections persist across syncs; AI vs human visually distinct | 100% of fields editable | ✅ Provenance write-path tested: a correction survives five consecutive conflicting syncs and a later classification at confidence 1.0. UI contract tested three ways. **Inline editing UI itself is unbuilt (T6.1).** |
| **SM-8** | Runs in a browser, responds promptly | Render and edit round-trip under load | ⚠️ Runs in a browser. `performance.test.ts` does not exist. |
| **SM-9** | Every requirement maps to a test | 100% coverage of SM-1…SM-8 | ☐ Phase 8, deferred. This table is the closest thing that exists. |

### The single most important caveat

**At n=80 the Wilson 95% confidence interval spans ±4.6 points.** So 96.3% and 91% are not
distinguishable by this corpus. Any accuracy claim from the current fixtures is weaker than
the number suggests.

This is why **T8.3 — 300 real labelled emails** matters, and why stating the limitation in
the pitch is stronger than quoting a bare percentage. It demonstrates the team understands
what its own numbers do and do not prove.

---

## 6. Architecture

### Stack

TypeScript end-to-end. npm workspaces monorepo, three packages:

- **`packages/shared`** — Zod schemas. The single source of type truth. Every type crossing
  the client/server boundary is defined here once and inferred, never redeclared on either
  side.
- **`packages/server`** — Express 5 API, ports-and-adapters domain logic, Drizzle ORM.
- **`packages/client`** — React 19 + Vite 7 + react-router 7 dashboard.

Database: **Postgres** in production, **SQLite** in development and test. Two schema
definitions kept in lockstep by a parity test; Postgres verified in-process with PGlite
(real Postgres compiled to WASM), so "works on both engines" is a CI assertion rather than
something someone once did on a laptop.

### Ports and adapters

Two things the product depends on that it does not control: **Gmail** and **the classifier
model**. Both sit behind an interface with a fake implementation.

ESLint blocks importing `googleapis` or `@anthropic-ai/sdk` anywhere in the server outside
`adapters/`. Verified in both directions.

**A fresh clone runs and passes all tests with no database server, no Google account and no
API key.** That property is a requirement, not a convenience.

### The five tables

`users` · `jobs` · `email_events` · `job_field_provenance` · `sync_state`

**The retention boundary is a type, not a convention.** `classifyOne()` takes a `RawEmail`
carrying subject and body and returns a `ClassifiedEmail` that **structurally has neither**.
Downstream code cannot persist what it cannot see.

### The pipeline, per email

1. **Pre-filter** — cheap rejects before paying for a model call
2. **Idempotency check** — `(user_id, gmail_message_id)` is unique, so a crashed sync is
   always safe to re-read
3. **Classify** — the only point that sees content; returns extracted fields only
4. **Not an application?** Counted, never stored. No row, no id, no domain.
5. **Below the confidence threshold?** → review queue, **no job created**. Nothing is
   asserted as fact until a human confirms it.
6. **Match** to an existing application, or create a new one
7. **Stage decision** — forward-only, human-locked stages frozen
8. **Record the event**, advance `lastEventAt`, archive if terminal

### The three algorithms

**Matching.** Company names are normalised (suffix stripping, punctuation, whitespace).
Role similarity uses the Sørensen–Dice coefficient on character bigrams, but computed on
the *distinguishing* part of a title — `normaliseRole()` strips `graduate`, `program`,
`intern` and intake years first. On raw titles "Graduate Engineer" and "Graduate Trader"
score 0.60, over the threshold, and two unrelated applications at one employer would merge.
A match requires an exact normalised company **plus** either role similarity or a shared
sender domain. A null sender domain never matches another null.

**Stage engine.** Returns a *typed reason*, not a boolean, so the timeline can explain why
an email changed nothing. Order-independent: the same emails in three different arrival
orders reach the same stage.

**Ranking.** `daysUntil()` counts **calendar days in the student's timezone**, not elapsed
time — at 11pm Sunday a 9am Monday deadline is 0.4 elapsed days away but is *tomorrow*.
Ranking, staleness and urgency are pure functions with no I/O.

**Staleness thresholds:** applied 14 days · assessment 5 · interview 7 · offer 3.
**Confidence:** review below 0.75; escalate to the larger model below 0.6.

### Provenance — how corrections survive

`job_field_provenance` records, per field, whether the value came from `ai` or `human` and
with what confidence. The classifier's write path **skips human-locked fields entirely**.
Correcting a field sets it to `human` and clears its confidence.

This is the mechanism behind SM-7, and it is why the UI can honestly show a confidence meter
for a machine guess and an "Edited" tag for a human fact.

---

## 7. Decisions that need defending

Twenty-one decisions are recorded. The ones likely to be questioned:

| | Decision | Why |
|---|---|---|
| **D2** | Postgres in production, SQLite in dev/test | Zero setup for a fresh clone; parity enforced by test |
| **D4** | Build against mocks first, real credentials later | The whole system is testable before any external dependency exists |
| **D5** | Store message id and metadata only, never body or subject | Privacy by construction, not by policy |
| **D6** | Local development now, deployable later | See the local-hosting justification below |
| **D9** | Confidence-gated review queue is in the MVP, not a nice-to-have | An AI product that cannot say "I'm not sure" asserts wrong things as fact |
| **D10** | Six computed stages | Resolved after being open in all four documents |
| **D14** | The accuracy harness is a **CI gate**, not a report | A number nobody blocks on is a number that drifts |
| **D16** | Haiku 4.5 default, Sonnet 5 on escalation | ⚠️ **Chosen from pricing estimates, never measured.** T2.8 exists to settle this and is blocked on the API key. |
| **D17** | 80 synthetic fixtures now, ~300 real later | See the n=80 caveat |
| **D21** | Three parallel owner lanes | Maps to the three team members |

### The local-hosting justification

The TA confirmed local hosting is acceptable **provided the reasoning is documented
convincingly in the RTM**. The reasoning is external and strong, not a matter of
convenience:

- `gmail.readonly` is a Google **restricted** scope. Production verification requires a paid
  third-party security assessment, which a university unit with no budget cannot obtain.
- Test-user mode caps at 100 users, so even an approved app could not be publicly launched
  as originally specified.
- The demo track substitutes a real Gmail read through the team's own connector, so **no
  capability is lost** — only the hosted auth round-trip.

Team decision, 24 August: **OAuth, accessibility and responsiveness all stay in the RTM**,
with OAuth's non-implementation justified rather than the requirement deleted. That commits
the team to actually building responsive (T5.8) and accessibility work.

If a tutor rejects the deferral, implementing T4.1–T4.3 is roughly a week: OAuth with PKCE
and verified `state`, secure sessions, AES-256-GCM refresh-token encryption, plus T4.7's
security suite.

---

## 8. Known defects and open problems

### Open, needing a decision

| | Problem |
|---|---|
| 🔴 **Macquarie merge** | Two genuinely separate applications — "Graduate Program 2027 — Technology" and "Graduate Program 2027 — Data (Sydney)" — merged into one job because both arrived from `recruitment.macquarie.com`. The sender-domain arm of the match fired despite plainly different roles. **Contradicts the project's own rule** that every ambiguous case creates a new job, and maps onto the register's "misclassification" critical risk. Proposed fix: a shared domain is not sufficient when role similarity is *actively low*, as distinct from merely unknown. Needs a team call. |
| ⚠️ **Ambiguous ATS domains generally** | `criteriacorp.com` sends assessment invites for KPMG, PwC **and** nbn. Sender domain is ambiguous across employers, so company extraction from the body carries the whole matching decision on those emails. A miss produces an orphan job rather than a wrong merge — the safe failure. |
| ⚠️ **`emailsReadTotal` never written by the harvest** | The dashboard reads "Emails read: 0" immediately after ingesting 32 emails. Cosmetic but visible in a demo. |
| ⚠️ **`POST /api/sync` returns 501** | Deliberate — the orchestrator (T3.8) is deferred and a 202 that starts nothing is worse than an honest refusal — but it is a visible gap if anyone clicks it. |
| ⚠️ **Voice interaction** | Absent from the RTM and from every document. Team view is it is not needed; one member flagged the risk of being marked against the original brief. Assigned to Jordan to confirm with the tutor. No code implication until answered. |

### Nine specification defects found and recorded (C1–C9)

Six were found reviewing the original specification; three were found by building against it.
Notable ones:

- **C1** — the classifier returned a `reasoning` field described as "logged, never
  persisted". Logs persist, and the field quotes the email — SM-6 violated via the log file.
  Now dev-only, behind a flag.
- **C2** — the server ranked by deadline while the client computed `daysLeft` locally. A row
  could show "2 days" while ranked in the 3–7 bucket. Fixed: the client sends its IANA
  timezone; the server computes both. **The client does no date arithmetic at all.**
- **C7** — `email_events` stored a detected stage, deadline and next action but **no company
  or role**, so a review card could only show a sender domain and a confidence, and
  confirming could only ever return 400. The review queue was unusable as specified. Fixed.
- **C8/C9** — the shared API schemas disagreed with the server in two places, undetected
  because no client had ever consumed them. Found the moment the typed client was written.

### Bugs found by using the product, not by reading the code

Worth mentioning in a pitch as evidence of a working process:

- Five rejected applications were **in the database and visible on no screen** — ranking
  excluded terminal stages from Active, but nothing set `status = 'archived'`, so they never
  reached Archived either.
- A withdrawn application showed a **94% confidence meter beside "Nothing outstanding"** —
  a meter describing a value no longer displayed, which reads as "94% confident there is
  nothing to do".
- A stat card labelled **"Live applications" showed 5 while on the Archived tab**, because
  stats described the current filter rather than the pipeline.
- A pre-filter rule silently dropped both Google fixtures before the classifier ever saw
  them, because `no-?reply@google\.com` also matched `careers-noreply@google.com`.
  **Google is both a mail provider and a major graduate employer.**

### Blockers

| | |
|---|---|
| **B3 — no Anthropic API key** | **The one that matters.** Blocks T2.8 (the benchmark that settles D16) and, in practice, the entire classifier lane. ~$1.30. |
| B1, B2, B4, B5 | All resolved or descoped. |

---

## 9. The two working demos

Both run locally against separate databases and separate API servers.

**Test-data demo** — 25 seeded applications, 22 active / 3 archived, all six stages, all five
urgency buckets, 4 items in the review queue, 8 deadlines due this week. Deadlines are
offsets from "today" rather than fixed dates, so urgency colours stay meaningful. Best for
demonstrating the *interface*.

**Real-inbox demo** — 32 emails from the team member's actual Gmail → 8 applications,
3 active / 5 archived, 4 hard negatives correctly rejected. Best for demonstrating that the
*pipeline* works on real mail.

Highlights from the real data:

- **NAB Graduate Program 2027** — 5 events across two sender domains (`nab.com.au` and
  `mail.pageuppeople.com`) from a verbal offer through a written offer to onboarding, all
  reconstructed into one application
- **PwC** — 7 events across three domains, applied → assessment → digital interview →
  rejected
- **Real deadlines pulled from bodies** — KPMG's "Expires on: Wednesday, March 11, 2026
  9:55 PM AEDT" and PwC's "Deadline: Saturday, March 14 2026, 01:29 PM AEDT"
- **Four correctly rejected hard negatives** — an ANZ "inviting you to apply" from a real
  ATS domain, an Ausgrid talent-community signup, a share-trading account confirmation, and
  a student-loan eCAF. All contain the word "application"; none is one.

**Remember:** the classifications in the real-inbox demo were produced by a human in a chat
session, not by the product.

---

## 10. Commands

The developer is on **Windows with PowerShell 5.1**, where `&&` is a parser error and
`npm.ps1` is blocked by execution policy. Use `npm.cmd`, and give one command per line.

```
npm.cmd test              # 365 tests
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run accuracy      # the CI gate; --demo shows the report shape, --invert proves it fails
npm.cmd run db:reset      # wipe, migrate, seed
npm.cmd run harvest -- <path-to-harvest.json>
npm.cmd run dev:server    # API on :3000
npm.cmd run dev:client    # dashboard on :5173, proxies /api to :3000
```

---

## 11. Conventions and landmines

Things that look like bugs but are deliberate. **Do not "fix" these.**

- **A record belonging to another user returns 404, never 403.** A 403 confirms the record
  exists, which is itself a disclosure.
- **There is no `?sort=`.** Ranking is the product's single opinion.
- **An empty PATCH is a 400, not a 200 no-op.** Silently accepting a request that changes
  nothing hides a broken client.
- **`POST /api/sync` returns 501.** Honest refusal beats a faked 202.
- **A count renders as `—` until known, never `0`.** "0 due this week" is a claim;
  "not loaded yet" is not.
- **A field shows a confidence meter, an "Edited" tag, or neither — never two.** Neither is
  correct when the field has no value.
- **Blank means blank.** Calendar and Archive have no design, so they say so rather than
  showing a placeholder that reads as broken.
- **Zero denominators fail, they do not pass vacuously.** A corpus with no deadline-bearing
  fixtures fails the deadline gate rather than scoring 0/0 as a pass.
- **Every guard is verified in the failing direction.** The forbidden-column check, the
  cross-user scoping assertions, the port-boundary lint rule, the accuracy gate, the icon
  coverage test and the no-hardcoded-colour sweep were each deliberately broken, observed
  failing, then restored.

Other conventions: repository methods take a branded `UserId` **first**, so omitting it is a
compile error · migrations are generated, never hand-written · the design system is vendored
into the client and a drift test fails on any byte of change · no hardcoded colour anywhere
in the client, enforced by test · icons are bundled rather than fetched from a CDN, because
a product with an offline banner should not need the network to draw it.

---

## 12. Documentation map

Ten documents exist in `docs/`, ~4,500 lines. If the chat later gains file access:

| File | What it holds |
|---|---|
| `masterplan.md` | Vision, user groups, the nine success metrics, product principles, scope boundaries |
| `implementation.md` | Architecture, column-level schema, ports, pipeline, matching, ranking, API surface, harness |
| `design.md` | Design tokens, the AI-vs-human visual contract, accessibility, responsive behaviour |
| `app-flow.md` | Routes, state machines, six user journeys, 17 error states, 22 edge cases |
| `tasks.md` | **The source of truth for implementation order** — every task with a concrete done-when, plus blockers and defects |
| `decision-record.md` | D1–D21 with reasoning, plus the specification defects |
| `rules.md` | ~130 one-line standing rules |
| `changelog.md` | Keep a Changelog format, one entry per completed task |
| `codebase-guide.md` | A plain-language tour for teammates who do not know React or Zod |
| `revision-plan.md` | What changes next, derived from the 19 August minutes |

---

## 13. If you are helping with the pitch or the RTM

**The strongest things to claim, with evidence:**

- Privacy by construction — SM-6 has the best evidence in the project, and the retention
  boundary is enforced by the *type system*, not by discipline
- Corrections that survive syncs — tested against five consecutive conflicting updates
- Real multi-domain journeys reconstructed from a genuine inbox
- A test suite that gates on accuracy rather than reporting it
- Nine specification defects found and documented before they shipped

**The things to state as limitations rather than let an assessor find:**

- No live classifier yet; the demo replays human-made classifications
- The accuracy figure is a self-test until the model runs
- n=80 gives ±4.6 points, so the corpus cannot distinguish 96% from 91%
- OAuth, sessions and token encryption are deferred, with external justification
- The Macquarie merge is a known matching defect with a proposed fix

**The framing the TA asked for:** why each feature helps a student achieve their goal — not
what was built. The confidence gate is the clearest example. It exists because an AI product
that cannot say "I'm not sure" will assert wrong things as fact, and a student who catches
it once stops trusting the whole pipeline. That is a product argument, not a technical one.
