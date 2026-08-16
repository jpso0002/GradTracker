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
| 0 — De-risk | 1 | T0.1–T0.3 | ⛔ Blocked — B2, B3 |
| 1 — Foundation | 1–2 | T1.1–T1.7 | ◐ In progress — T1.1–T1.3 done, T1.4 next |
| 2 — Harness | 2–3 | T2.1–T2.8 | ☐ Not started |
| 3 — Pipeline | 3–5 | T3.1–T3.8 | ☐ Not started |
| 4 — API | 5–6 | T4.1–T4.7 | ☐ Not started |
| 5 — Dashboard | 6–8 | T5.1–T5.9 | ☐ Not started |
| 6 — Human-in-the-loop | 8–9 | T6.1–T6.5 | ☐ Not started |
| 7 — Live adapters | 9–11 | T7.1–T7.6 | ☐ Not started |
| 8 — Traceability | 11–12 | T8.1–T8.5 | ☐ Not started |

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
| **B2** | No Google Cloud project exists. | T0.1, T0.2, T7.1 | Team, one member | See T0.1. Needs a signed-in Google account. |
| **B3** | No Anthropic API key. | T0.3, T2.8, T7.3 | Team, one member | See T0.3. |
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

- [ ] **T1.4 — Database schema and migrations** · Lane A · needs T1.3
  `users`, `jobs`, `email_events`, `job_field_provenance`, `sync_state` per
  [implementation.md §4](implementation.md). All indexes. Drizzle, running on both SQLite
  and Postgres.
  *Done when:* `npm run db:migrate` succeeds clean on both engines from empty.

- [ ] **T1.5 — Forbidden-column guard** · Lane B · needs T1.4
  A test asserting no table has a column named `subject`, `body`, `snippet`, `body_html`,
  `from_address`, `raw`, or `password`.
  *Done when:* adding any such column to the schema fails CI. **Verify by adding one
  temporarily and watching it fail.**

- [ ] **T1.6 — Repository layer with mandatory user scoping** · Lane A · needs T1.4
  Every method takes `userId` as its first argument. No method can be called without it —
  enforced by the type signature, not by convention.
  *Done when:* omitting `userId` is a compile error, not a runtime bug.

- [ ] **T1.7 — Seed data** · Lane A · needs T1.6
  ~25 realistic applications across all six stages: overdue deadlines, near deadlines, no
  deadlines, stale jobs, mixed AI/human provenance, 4 pending review items.
  *Done when:* `npm run db:seed` produces a pipeline that exercises every ranking bucket and
  every stage colour.

---

## Phase 2 — Harness *(weeks 2–3)*

**Built before the pipeline it measures.** Accuracy becomes visible in week 3, leaving nine
weeks to improve it.

- [ ] **T2.1 — Port interfaces** · Lane A · needs T1.3
  `GmailClient` and `EmailClassifier` per [implementation.md §5](implementation.md).
  *Done when:* both are defined and nothing above them imports a vendor SDK. **Add a lint
  rule enforcing that** — it is the property the whole test strategy rests on.

- [ ] **T2.2 — Fake adapters** · Lane B · needs T2.1
  `FakeGmailClient` reading `fixtures/emails/`; `FakeEmailClassifier` as a fixture-id map.
  Fake Gmail simulates paging, `historyId` advance, and expiry.
  *Done when:* both are the default under `NODE_ENV=test` with no credentials present.

- [ ] **T2.3 — Classification prompt and schema** · Lane A · needs T2.1
  Version-stamped system prompt: task, six stage definitions, today's date, explicit
  instruction to return `isApplication: false` rather than guess. Output via
  `output_config.format` + `zodOutputFormat` **(C3)**. `reasoning` dev-only and never
  logged in production **(C1)**.
  *Done when:* a fixture classifies to a validated typed object, and no production log line
  can contain email content.

- [ ] **T2.4 — Fixture corpus: 55 positives** · Lane B · needs T2.2
  All six stages. ATS senders (Greenhouse, Workday, Lever, SmartRecruiters) and direct human
  email. ~30 carry explicit deadlines in varied formats: "by Friday 23 May", "within 5
  business days", "before 11:59pm AEST on 23/05".
  *Done when:* 55 email/expected pairs exist, each with `hasExplicitDeadlineLanguage` set.

- [ ] **T2.5 — Fixture corpus: 25 negatives** · Lane B · needs T2.2
  **15 hard** — LinkedIn job alerts, Seek recommendations, university careers newsletters,
  "someone viewed your application", networking invites, recruiter cold outreach for roles
  never applied to. **10 easy** — unit announcements, banking, retail, personal.
  *Done when:* 25 pairs exist. The hard negatives are the ones that matter; anything can
  separate a rejection from a bank statement.

- [ ] **T2.6 — Accuracy harness** · Lane B · needs T2.4, T2.5
  `npm run accuracy` prints accuracy, precision, recall, false-negative count and
  deadline-detection rate against the 95% / 80% thresholds. **Names every false negative by
  fixture id.** Exits non-zero on failure.
  *Done when:* it runs offline, gates CI, and a deliberately broken classifier makes it exit 1.

- [ ] **T2.7 — Wilson confidence interval** · Lane B · needs T2.6
  Print the 95% interval beside the point estimate, so the number is never quoted without
  its uncertainty.
  *Done when:* output reads `Accuracy 96.3% (95% CI: 89.4–98.8%, n=80)`.

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
