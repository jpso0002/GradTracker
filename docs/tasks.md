# GradTracker — Implementation Tasks

**The source of truth for implementation order.** Every task has an ID, an owner lane,
its dependencies, and a concrete done-when. Work top to bottom; a task is only startable
when its dependencies are checked off.

**Companion docs:** [masterplan.md](masterplan.md) (why) · [implementation.md](implementation.md)
(how) · [design.md](design.md) (look) · [app-flow.md](app-flow.md) (behaviour) ·
[decision-record.md](decision-record.md) (choices)

---

## Status board

| Phase | Weeks | Tasks | Status |
|---|---|---|---|
| 0 — De-risk | 1 | T0.1–T0.3 | ⏸ Descoped for the demo track |
| 1 — Foundation | 1–2 | T1.1–T1.7 | ✅ **Complete** — 127 tests green |
| 2 — Harness | 2–3 | T2.1–T2.8 | ◐ T2.1–T2.7 done · T2.8 blocked on B3 |
| 3 — Pipeline | 3–5 | T3.1–T3.7 | ☐ Next — T3.8 deferred |
| 4 — API | 5–6 | T4.4–T4.6 | ☐ Auth tasks deferred |
| 5 — Dashboard | 6–8 | T5.1–T5.9 | ☐ Not started |
| 6 — Human-in-the-loop | 8–9 | T6.1–T6.5 | ☐ Not started |
| 7 — Live adapters | 9–11 | T7.1–T7.6 | ⏸ Deferred — harvest replaces |
| 8 — Traceability | 11–12 | T8.1–T8.5 | ⏸ Deferred |

---

## Demo track *(adopted 16 August 2026)*

**Goal changed:** get a working local demo running against the student's *real* inbox, to
judge whether GradTracker is worth completing, before spending weeks on auth and sync.

**The unlock.** The team's Claude account already has a Gmail connector. Real recruitment
emails can therefore be read and classified in-session and written into the local database
through the existing repository — **no Google Cloud project, no Anthropic API key**.
Blockers **B2 and B3 stop gating the demo entirely**.

Real data also beats invented data as a demo: 25 fictional rows about a fictional student
prove considerably less than the viewer's own pipeline.

### What the demo demonstrates

| Demonstrated live | Not demonstrated |
|---|---|
| Classification and extraction on real email | OAuth and encrypted tokens (SM-5) — no login on a local demo |
| Stage assignment and progression | Incremental sync — the harvest is a snapshot, so "Refresh" has nothing to call |
| Ranked pipeline and urgency ordering (SM-4) | Multi-user isolation — enforced in code, invisible with one user |
| Inline correction with persistent provenance (SM-7) | Gmail rate-limit and crash-recovery behaviour |
| No raw email content in the database (SM-6) — inspectable live | |

### Revised order

```
Phase 3 (pipeline)  →  HARVEST  →  Phase 5 (dashboard)  →  Phase 6 (correction)
```

Phase 3 does **not** shrink. The pipeline is the product; without it the demo is a
spreadsheet that renders nicely.

**Deferred, not deleted** — every task below stays in this file with its acceptance
criteria intact, so the FIT3163 traceability story remains available if the project
continues:

| Deferred | Why it is safe to defer for a demo |
|---|---|
| T3.8 sync orchestrator | The harvest replaces it. Crash-safety still matters for a real product. |
| T4.1–T4.3 auth, sessions, token cipher | No login on a local single-user demo. |
| T7.1–T7.6 live adapters | Superseded by the in-session harvest. |
| T8.1–T8.5 traceability | Reinstate if the FIT3163 deliverable is resumed. |

**Still required for the demo:** T3.1–T3.7, T4.4–T4.6 (routes, without auth), T5.1–T5.9,
T6.1–T6.5.

### Harvest scope

Targeted search only — application confirmations, assessment invites, interview invites,
offers, rejections. Unrelated personal mail is not read. Expected volume 30–100 messages.
Extracted fields are persisted; **subject and body are not**, exactly as the retention
boundary requires, which makes SM-6 demonstrable by inspection during the demo.

---

**Owner lanes.** Three people, three lanes. Lanes run in parallel from Phase 3 onward,
which is the main reason the ports land early.

| Lane | Owns |
|---|---|
| **A — Domain** | Schema, classification pipeline, stage engine, matching, provenance, ranking |
| **B — Quality** | Fixtures, accuracy harness, security and retention tests, live adapters |
| **C — Interface** | App shell, all five views, inline editing, review queue |

**Updating this file.** Tick a task only when its done-when is literally true. If a task
grows a dependency that isn't listed, add it rather than working around it. New work goes
in as a numbered task, not as an untracked side quest.

---

## Decisions locked (16 August 2026)

Settled, no longer open. Full reasoning in [decision-record.md](decision-record.md).

- **Six stages, not seven.** `applied · assessment · interview · offer · rejected ·
  withdrawn`, matching `StageBadge`. "Deadline Approaching" is `DeadlinePill` coloured from
  `daysLeft`; "Follow-up Required" is a computed staleness flag. Both recomputed at render.
- **Classifier: `claude-haiku-4-5`, escalating to `claude-sonnet-5`** below 0.6 confidence.
  ~$4.30 per 2,000-email scan, ~$65 across development.
- **Fixtures: 80 synthetic now, ~300 real labels later.** The 80 prove the harness. The SM-1
  claim rests on the real corpus (T8.3).
- **OAuth spike in week 1** (T0.1), not week 9.

---

## Corrections to apply

Defects found in the docs during review. **These are tasks, not notes** — they are wrong in
the documents right now.

| # | Defect | Fix | Task |
|---|---|---|---|
| C1 | `implementation.md §5.2` has the classifier return `reasoning`, "logged, never persisted". Logs persist, and the field will quote the email — SM-6 violated via the log file. | Drop `reasoning` in production; behind a dev-only flag, scrubbed, never in a persisted log. | T2.3 |
| C2 | `implementation.md §7.9` ranks server-side; `app-flow.md §8` computes `daysLeft` client-side against local midnight. A row can show "2 days" while ranked in the 3–7 bucket. | Client sends its IANA timezone; server ranks with it. One clock. | T3.7 |
| C3 | `implementation.md §7.4` constrains JSON via tool-use schema. | Use `output_config.format` with `zodOutputFormat(ClassificationSchema)` and `messages.parse()` — same Zod schema, API-validated, typed return. | T2.3 |
| C4 | Cost model assumed prompt caching would apply. Haiku 4.5's minimum cacheable prefix is 4,096 tokens; a classifier system prompt is far below it. | No caching on the classifier path. Use the **Batches API for initial scans** instead — 50% discount, and the scan is not latency-sensitive. | T7.4 |
| C5 | D10 was marked open in all four documents. | Now closed — six stages. Update the four docs. | T1.1 |
| C6 | Gmail `gmail.readonly` is a Google-restricted scope: production verification needs a paid third-party security assessment. Not a blocker (test-user mode allows 100 users) but it means the app cannot be publicly launched as specified. | State it as a documented limitation. | T8.2 |

---

## Blockers

Work that cannot proceed without action outside this repository. **A blocker is not a
task** — it is a task's precondition, and it belongs to a person, not a lane.

| # | Blocker | Blocks | Owner | Action needed |
|---|---|---|---|---|
| ~~B1~~ | ~~Node.js is not installed.~~ **Cleared 2026-08-16** — Node v24.19.0 / npm 11.17.0 installed. PowerShell's execution policy blocks `npm.ps1`; use `npm.cmd`, which needs no policy change. | — | — | Resolved. |
| ~~B2~~ | ~~No Google Cloud project.~~ **Descoped for the demo track 16 August 2026** — the Gmail connector on the team's Claude account replaces it. Reinstate if live OAuth is resumed (T7.1). | — | — | Not blocking. |
| ~~B3~~ | ~~No Anthropic API key.~~ **Descoped for the demo track 16 August 2026** — classification runs in-session. Still required for T2.8, the measured Haiku-vs-Sonnet benchmark, which remains the only way to validate decision D16. | T2.8 only | Team | Optional. ~$1.30 settles D16 with evidence rather than pricing estimates. |
| ~~B4~~ | ~~`docs/` is not under version control.~~ **Withdrawn 2026-08-16 — the claim was wrong.** All eight `docs/` files were already tracked and committed in `b6d846f`; the repo had three commits, not one. The claim was made without running `git ls-files`. Uncommitted work was doc *modifications* plus the new scaffold, now committed as `0056599` on branch `setup/scaffold-and-shared-schemas`. | — | — | Resolved. |

---

## Phase 0 — De-risk *(week 1, before anything else)*

Google-side setup fails in ways that take days to unblock. Doing it in week 1 costs half a
day and removes the project's largest schedule risk while there are 11 weeks of slack.

- [ ] **T0.1 — Google Cloud project and OAuth consent screen** · Lane B · no deps
  Create the project, enable the Gmail API, configure the consent screen with the
  `gmail.readonly` scope, add **all three team members** as test users.
  *Done when:* all three can complete the consent flow and see the app listed under their
  Google account permissions.

- [ ] **T0.2 — Throwaway live-fetch spike** · Lane B · needs T0.1
  A single disposable script: OAuth once, fetch one real message, print sender domain and
  received date. **Not** production code — it is deleted or moved to `spikes/` afterwards.
  *Done when:* one real Gmail message has been fetched. Any blocker found is logged as a
  new task.

- [ ] **T0.3 — Anthropic API key and cost baseline** · Lane B · no deps
  Obtain a key, run one classification against a real recruitment email, record actual
  token counts with `messages.count_tokens`.
  *Done when:* measured per-email token cost is recorded here, replacing the estimate.

---

## Phase 1 — Foundation *(weeks 1–2)*

- [x] **T1.1 — Apply decisions to the four docs** · Lane A · no deps · ✅ **2026-08-16**
  Close D10 in all four documents (six stages). Apply corrections C1–C3. Record the model
  choice and corpus plan.
  *Done when:* no document still describes D10 as open, and C1–C3 no longer appear as
  written.
  **Result:** D10 marked resolved in `implementation.md §7.5`; C1 fixed at
  `implementation.md §5.2` (`reasoning` now optional + dev-only, with a retention rule);
  C3 fixed at `§7.4` (structured outputs replace tool-use schema, plus the no-caching note
  from C4); C2 fixed at `app-flow.md §8` (server computes `daysLeft` from the client's IANA
  timezone). Verified by grep — no residual "one open decision", "tool-use schema" or
  "computed client-side" outside the defect records themselves.

- [x] **T1.2 — Repo scaffold** · Lane A · no deps · ✅ **2026-08-16**
  `packages/shared`, `packages/server`, `packages/client`, `fixtures/`. TypeScript strict,
  Vitest, ESLint, `.env.example` with adapters defaulting to `fake`.
  *Done when:* `npm install && npm test` passes with zero tests and zero config edits.
  **Verified:** `npm.cmd install` → 163 packages, **0 vulnerabilities**; `npm.cmd test` →
  18 passed; `npm.cmd run typecheck` → clean; `npm.cmd run lint` → clean. No config edits
  were needed after install. Node v24.19.0, npm 11.17.0.

- [x] **T1.3 — Shared Zod schemas** · Lane A · needs T1.2 · ✅ **2026-08-16**
  `ClassificationSchema`, `JobSchema`, `StageEnum` (six values), API request/response
  schemas. One definition, consumed by server and client.
  *Done when:* client and server both import from `packages/shared` with no duplicated types.
  **Verified:** `tsc --build` resolves `@gradtracker/shared` from both `packages/server` and
  `packages/client` across project references, with no local type declarations in either.
  18 assertions in `stage.test.ts` cover the six-stage enum, progression ranks, terminal and
  user-only sets, staleness thresholds, the classification contract, and the empty-patch
  rejection.

- [x] **T1.4 — Database schema and migrations** · Lane A · needs T1.3 · ✅ **2026-08-16**
  `users`, `jobs`, `email_events`, `job_field_provenance`, `sync_state` per
  [implementation.md §4](implementation.md). All indexes. Drizzle, running on both SQLite
  and Postgres.
  *Done when:* `npm run db:migrate` succeeds clean on both engines from empty.
  **Verified:** `npm run db:migrate` against a real SQLite file creates all five tables from
  empty. `migrate.test.ts` applies both migration sets in-process — libsql in memory and
  **PGlite** (real Postgres compiled to WASM), so no database server is needed — and asserts
  the five tables exist, that a second run is a no-op, and that Postgres actually rejects a
  duplicate `(user_id, gmail_message_id)`.
  **Two schema files, one guarantee:** Drizzle needs a definition per dialect, so
  `schema.parity.test.ts` compares them column by column — names, nullability, primary keys,
  declared indexes, and uniqueness — because two hand-maintained copies drift silently.
  **Deviation from spec:** the three refresh-token columns are `text` holding base64 rather
  than `bytea`/`blob`. Same security property, and it keeps both dialects structurally
  identical so parity can be compared directly. Recorded in `rules.md`.

- [x] **T1.5 — Forbidden-column guard** · Lane B · needs T1.4 · ✅ **2026-08-16**
  A test asserting no table has a column named `subject`, `body`, `snippet`, `body_html`,
  `from_address`, `raw`, or `password`.
  *Done when:* adding any such column to the schema fails CI. **Verify by adding one
  temporarily and watching it fail.**
  **Verified in the failing direction, as required:** `subject: text("subject")` was added to
  `emailEvents`, the suite was run, and **two independent guards fired** — the retention test
  named the offending table and pointed at `implementation.md §4.3`, and the parity test
  caught it as dialect drift. Then reverted; 100 tests green.
  **Scope widened beyond the brief:** 27 forbidden names across three groups — raw content
  (`subject`, `body`, `snippet`, `raw`, `content`, …), identity beyond sender domain
  (`from_address`, `to_address`, `cc`, …), and credentials (`password`, `api_key`,
  `refresh_token`, `token`, …). Also asserts positively what the boundary *permits*
  (`sender_domain`, `gmail_message_id`), so a later reader does not over-apply the rule and
  delete the provenance trail the timeline depends on.

- [x] **T1.6 — Repository layer with mandatory user scoping** · Lane A · needs T1.4 · ✅ **2026-08-16**
  Every method takes `userId` as its first argument. No method can be called without it —
  enforced by the type signature, not by convention.
  *Done when:* omitting `userId` is a compile error, not a runtime bug.
  **Verified in the failing direction:** `repository.typecheck.ts` uses `@ts-expect-error`,
  which inverts the usual direction — if a call that should fail starts compiling, TypeScript
  reports `TS2578: Unused '@ts-expect-error' directive` and the build fails. Confirmed by
  temporarily supplying the `userId` and watching `npm run typecheck` exit 1. The file is
  deliberately **not** named `*.test.ts`, because test files are excluded from the tsconfig
  and a type assertion in one would never be checked.
  **Two guarantees, not one:** omitting `userId` is an arity error, and `UserId` is a
  *branded* type, so an unauthenticated string — a route parameter, a body field — cannot be
  passed where a scoping key is required.
  **The subtle case is provenance.** `job_field_provenance` has no `user_id` column, so its
  methods scope through the owning job via a single `assertOwnsJob` helper. That indirection
  is the one place the guarantee could be quietly lost, so it exists once and has its own
  isolation test.
  **Identity is separated deliberately:** `createIdentityRepository` holds the only two
  operations that legitimately run without a `UserId` — because they are what establishes
  one. Kept tiny so it stays auditable at a glance.
  11 isolation tests, including that a cross-user read returns `undefined` (→ 404, never
  403 — a 403 confirms the record exists).

- [x] **T1.7 — Seed data** · Lane A · needs T1.6 · ✅ **2026-08-16**
  ~25 realistic applications across all six stages: overdue deadlines, near deadlines, no
  deadlines, stale jobs, mixed AI/human provenance, 4 pending review items.
  *Done when:* `npm run db:seed` produces a pipeline that exercises every ranking bucket and
  every stage colour.
  **Verified:** `npm run db:seed` against a real file produces 25 jobs (applied 7,
  assessment 7, interview 6, offer 2, rejected 2, withdrawn 1), 29 events, 4 awaiting review,
  125 provenance rows of which 5 are human-verified. 16 tests assert coverage of all six
  stages and **all five urgency buckets** rather than trusting the list.
  **Deadlines are offsets from an injected "today", never fixed dates.** A seed with
  hardcoded dates silently stops covering the overdue and imminent buckets within a week —
  exactly when someone would be relying on it to check the ranking.
  Terminal stages are archived, so the Active tab excludes them while the badges remain
  exercisable on the Archived tab.

---

## Phase 2 — Harness *(weeks 2–3)*

**Built before the pipeline it measures.** Accuracy becomes visible in week 3, leaving nine
weeks to improve it.

- [x] **T2.1 — Port interfaces** · Lane A · needs T1.3 · ✅ **2026-08-16**
  `GmailClient` and `EmailClassifier` per [implementation.md §5](implementation.md).
  *Done when:* both are defined and nothing above them imports a vendor SDK. **Add a lint
  rule enforcing that** — it is the property the whole test strategy rests on.
  **Verified in the failing direction:** a `googleapis` import placed outside `adapters/`
  fails lint with a message naming the port to use instead; the same import inside
  `adapters/gmail/` passes. Both checked, then removed.
  **Typed errors, not message matching:** `HistoryIdExpiredError`, `GmailRateLimitError`,
  `GmailAuthRevokedError`, `ClassifierUnavailableError`, `ClassificationInvalidError` — so
  the sync engine can catch an expired cursor specifically and fall back to a rescan.
  `ClassificationInvalidError` deliberately carries only a message id, never content.

- [x] **T2.2 — Fake adapters** · Lane B · needs T2.1 · ✅ **2026-08-16**
  `FakeGmailClient` reading `fixtures/emails/`; `FakeEmailClassifier` as a fixture-id map.
  Fake Gmail simulates paging, `historyId` advance, and expiry.
  *Done when:* both are the default under `NODE_ENV=test` with no credentials present.
  **Verified:** both are the default with no credentials, and **forced** to fake under
  `NODE_ENV=test` even when `GMAIL_ADAPTER=live` is set — a test run must never reach a live
  API, not because it would fail but because it might succeed, spending money and coupling
  CI to the network.
  The fake also simulates a mid-batch fetch failure, so T3.8's crash-recovery path has
  something to test against. `FakeEmailClassifier` takes `confidenceFor` and `corrupt` hooks
  specifically so the harness itself can be tested at T2.6 — a fake that can only ever be
  right cannot demonstrate that the accuracy gate detects error.
  **Corpus loader validates ground truth on load** rather than trusting it: a label saying
  "not an application" while naming a company is rejected, because it would silently corrupt
  every precision and recall figure derived from it and the result would look reasonable.

- [x] **T2.3 — Classification prompt and schema** · Lane A · needs T2.1 · ✅ **2026-08-16**
  Version-stamped system prompt: task, six stage definitions, today's date, explicit
  instruction to return `isApplication: false` rather than guess. Output via
  `output_config.format` + `zodOutputFormat` **(C3)**. `reasoning` dev-only and never
  logged in production **(C1)**.
  *Done when:* a fixture classifies to a validated typed object, and no production log line
  can contain email content.
  **C1 made structural:** `emailRef()` reduces an email to message id, thread id, sender
  *domain* and timestamp — the only shape allowed into a log, an error or a metric. Callers
  outside the classifier adapter never hold content to leak. `scrubForLog()` is the backstop
  for objects of unknown shape. Tested by asserting the serialised ref contains no substring
  of the subject or body.
  The prompt names the hard-negative categories explicitly (job alerts, cold outreach,
  "viewed your profile"), since those are what the corpus is built around.
  **`output_config.format` wiring lands with the live adapter at T7.3** — there is no live
  call to constrain until then. The schema it will use is already defined and tested.

- [x] **T2.4 — Fixture corpus: 55 positives** · Lane B · needs T2.2 · ✅ **2026-08-16**
  All six stages. ATS senders (Greenhouse, Workday, Lever, SmartRecruiters) and direct human
  email. ~30 carry explicit deadlines in varied formats: "by Friday 23 May", "within 5
  business days", "before 11:59pm AEST on 23/05".
  *Done when:* 55 email/expected pairs exist, each with `hasExplicitDeadlineLanguage` set.
  **Verified:** 55 positives — applied 13, assessment 15, interview 12, offer 5, rejected 8,
  withdrawn 2. All four ATS domains present plus 8 fixtures from named humans, so the
  classifier cannot learn sender shape instead of content.
  **Deadline-bearing: 26, not 30.** Deliberate shortfall. Deadlines were added only where an
  email would realistically carry one; inventing them in acknowledgements would make the
  corpus less realistic, which is a worse trade than missing a soft target. 26 is the SM-3
  denominator and the harness prints it. Eight distinct phrasings are asserted, including
  "within 5 business days", `12/06/2026`, "close of business", "no later than", "expires in
  48 hours" and "remains open until".
  **Three negative controls carry deadline-shaped text that must NOT be extracted:** an
  applications-close date meant for other applicants (`015`), an interview time (`034`), and
  a promise about when the employer will act (`042`).

- [x] **T2.5 — Fixture corpus: 25 negatives** · Lane B · needs T2.2 · ✅ **2026-08-16**
  **15 hard** — LinkedIn job alerts, Seek recommendations, university careers newsletters,
  "someone viewed your application", networking invites, recruiter cold outreach for roles
  never applied to. **10 easy** — unit announcements, banking, retail, personal.
  *Done when:* 25 pairs exist. The hard negatives are the ones that matter; anything can
  separate a rejection from a bank statement.
  **Verified:** exactly 15 hard and 10 easy. The hard ones are built to defeat the shortcuts
  a classifier might otherwise take:
  - **8 name companies with live applications** — a Seek digest listing REA, Telstra and NAB;
    "someone at Deloitte viewed your profile"; a careers fair listing four employers already
    in the pipeline.
  - **`071` is sent from `greenhouse.io`** — the same ATS domain as genuine application
    emails, so sender domain alone cannot classify. Three domains appear in both positives
    and negatives: `greenhouse.io`, `commbank.com.au`, `seek.com.au`.
  - **6 carry deadline language** — "Register by 20 May", "RSVP by 2 June", "Apply by 30
    June" — so deadline text cannot be treated as evidence of an application.
  - **`066` is from an employer the student applied to**, announcing that applications are
    open. Same sender, same company, opposite meaning.
  Every negative carries a note explaining why it is in the corpus.
  **Ground-truth validation verified in the failing direction:** a label claiming
  `isApplication: false` while naming a company was rejected on load with all three
  contradictions named, then restored.

- [x] **T2.6 — Accuracy harness** · Lane B · needs T2.4, T2.5 · ✅ **2026-08-16**
  `npm run accuracy` prints accuracy, precision, recall, false-negative count and
  deadline-detection rate against the 95% / 80% thresholds. **Names every false negative by
  fixture id.** Exits non-zero on failure.
  *Done when:* it runs offline, gates CI, and a deliberately broken classifier makes it exit 1.
  **Verified from the command line, not only in tests:** `npm run accuracy -- --invert`
  exits **1**; the normal run exits **0**. A gate never observed failing is not known to be a
  gate, so the inversion flag exists to make that checkable by anyone, including a marker.
  **The self-test banner is the important part.** Run against the fake, the harness scores
  100% — because the fake replays the corpus labels. Without a prominent warning someone
  screenshots that for the report. The output states plainly that it measures the harness,
  not a model.
  **`--demo` injects a realistic failure pattern** — the hard negatives naming pipeline
  companies mistaken for applications, an informal human email missed, relative deadlines
  landing two days late, and a deadline invented from an interview time. It produces the
  exact report shape in [implementation.md §11.3](implementation.md).
  Deadline scoring reports **date-correct and exact-time separately**: a 9am deadline
  predicted as 11:59pm is a missed assessment even though the date matches.

- [x] **T2.7 — Wilson confidence interval** · Lane B · needs T2.6 · ✅ **2026-08-16**
  Print the 95% interval beside the point estimate, so the number is never quoted without
  its uncertainty.
  *Done when:* output reads `Accuracy 96.3% (95% CI: 89.4–98.8%, n=80)`.
  **Verified:** `--demo` prints `96.3 %` with `95% CI 89.5 % – 98.7 % (Wilson, n=80)`,
  matching the hand-computed value to three decimal places.
  **Wilson, not the normal approximation**, which misbehaves exactly where this corpus sits
  — small n, proportion near 1. At 80/80 the textbook interval extends above 100%, which is
  not a possible accuracy. Wilson is asymmetric and stays inside [0,1].
  The interval spans ±4.6 points at n=80, so **96.3% and 91% are not distinguishable by this
  corpus** — which is the entire argument for T8.3's 300 real labelled emails, now visible
  in the output rather than buried in a limitations section.

  **One behaviour pinned down while testing:** a corpus with zero deadline-bearing fixtures
  does **not** pass SM-3 vacuously. 0/0 is not 100% — there is nothing to measure, and
  silently passing would let someone delete the deadline fixtures while the gate still
  reported success.

- [ ] **T2.8 — Live-model benchmark mode** · Lane B · needs T2.6, T0.3
  `npm run accuracy -- --live --model=<id>` runs the corpus against the real API and prints
  token cost. Default stays fake.
  *Done when:* Haiku 4.5 and Sonnet 5 both have a recorded accuracy-and-cost figure.

---

## Phase 3 — Pipeline *(weeks 3–5)*

Lanes diverge here. A owns the domain, B owns sync and security, C starts the shell.

- [ ] **T3.1 — Company normalisation and job matching** · Lane A · needs T1.6
  `normaliseCompany()` + Dice coefficient ≥ 0.6 on role bigrams, sender-domain tiebreak.
  Human-verified values become the matching key.
  *Done when:* `matching.test.ts` covers exact match, near-miss roles, legal-suffix variants,
  and the human-key override. Over-merging is worse than a duplicate — test that boundary.

- [ ] **T3.2 — Stage engine** · Lane A · needs T1.4
  Forward-only progression; `rejected`/`offer` from any stage; `withdrawn` never AI-assigned;
  human-locked stage frozen.
  *Done when:* `stages.test.ts` covers all six stages, no-regression, terminal arrivals, and
  the human lock.

- [ ] **T3.3 — Provenance write path** · Lane A · needs T1.6
  `applyExtraction()` skips any field with `source = 'human'`. Enforced in the repository,
  inside the transaction.
  *Done when:* `provenance.test.ts` proves a human value survives a conflicting sync — SM-7's
  core evidence.

- [ ] **T3.4 — Classification pipeline** · Lane A · needs T2.3, T3.1, T3.2, T3.3
  Pre-filter → classify → validate → discard non-application → confidence gate → match →
  apply → advance stage. `classifyOne()` holds the only body reference.
  *Done when:* all 80 fixtures flow end-to-end into jobs and `email_events`.

- [ ] **T3.5 — Confidence gate and escalation** · Lane A · needs T3.4
  Below 0.6 → escalate to Sonnet 5. Below `users.review_threshold` (0.75) → review queue with
  no job. `>=` accepts at the boundary.
  *Done when:* escalation and queueing are both covered, and `classifier_model` records which
  model produced each result.

- [ ] **T3.6 — Retention test** · Lane B · needs T3.4
  Classify a fixture with distinctive subject and body strings, then assert neither substring
  appears in **any column of any table**.
  *Done when:* `retention.test.ts` is green and fails if a body ever reaches the database.
  This is SM-6's proof.

- [ ] **T3.7 — Ranking function** · Lane A · needs T1.6
  Pure function. Urgency bucket → stage rank desc → `last_event_at` asc → company A–Z.
  Follow-up-required capped at bucket 3. **Server ranks using the client's IANA timezone (C2).**
  *Done when:* `ranking.test.ts` asserts exact ordering on fixture pipelines with known
  correct answers, including a timezone-boundary case. This is SM-4's proof.

- [ ] **T3.8 — Sync orchestrator** · Lane B · needs T3.4
  Lock → list → fetch → classify → single transaction committing events, jobs, provenance
  **and `history_id` together**. Token bucket, exponential backoff with jitter, expired-cursor
  fallback.
  *Done when:* `sync.test.ts` proves a crash mid-sync loses nothing, a re-read is idempotent,
  and 429s back off. A skipped email is a missed application.

---

## Phase 4 — API *(weeks 5–6)*

- [ ] **T4.1 — Express app and security middleware** · Lane B · needs T1.2
  HTTPS enforcement + HSTS in production, helmet, CORS restricted to the client origin, rate
  limiting on auth and sync.
  *Done when:* a non-HTTPS production request 308-redirects, asserted in a test.

- [ ] **T4.2 — Session handling** · Lane B · needs T4.1
  `httpOnly`, `secure` in production, `sameSite=lax`, signed, 7-day rolling, destroyed on
  logout.
  *Done when:* cookie flags are asserted; an expired session redirects preserving the intended
  route.

- [ ] **T4.3 — Token cipher** · Lane B · needs T1.4
  AES-256-GCM. Ciphertext, IV and auth tag in separate columns. Key from
  `TOKEN_ENCRYPTION_KEY`.
  *Done when:* a test asserts the persisted bytes do not contain the plaintext, and that
  tampering with the tag fails decryption.

- [ ] **T4.4 — Job routes** · Lane A · needs T3.7, T4.2
  `GET /api/jobs` (ranked, filtered), `GET /api/jobs/:id`, `PATCH /api/jobs/:id`,
  `POST /api/jobs/:id/withdraw`. Zod-validated, user-scoped.
  *Done when:* every route rejects invalid input with 400 naming the field, and a cross-user
  fetch returns **404, not 403** — 403 confirms the record exists.

- [ ] **T4.5 — Review routes** · Lane A · needs T3.5, T4.2
  `GET /api/review`, `POST /api/review/:id/confirm`, `POST /api/review/:id/dismiss`.
  Confirmed fields become `human`.
  *Done when:* a dismissed item never resurfaces, guaranteed by the unique constraint.

- [ ] **T4.6 — Sync routes** · Lane B · needs T3.8, T4.2
  `POST /api/sync` (409 if already running), `GET /api/sync/status`.
  *Done when:* concurrent syncs for one user are impossible.

- [ ] **T4.7 — Security test suite** · Lane B · needs T4.1–T4.6
  Consolidates: no password column, token encryption, HTTPS, session flags, validation,
  cross-user isolation, read-only scope.
  *Done when:* `security.test.ts` covers every clause of SM-5 and is green.

---

## Phase 5 — Dashboard *(weeks 6–8)*

- [ ] **T5.1 — Design system integration** · Lane C · needs T1.2
  Import `styles.css`, wire the components, thin `src/ds/` re-export layer, dark-mode toggle
  via `data-theme`.
  *Done when:* a page renders `Button`, `StageBadge` and `DeadlinePill` correctly in both
  themes, with no hardcoded colour anywhere in `packages/client`.

- [ ] **T5.2 — App shell and routing** · Lane C · needs T5.1
  `SidebarNav` (240px), `TopBar` (56px), routes per
  [app-flow.md §1.1](app-flow.md), theme toggle, `Toast` host.
  *Done when:* all five routes render and the detail panel is deep-linkable.

- [ ] **T5.3 — Typed API client** · Lane C · needs T1.3
  Fetch wrapper consuming the shared Zod types. Sends the browser's IANA timezone on
  pipeline requests **(C2)**.
  *Done when:* the client compiles against server types with no local interface definitions.

- [ ] **T5.4 — Connect view** · Lane C · needs T5.2
  Wordmark, value line, the explicit permissions block with `lock`, "Continue with Google".
  No mesh — product surfaces never get it.
  *Done when:* it states plainly what is and is not accessed, and a denied consent returns
  here with an explanation rather than a dead end.

- [ ] **T5.5 — Pipeline view** · Lane C · needs T5.2, T5.3
  Four `StatCard`s, Active/Archived tabs, stage filter chips, ranked `ApplicationRow` list,
  hairline separation, keyboard-navigable rows.
  *Done when:* a seeded 25-job pipeline renders in correct urgency order and filters
  re-filter without re-sorting.

- [ ] **T5.6 — Detail panel** · Lane C · needs T5.5
  Company, role, stage control, extracted fields with `ConfidenceMeter`, `DeadlinePill`,
  next action, event timeline, withdraw.
  *Done when:* the timeline renders real `email_events` with sender-domain provenance and a
  Gmail deep link.

- [ ] **T5.7 — Empty and error states** · Lane C · needs T5.5
  All seven empty states from [app-flow.md §6](app-flow.md), the offline banner, the
  disconnected banner.
  *Done when:* every state in the table renders, including "synced, none found" routing to the
  threshold setting.

- [ ] **T5.8 — Responsive behaviour** · Lane C · needs T5.5, T5.6
  Four breakpoints per [design.md §11](design.md). Below 768px the table becomes stacked
  cards and the sidebar becomes a bottom tab bar.
  *Done when:* the pipeline is usable at 375px with 44px touch targets and **identical
  ranking** — SM-4 is not a desktop-only promise.

- [ ] **T5.9 — Documentation Center (`/docs` app route)** · Lane C · needs T5.2
  In-app documentation pages: Architecture, Components, Data flow, API, Dependencies.
  Rendered from the markdown in `docs/` rather than hand-written, so the two cannot drift.
  **New scope, added 16 August 2026** — not part of the original MVP definition.
  *Done when:* `/docs` renders all five pages inside the app shell, and editing a file in
  `docs/` changes the rendered page with no second edit.

---

## Phase 6 — Human-in-the-loop *(weeks 8–9)*

The product's most important feature. Every task here serves SM-7.

- [ ] **T6.1 — Inline field editing** · Lane C · needs T5.6, T4.4
  Click → `Input`/`Select` in place, pre-filled and focused. Enter saves, Escape cancels.
  Optimistic with rollback.
  *Done when:* all five extractable fields are editable without leaving the dashboard, and a
  validation failure keeps focus **without discarding what was typed**.

- [ ] **T6.2 — AI-vs-human visual contract** · Lane C · needs T6.1
  Per [design.md §7](design.md): AI field shows `ConfidenceMeter`; human field shows an
  "Edited" `Tag` and **no meter**. Never both, never neither.
  *Done when:* provenance is distinguishable while scanning, without interaction, and carried
  by a text tag rather than colour alone.

- [ ] **T6.3 — Review queue view** · Lane C · needs T4.5, T5.2
  Per-item cards with per-field confidence and source. Confirm / Edit and confirm / Not an
  application. Sidebar count.
  *Done when:* confirming creates or updates a job with confirmed fields marked `human`, and
  the item animates out with focus moving to the next.

- [ ] **T6.4 — Settings view** · Lane C · needs T5.2
  Gmail connection, review-threshold slider ("How sure GradTracker must be before adding an
  application automatically"), follow-up thresholds, theme, disconnect.
  *Done when:* disconnect deletes the encrypted token and sync state, **keeps pipeline data**,
  and says so in the dialog.

- [ ] **T6.5 — Accessibility pass** · Lane C · needs T6.1–T6.4
  Per [design.md §10](design.md): keyboard paths, `role="meter"` with text alternative,
  `aria-live` regions, focus management in dialogs and inline editors, 200% zoom.
  *Done when:* the primary journey is completable by keyboard alone with no trap, and every
  stage and deadline signal survives colour removal.

---

## Phase 7 — Live adapters *(weeks 9–11)*

De-risked by T0.1–T0.2, so this is implementation rather than discovery.

- [ ] **T7.1 — Google OAuth flow** · Lane B · needs T4.3, T0.1
  PKCE, `state` in an httpOnly cookie, code exchange, user upsert by `google_sub`, encrypted
  refresh token, session issued.
  *Done when:* a real sign-in produces a session and an encrypted token, with the plaintext
  never touching a log or a response body.

- [ ] **T7.2 — Live Gmail client** · Lane B · needs T7.1, T2.1
  Implements `GmailClient` against Gmail API v1. Full scan bounded to 2,000 messages or 180
  days. Token refresh, typed `HISTORY_ID_EXPIRED`.
  *Done when:* it satisfies the same interface as the fake and **`sync.test.ts` still passes
  against the fake, unchanged**.

- [ ] **T7.3 — Live Claude classifier** · Lane B · needs T2.3
  Haiku 4.5 default, Sonnet 5 escalation, `messages.parse()` with the shared schema, retry on
  429/529.
  *Done when:* real recruitment emails classify correctly and `npm run accuracy -- --live`
  runs the full corpus.

- [ ] **T7.4 — Batches API for initial scans** · Lane B · needs T7.3
  Route the initial full scan through the Batches API — 50% cheaper, and the scan is not
  latency-sensitive **(C4)**. Incremental syncs stay synchronous.
  *Done when:* a full scan runs as a batch, results keyed by `custom_id`, cost halved and
  recorded.

- [ ] **T7.5 — Progressive first-scan UI** · Lane C · needs T7.2, T4.6
  Rows appear as they classify. Live honest count: "Reading your inbox — 341 of 1,204 emails".
  *Done when:* the first run shows real progress rather than a spinner, and closing the tab
  does not stop the scan.

- [ ] **T7.6 — End-to-end live test** · All lanes · needs T7.1–T7.5
  Real account, real inbox, full scan, incremental sync, correct a field, sync again, confirm
  the correction survived.
  *Done when:* the full loop works against a real inbox for all three team members.

---

## Phase 8 — Traceability *(weeks 11–12)*

- [ ] **T8.1 — Traceability document** · Lane B · needs all test suites
  Every success metric → its test file → current result. Generated from the actual suite, not
  hand-maintained.
  *Done when:* `npm run traceability` emits the table and SM-1…SM-8 all show a real number.
  This is SM-9.

- [ ] **T8.2 — Limitations document** · Lane B · needs T8.1
  Fixture-corpus validity (§3 of the masterplan), the restricted-scope verification
  constraint **(C6)**, and any metric not fully met.
  *Done when:* the honest caveats are in writing before review, not raised in the Q&A.

- [ ] **T8.3 — Real labelled corpus** · All lanes · needs T2.6 · *starts week 3, runs throughout*
  Each member hand-labels ~100 real emails from their own inbox into `fixtures/real/`. **Start
  this in week 3, not week 11** — it is the only thing that makes SM-1 defensible.
  *Done when:* ~300 real labelled emails exist and `npm run accuracy -- --corpus=real` reports
  against them with a confidence interval.

- [ ] **T8.4 — README and setup guide** · Lane A · needs T7.6
  Clone to running in under five minutes, with no database server, Google account or API key.
  *Done when:* a teammate follows it on a clean machine and succeeds without asking a question.

- [ ] **T8.5 — Deployment config** · Lane B · needs T7.6
  Dockerfile, Postgres connection, environment documentation, HTTPS. Written and validated,
  not necessarily provisioned.
  *Done when:* the app runs from a container against Postgres with HTTPS enforced.

---

## Critical path

The chain that determines the finish date. Slip here and the deadline moves.

```
T0.1 → T1.4 → T2.1 → T2.6 → T3.4 → T4.4 → T5.5 → T6.1 → T7.6 → T8.1
OAuth   schema  ports  harness pipeline API   pipeline edit  live   traceability
```

**T8.3 (real corpus) is off the critical path but starts in week 3.** It is the longest-lead
item in the project and the only one that converts the accuracy number from a demonstration
into evidence. Treat a late start on it as the schedule risk it is.

---

## Definition of done

The MVP is complete when every task above is ticked, all nine success metrics in
[masterplan.md §5](masterplan.md) pass their named verification, and a developer who has
never seen the project can run:

```bash
git clone <repo> && cd GradTracker && npm install && npm test && npm run accuracy
```

...and watch every requirement prove itself, with no database server, no Google account, and
no API key.
