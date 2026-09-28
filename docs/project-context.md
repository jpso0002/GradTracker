# GradTracker — Full Project Context

> **What this file is.** A self-contained context payload for a fresh Claude chat that has
> **no access to this repository**. Everything needed is stated inline; nothing here relies
> on opening a file. Written to be blunt rather than diplomatic — if you use it to help
> explain the project to teammates, soften it yourself.
>
> **Accurate as of:** 28 September 2026 — steps 1 and 2 of the Plan of record were built
> that day; the rest of the code last changed 18 August.
>
> **On meeting minutes.** Treat any team meeting minutes as **reference, not fact.** They may
> describe work that does not exist in the repository, or plans since changed. When minutes
> and repository disagree, the repository wins — and ask Jordan rather than guessing.

---

## 1. The product

**GradTracker** is an AI-powered graduate recruitment tracking dashboard.

A final-year university student applies to 20–40 graduate programs and internships in a
season. Every application generates a scatter of emails from different systems — the
employer's own address, plus Workday, Greenhouse, Lever, SmartRecruiters, Criteria Corp,
PageUp. Deadlines arrive buried in bodies. Applications sit in different stages at once.
The student loses track, and the failure is silent: a missed assessment window looks exactly
like nothing happening.

The existing answer is a spreadsheet the student maintains by hand and stops maintaining by
week three.

**What GradTracker does:** reads the student's email, uses an LLM to decide which emails are
job applications, extracts **company, role, stage, deadline and next action** from each,
groups emails into applications, and renders a **single pipeline ranked by urgency**.

**The product's one opinion:** what you should do next. There is deliberately no sort
control — a student who can sort by company name has rebuilt the spreadsheet the product
exists to replace.

### The six stages

`applied` · `assessment` · `interview` · `offer` · `rejected` · `withdrawn`

Progression is forward-only, except `rejected` and `offer`, which apply from any stage.
`withdrawn` is **never** AI-assigned — only a human sets it.

---

## 2. Where the project actually is — the blunt version

### 2.1 The headline

**The backend is built and tested. The dashboard works. There is still no live classifier.**

`packages/server/src/adapters/classifier/` contains exactly two files: `fake.ts` and
`prompt.ts`. The fake replays pre-written labels. **No adapter calls a real model.**

The demo that reads a real inbox works because 32 emails were classified **by a model
operated in a chat session**, written to a file, and replayed through the real pipeline.
Everything downstream of classification is genuine; classification itself is a stand-in.

Consequences:

1. **The product cannot yet classify an email on its own.**
2. **The "misclassification" risk is unmeasurable** until a model runs.
3. **The 100% accuracy the harness prints is a self-test** — the fake scores the corpus
   against itself. The output says so. It proves the harness, not a model.

**The unblock is an Anthropic API key.** One has been created as of late September but **not
yet verified** (blocker B3). Verifying it is the first thing that unlocks the classifier lane.

**On 28 September the classifier moved onto the critical path**: every ingestion path the
team chose classifies live (D23, §4).

### 2.2 Status by phase

| Phase | Scope | Status |
|---|---|---|
| **0 — De-risk** | Google Cloud, API key spike | ⏸ Descoped |
| **1 — Foundation** | Monorepo, shared Zod schemas, DB schema, migrations, repository, seed | ✅ Complete |
| **2 — Harness** | Ports, fakes, prompt, 80-fixture corpus, accuracy harness, Wilson intervals, labelling toolkit and guide | ✅ T2.1–T2.7, T2.9, **T2.11** · ◐ **T2.12** written, completes at T8.3 · T2.8 benchmark waits on B3 · ☐ T2.10 |
| **3 — Pipeline** | Matching, stage engine, provenance, pipeline, ranking, harvest | ✅ T3.1–T3.7, T3.9, **T3.12** · **T3.8 reinstated** as drop-folder sync · ☐ **T3.10, T3.11 new** |
| **4 — API** | Job, review and sync routes | ✅ T4.4, T4.5, T4.8, **T4.9** · ◐ T4.6 · ☐ T4.10 · ⏸ T4.1–T4.3 auth · ☐ T4.7 |
| **5 — Dashboard** | Design system, shell, API client, pipeline, detail panel | ✅ T5.1–T5.3, T5.5, T5.6, **T5.10** · ◐ T5.7 · ⏸ T5.4 · ☐ T5.8, T5.9, T5.11, T5.12 |
| **6 — Human-in-the-loop** | Editing, review queue, settings, accessibility | ☐ Not started · **T6.1, T6.3, T6.4 redefined** · **T6.6 new** |
| **7 — Ingestion & live classifier** | Live classifier, hybrid ingestion | ✅ **T7.8** mailbox reader (pulled forward) · ☐ **T7.3 reinstated** · **T7.7, T7.9, T7.10 new** · ⏸ hosted Gmail (T7.1, T7.2) |
| **8 — Traceability** | Real labelled corpus, traceability, limitations | ☐ **T8.3 reinstated** · rest deferred |

### 2.3 Hard numbers

| | |
|---|---|
| Tests | **449 passing**, 27 files — plus one known-defect test that fails on purpose (C18) |
| Source | ~10,160 lines of TypeScript/TSX (excludes the vendored design system and build output) |
| Fixture corpus | 80 labelled emails — 55 application / 25 not; 27 deadline-bearing; 15 hard negatives |
| Real emails harvested | 32 → 8 applications, 20 updates, 4 correctly rejected |
| Gates | `test`, `lint`, `typecheck`, `accuracy` — all green |
| Commits | All 21 by Jordan (`jpso0002`); a single repository (D22) |

---

## 3. What "completed" looks like

### 3.1 The full product vision

A student signs in once, granting **read-only** Gmail access. GradTracker scans the inbox,
classifies every email and builds a pipeline, then syncs incrementally.

**One screen** shows every live application ranked by urgency — overdue, due this week, gone
quiet. Each row carries company, role, a stage badge, the single next action and a deadline
pill coloured by proximity.

A detail panel shows the extracted fields, each marked with **how the value was obtained** —
a confidence meter if the model extracted it, an "Edited" tag if the student corrected it,
never both — and a timeline of every email in the application, each linking back into Gmail.

Anything wrong is corrected in place, **permanently**: a later sync with a conflicting value
must not overwrite it. Emails the model is unsure about never enter the pipeline as fact;
they go to a review queue for the student to confirm.

**Never stored:** subjects, bodies, or full sender addresses. Only extracted fields, the
sender's domain and the message id.

### 3.2 What the final demo will be *(Plan of record, 28 September)*

- **Local**, run by the team — the TA confirmed a locally hosted demo is acceptable.
- **Mail comes in through hybrid ingestion**: a connector read of a real account, and/or
  Gmail exports (`.mbox`/`.eml`). **Every email classified live.**
- **Three demo modes**, each its own database: a single real account; a test inbox of real
  job-board mail plus **authored** application emails, **marked synthetic**; or both.
- **Refresh** ingests new files from a drop folder.
- **Review queue** live, including ambiguous matches with a suggested application.
- **Panel editing** with Save/Cancel; a per-user threshold slider; search that keeps order.
- **Evidence**: accuracy on a frozen, real, held-out set, every figure with its interval.

### Explicitly out of scope

Marketing site · admin roles · calendar integration · mobile apps · sending email · job-board
scraping · application autofill · **manual "add application"** · **a GradTracker login for
the demo**. **Post-MVP stretch only:** an "upcoming jobs to apply for" module.

---

## 4. The Plan of record *(28 September 2026)*

Twelve decisions, D22–D33, taken after reconciling RTM v3 and the September meetings against
the repository.

| | Decision | The point |
|---|---|---|
| **D22** | One implementation: this repository | Plans reconcile against code, not descriptions |
| **D23** | **Hybrid local ingestion, classified live** | Connector harvest + Gmail exports, one ingest path. Hosted OAuth deferred **on effort, not cost** |
| **D24** | Demo data: real job-board mail + **authored** applications, marked synthetic | Job-board mail alone gives an empty dashboard — ads are negatives by design |
| **D25** | Refresh ingests a **drop folder** | Makes `POST /api/sync` real; 409 on a concurrent run |
| **D26** | **Ambiguous matches go to review** | Fixes the Macquarie merge; the product asks when unsure |
| **D27** | **Panel edit mode**, Save/Cancel | Save sends only changed fields; warns on a stale edit |
| **D28** | Per-user review-threshold **slider** | Applies to new mail only |
| **D29** | Calendar and Archive removed | Deadline pills already do the calendar's job |
| **D30** | Search that **keeps rank order** | Filtering ≠ sorting |
| **D31** | No manual add; no demo login; jobs module is stretch | Scope held |
| **D32** | **Evaluation dataset protocol** | §7.3 |
| **D33** | Every figure carries its interval | Point estimate + interval, never a 95% floor |

### Build order — by dependency, not deadline

| Step | What | Waits on |
|---|---|---|
| **1** ✅ | Stage-correction archive bug (C11) · remove Calendar/Archive · intervals on every figure (C12) — **done 28 Sep** | — |
| **2** ✅ | Labelling toolkit and guide, with the mailbox reader pulled forward — **done 28 Sep** | — |
| **3** ◐ | Prompt v2, so prompt and labels agree — **done 28 Sep** → live classifier → Haiku-vs-Sonnet benchmark | **B3** |
| **4** | Hybrid ingestion: event source + correct Gmail links (C10), unlabelled harvest, one `ingest` command, drop-folder sync | Step 3 |
| **5** | Ambiguous matches → review (C18) | — |
| **6** | Panel editing · review queue screen · row marker · settings API + slider · search | Steps 1, 5 |
| **7** | Empty states · responsive · accessibility audit · security tests · performance · Documentation Center | — |
| **Alongside** | Evaluation dataset: export → inventory → label → freeze → measure. Exporting and labelling can start now | **B6** |

**No hard target for 7 or 9 October** — the team's position is that wherever the work has
reached is fine.

---

## 5. The unit, the team, and the dates

| | |
|---|---|
| **Unit** | FIT3162 / FIT3164 / FIT3189 Software Project Part 2, Monash University *(FIT3161 / FIT3163 / FIT3188 in semester 1)* |
| **Team** | DS-10 — William Moreton, Jordan Psomas, Athan Vass |
| **Client** | The teaching team; no external client |
| **Budget** | Zero |

**Lanes, as the minutes allocate them:** Jordan — classifier and evaluation; William — front
end and design, plus a share of labelling; Athan — backend and client-server. The user of
this document is Jordan.

| When | What |
|---|---|
| 24 Aug 2026 | RTM v3 — nineteen requirements condensed to nine |
| Late Aug | Mid-semester pitch (project management and progress, not the product) |
| 1 Sep, 19 Sep | Team meetings |
| **7 Oct 2026** | Next team meeting, 7:30 PM Zoom |
| **9 Oct 2026** | TA sign-off |
| Unknown | **Final demonstration rubric not yet released** (as of 19 September) |

**For the final demo**, the TA's framing: pitch it **like presenting to investors** — why
each feature helps the student achieve their goal, not merely what was built. Function over
polish. It must show the product solves the problem identified in semester 1.

---

## 6. The RTM — nine requirements *(v3, 24 August 2026)*

This is the assessed contract. Nineteen semester-1 requirements were grouped into nine; none
deleted. Two Complete, six Partial, one Deferred — justified.

| Req | Area | Status | Where it actually stands |
|---|---|---|---|
| **RQ-01** | Read-only mailbox access; no credentials stored | Deferred — justified | Hosted OAuth deferred; no credential column exists (tested). Justification: `gmail.readonly` is restricted; publishing past 100 test users needs a paid assessment |
| **RQ-02** | Ingest without manual entry; each message once; on-demand update | Partial | Ingestion and duplicate protection built and exercised on 32 real emails. Refresh returns 501 today → drop folder (D25) |
| **RQ-03** | ≥95% accuracy on held-out data; precision, recall, FN separately, each with an interval | Partial | Pipeline, prompt and harness built. **No model measured.** Interval on accuracy only (C12). No held-out set yet (C14) |
| **RQ-04** | Extract company, role, stage, deadline, next action; ≥80% deadline detection | Partial | Contract, stage logic and deadline scoring built. Measurement pending. Next action has no scoring method (C13) |
| **RQ-05** | One view, ordered by urgency | **Complete** | Built and tested; order independent of arrival. R09 filter flag → resolved by D30 |
| **RQ-06** | Review and correct every field; corrections persist and are distinguishable; low-confidence goes to review | Partial | Provenance complete and tested. **Editing UI and review screen not built** — the largest remaining user-facing work |
| **RQ-07** | No raw email content persisted | **Complete** | The best-evidenced requirement: enforced by the type system, two guards verified in the failing direction |
| **RQ-08** | Transit/rest protection, validation, sessions, per-user isolation | Partial | Isolation and validation built and tested; transport, sessions, tokens deferred with RQ-01; security suite unwritten |
| **RQ-09** | Browser, mobile + desktop widths, WCAG 2.1 AA, prompt interactions | Partial | Browser, no install. Responsive, accessibility audit and performance measurement not built |

### Recommended v4 amendments *(not yet applied to the RTM)*

- **RQ-01** — add that testing-mode OAuth for one demo account was considered and deferred on
  **effort, not cost**. The RTM itself cites the free 100-user allowlist, so an assessor can
  fairly ask. Answer first.
- **RQ-02** — deliverable becomes drop-folder refresh; remove "deliberately refuses".
- **RQ-03** — state the evaluation protocol (§7.3); replace "≈ $1.30" (that was for 80
  emails) with "priced from current rates before the run".
- **RQ-04** — next action judged acceptable/unacceptable after each run.
- **RQ-05** — R09 resolved: search that preserves order.
- **RQ-06** — deliverable adds panel Save/Cancel, ambiguous-match review with row markers, the
  per-user threshold.
- **RQ-08** — write the security suite now for what exists.
- **RQ-09 — an overclaim to fix.** It says "the design system enforces colour-contrast".
  **Nothing in the repository tests contrast**; what is enforced is *no colour outside the
  design tokens*. Contrast belongs to the WCAG audit.

---

## 7. Success metrics and evidence

### 7.1 The nine metrics

| ID | Metric | Target | Evidence today |
|---|---|---|---|
| **SM-1** | Application vs non-application | ≥95%, P and R separately | ⚠️ Harness gates CI but has only run the fake. No model measured. |
| **SM-2** | False negatives tracked | First-class number | ✅ Counted and asserted. Same caveat. |
| **SM-3** | Deadline extraction | ≥80% | ✅ 26 deadline fixtures, eight phrasings; date-correct and exact-time scored separately. Same caveat. |
| **SM-4** | Most urgent item in one screen | Top item is the answer | ✅ Deterministic ranking, order-independence asserted. **Not yet at mobile widths.** |
| **SM-5** | Zero credentials stored | OAuth, encryption, HTTPS, validation, sessions | ⚠️ No password column (tested). Encryption, HTTPS, sessions unimplemented; `security.test.ts` absent. |
| **SM-6** | No raw content persists | Structured fields only | ✅ **Strongest evidence** — forbidden-column guard across 27 names, plus a content search over every value of every row. Both verified failing. |
| **SM-7** | Corrections persist; AI vs human distinct | 100% editable | ✅ A correction survives five conflicting syncs. **Editing UI unbuilt.** |
| **SM-8** | Browser, prompt | Measured | ⚠️ Runs in a browser; not measured. |
| **SM-9** | Every requirement maps to a test | 100% | ☐ Deferred. |

### 7.2 The statistical caveat

At n=80, the Wilson 95% interval spans about ±4.6 points: **96.3% and 91% are
indistinguishable** on the current corpus. At n≈200 with ~97% measured, the interval is
roughly **93.6–98.6%**. A lower bound at 95% needs about 98% measured. The honest claim is
the point estimate with its interval (D33).

### 7.3 The evaluation protocol *(D32)*

- **Tuning set:** the 80 authored fixtures (they shaped the prompt, so they can never be
  held-out) plus ~40 real emails.
- **Held-out set:** ~200 real emails — about half application emails from the three members'
  own inboxes, half real negatives weighted toward the hard ones. **Size set after an
  inventory** of what the exports contain.
- **Enriched to about half positives, and declared** — a natural inbox is ~98% negatives,
  where answering "no" to everything scores ~98%.
- **Each member exports their own mail** (labelled Gmail search → Google Takeout). Nobody
  reads anyone else's inbox.
- **Spreadsheet labelling** — built 28 September: `npm run label` (inventory, export, import,
  agreement, verify) and `docs/labelling-guide.md`, which quotes the prompt verbatim (a test
  enforces it). **~25 emails double-labelled**; agreement reported. **Open team decision:**
  whose mail forms that sample, and how three members' held-out sets become one figure without
  anyone handling another member's mail.
- **Frozen before any model sees it.** The model never pre-labels held-out data.
- **Authored emails never count** toward the headline figure.
- **Real email content never enters git.**
- **Next action** judged acceptable or not after each run, not labelled in advance.
- **Human time:** roughly 4–5 hours across the team, mostly labelling.

---

## 8. Architecture

### Stack

TypeScript end-to-end, npm workspaces, three packages:

- **`packages/shared`** — Zod schemas; the single source of type truth.
- **`packages/server`** — Express 5 API, ports-and-adapters domain logic, Drizzle ORM.
- **`packages/client`** — React 19 + Vite 7 + react-router 7.

**Postgres** in production, **SQLite** in development and test; two schema definitions kept
in lockstep by a parity test; Postgres verified in-process with PGlite.

### Ports and adapters

Gmail and the classifier each sit behind an interface with a fake. ESLint blocks the Google
and Anthropic SDKs anywhere in the server outside `adapters/`. **A fresh clone runs every
test with no database server, no Google account and no API key.**

### The five tables

`users` · `jobs` · `email_events` · `job_field_provenance` · `sync_state`

**The retention boundary is a type.** `classifyOne()` takes a `RawEmail` with subject and
body and returns a `ClassifiedEmail` that structurally has neither.

### The pipeline, per email

1. **Pre-filter** — skips self-sent mail, calendar notifications and bounces only
2. **Idempotency** — `(user_id, gmail_message_id)` is unique; a crashed run is safe to re-read
3. **Classify** — the only step that sees content
4. **Not an application** — counted, never stored
5. **Below the review threshold** → review queue, **no job created**
6. **Match** to an existing application or create one
7. **Stage decision** — forward-only; human-locked stages frozen
8. **Record the event**; archive if the stage is terminal

### The three algorithms

**Matching.** Normalised company, plus Dice similarity on the *distinguishing* part of the
role (`normaliseRole()` strips "graduate", "program", "intern" and intake years — otherwise
"Graduate Engineer" vs "Graduate Trader" scores 0.60 and merges). **Planned (D26):** a match
on sender domain alone with low role similarity goes to review instead of merging.

**Stage engine.** Returns a typed reason, not a boolean; order-independent.

**Ranking.** `daysUntil()` counts calendar days in the student's timezone. Pure functions.
Staleness: applied 14 days · assessment 5 · interview 7 · offer 3.

### Provenance

`job_field_provenance` records per field whether a value is `ai` or `human`. The classifier's
write path **skips human-locked fields**. This is SM-7's mechanism.

### Planned: hybrid ingestion *(D23)*

```
harvest JSON ─┐
.mbox export ─┼─► reader ─► RawEmail (+ source) ─► processEmail ─► database
.eml files   ─┘                                        ▲  unchanged
                                              live classifier
```

Every event will record its `source` — `connector`, `export` or `synthetic`. **One mailbox,
one path**: the connector gives Gmail API ids and exports give RFC 822 Message-IDs, so the
duplicate protection cannot see an overlap.

---

## 9. Decisions most likely to be questioned

| | Decision | Defence |
|---|---|---|
| **D2** | SQLite in dev, Postgres in prod | Zero-setup clone; parity enforced by test |
| **D5** | Never store body or subject | Privacy by construction, not policy |
| **D9** | Review queue is MVP | An AI product that cannot say "I'm not sure" asserts wrong things as fact |
| **D14** | Accuracy harness is a CI gate | A number nobody blocks on drifts |
| **D16** | Haiku 4.5, escalating to Sonnet 5 | ⚠️ Chosen from pricing, **never measured** — T2.8 settles it |
| **D23** | Hosted OAuth deferred | On **effort**, not cost — testing mode is free for one account; answer that before being asked |
| **D24** | Authored demo emails | Marked synthetic, excluded from accuracy; say so aloud in the demo |
| **D26** | Ambiguous → review | A silent merge destroys history; a question costs one click |
| **D32** | Enriched, frozen held-out set | Declared enrichment; frozen before any model; never model-labelled |

---

## 10. Known defects and open problems

### Recorded 28 September, not yet fixed

| | Problem | Fix |
|---|---|---|
| **C10** | Every "Open in Gmail" link in the real-inbox demo is **broken** — it searches `rfc822msgid:` with a Gmail API id. The test checked the link's shape only. | T7.7 |
| **C13** | Next action has no scoring method. | T2.10 |
| **C14** | The 80 fixtures are not held-out. | T8.3 |
| **C16** | Confirming a review item onto an **existing** application moves its stage and `lastEventAt` **backwards** and locks all five fields, so no later offer or rejection can move it. Latent today; T3.10 would route more items through it. | T3.11 |
| **C18** | A second application at the same employer **merges into the first and overwrites its role** (sender-domain fallback). Pinned by an `it.fails` test. | T3.10 |

**Fixed 28 September:** **C11** — status is now derived from stage inside the repository, so
no code path can archive inconsistently; that also fixed a third affected path, review
confirm. **C12** — every harness figure now prints with its interval, including a new
false-negative rate. The demo run now shows deadline detection at 88.9% with an interval of
71.9–96.1% — a pass at the point estimate that 27 fixtures cannot confirm. **C19** — the
authored labels that contradicted the prompt's own rules are corrected (T2.12, T3.12).
**C17** — an AI-detected withdrawal now becomes a review item on every path, instead of
creating an application straight into `withdrawn`; prompt v2 asks the model to label one.
**C20** — the model is shown the received time in the student's timezone, not only UTC, so
"within 7 days" counts from the right day.

Also: `users.review_threshold` exists but **nothing reads it** — `/api/me` reports the
constant and the harvest hard-codes 0.75 (T4.10). And "Emails read: 0" after a harvest,
because `emails_read_total` is never written (T3.8).

### Open problems

| | |
|---|---|
| **B3** | API key created, not verified. Blocks the classifier and the benchmark. |
| **B6** | Mailbox exports from all three members. Blocks the evaluation dataset. |
| **Voice interaction** | Not in RTM v3. Worth written confirmation from the tutor that it is optional. |
| **Cost** | The labelled-set runs will cost several times the old $1.30 estimate; price from current rates first. |

### Bugs found by *using* the product — useful pitch evidence

- Five rejected applications were **in the database and on no screen** — terminal stages left
  Active but nothing set `archived`. Fixed in the pipeline.
- A withdrawn application showed a **94% confidence meter beside "Nothing outstanding"**.
- **"Live applications: 5" on the Archived tab** — stats described the filter, not the
  pipeline.
- A pre-filter rule **silently dropped both Google fixtures** — Google is a mail provider
  *and* a graduate employer.
- The Macquarie merge: two separate applications fused on a shared sender domain. Decided:
  D26.

---

## 11. The demos as they stand

Both run locally, each with its own database and API server.

**Test-data demo** — 25 seeded applications: 22 active / 3 archived, all six stages, all five
urgency buckets, 4 review items. Deadlines are offsets from the day the seed runs, so **the
data ages** — re-run `npm.cmd run db:reset` on the morning of any demo, or the urgency
colours drain to red.

**Real-inbox demo** — 32 emails from Jordan's Gmail → 8 applications (3 active, 5 archived),
4 hard negatives correctly rejected. NAB Graduate Program 2027 is reconstructed from 5 events
across two sender domains; PwC from 7 across three. Real deadlines were pulled from bodies.
**Its classifications were made in a chat session, and its Gmail links are broken (C10).**

---

## 12. Commands

Windows, **PowerShell 5.1**: `&&` is a parser error and `npm.ps1` is blocked by execution
policy. Use `npm.cmd`, one command per line.

```
npm.cmd test              # 449 tests, plus one that fails on purpose (C18)
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run accuracy      # the CI gate; --demo shows the report shape, --invert proves it fails
npm.cmd run accuracy -- --corpus <held-out folder>   # a labelled set outside the repo
npm.cmd run label -- inventory|export|import|agreement|verify ...   # see labelling-guide.md
npm.cmd run db:reset      # wipe, migrate, seed
npm.cmd run harvest -- <path-to-harvest.json>
npm.cmd run dev:server    # API on :3000
npm.cmd run dev:client    # dashboard on :5173, proxies /api to :3000
```

**Planned:** `npm.cmd run ingest -- [--synthetic] <files or folders>` (T7.10).

---

## 13. Conventions and landmines

Deliberate — **do not "fix" these:**

- **Another user's record returns 404, never 403** — a 403 confirms it exists.
- **No `?sort=`.** Ranking is the product's single opinion. Search narrows; it never reorders.
- **An empty PATCH is a 400.** Silently accepting nothing hides a broken client.
- **`POST /api/sync` returns 501** until the drop folder exists — honest refusal beats a
  faked 202.
- **Counts render `—` until known, never `0`.**
- **A field shows a meter, an "Edited" tag, or neither — never two.** Neither when it has no
  value.
- **Zero denominators fail**, never pass vacuously.
- **Every guard is verified in the failing direction** — broken on purpose, seen to fail,
  restored.

Planned rules that are easy to break:

- **Panel Save sends only changed fields** — sending all five locks every field as "Edited".
- **One mailbox, one ingestion path.**
- **Authored emails are always marked synthetic** and never counted toward accuracy.
- **Real email content never enters git.**
- **The held-out set is frozen before any model sees it.**

---

## 14. Documentation map

Twelve documents in `docs/`, about 5,950 lines. If the chat later gains file access:

| File | What it holds |
|---|---|
| `tasks.md` | **The source of truth** — the Plan of record, every task with a done-when, defects, blockers |
| `decision-record.md` | D1–D34 with reasoning and rejected options; defects C1–C19; risks |
| `labelling-guide.md` | The one reference for labelling real email: definitions quoted from the prompt, deadline and naming rules, worked hard negatives, the workflow |
| `revision-plan.md` | Revision 2 (28 Sep): what changed, the RTM v4 amendments, labelling effort |
| `rules.md` | ~180 one-line standing rules, including ingestion and evaluation |
| `masterplan.md` | Vision, users, the nine success metrics, scope |
| `implementation.md` | Architecture, schema, pipeline, API; §15 holds the planned changes |
| `app-flow.md` | Routes, state machines, journeys, empty and error states |
| `design.md` | Tokens, the AI-vs-human visual contract, accessibility, responsive rules |
| `codebase-guide.md` | A plain-language tour for teammates |
| `changelog.md` | Every completed change, dated |
| `project-context.md` | This file |

---

## 15. If you are helping with the pitch or the RTM

**Claim, with evidence:**

- **Privacy by construction** — SM-6 / RQ-07, the best evidence in the project; enforced by
  the type system.
- **Corrections that survive** — tested against five conflicting syncs.
- **Real multi-domain journeys** reconstructed from a genuine inbox.
- **A test suite that gates on accuracy** rather than reporting it.
- **Twenty specification, build and corpus defects found and recorded** before they reached a user,
  several by using the product rather than reading the code.
- **An evaluation protocol an assessor would respect** — frozen held-out set, declared
  enrichment, double-labelled agreement, intervals on every figure.

**State as limitations, before an assessor finds them:**

- No live classifier yet; current figures are self-tests.
- Hosted OAuth deferred — on effort, not cost.
- The demo inbox contains authored emails, marked synthetic.
- n≈200 gives roughly ±2.5 points; the claim is a point estimate with its interval.
- The real-inbox demo's Gmail links are broken until T7.7.

**The framing the TA asked for:** why each feature helps a student reach their goal. The
clearest example is the review queue: an AI product that cannot say "I'm not sure" will
assert wrong things as fact, and a student who catches it once stops trusting the whole
pipeline. D26 extends the same principle to matching — when GradTracker is not sure two
emails belong to one application, it asks rather than merging. That is a product argument,
not a technical one.
