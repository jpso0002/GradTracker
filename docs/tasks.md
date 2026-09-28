# GradTracker — Implementation Tasks

**The source of truth for implementation order.** Every task has an ID, an owner lane,
its dependencies, and a concrete done-when. Work top to bottom; a task is only startable
when its dependencies are checked off.

**Companion docs:** [masterplan.md](masterplan.md) (why) · [implementation.md](implementation.md)
(how) · [design.md](design.md) (look) · [app-flow.md](app-flow.md) (behaviour) ·
[decision-record.md](decision-record.md) (choices) ·
[revision-plan.md](revision-plan.md) (what changes, and why) ·
[project-context.md](project-context.md) (full context, for a fresh chat)

---

## Status board

| Phase | Weeks | Tasks | Status |
|---|---|---|---|
| 0 — De-risk | 1 | T0.1–T0.3 | ⏸ Descoped for the demo track |
| 1 — Foundation | 1–2 | T1.1–T1.7 | ✅ **Complete** |
| 2 — Harness | 2–3 | T2.1–T2.12 | ◐ T2.1–T2.7, T2.9, **T2.11** done · **T2.12** written, completes at T8.3 · T2.8 waits on B3 · T2.10 open |
| 3 — Pipeline | 3–5 | T3.1–T3.12 | ◐ T3.1–T3.7, T3.9 done · **T3.8 reinstated** as drop-folder sync · **T3.10–T3.12 new** |
| 4 — API | 5–6 | T4.1–T4.10 | ◐ T4.4, T4.5, T4.8, **T4.9** done · T4.6 partial · T4.10 open · auth deferred |
| 5 — Dashboard | 6–8 | T5.1–T5.12 | ◐ T5.1–T5.3, T5.5, T5.6, **T5.10** done · T5.7 partial · T5.4 deferred · T5.11, T5.12 open |
| 6 — Human-in-the-loop | 8–9 | T6.1–T6.6 | ☐ Not started · **T6.1, T6.3, T6.4 redefined** · **T6.6 new** |
| 7 — Ingestion & live classifier | 9–11 | T7.1–T7.10 | ◐ **T7.8 done** (pulled forward for T2.11) · **T7.3 reinstated** · **T7.7, T7.9, T7.10 new** · T7.1, T7.2, T7.4–T7.6 deferred |
| 8 — Traceability | 11–12 | T8.1–T8.5 | ◐ **T8.3 reinstated** · the rest deferred |

**441 tests green, plus one known-defect test that fails on purpose** (C18 — it flips when
T3.10 lands). Steps 1 and 2 of the Plan of record are complete (28 September 2026); every
other task marked **new** or **reinstated** above is open, except T7.8, pulled forward.

---

## Plan of record *(28 September 2026)*

Agreed after reconciling the condensed RTM (v3, 24 August) and the team's September
meetings against this repository. **The repository is the authority on what exists** — where
any other document describes work as done, check here. Reasoning for every choice below is in
[decision-record.md](decision-record.md), **D22–D33**.

### What changed

| | Before | Now |
|---|---|---|
| Classification | In-session, replayed from a harvest file | **Live model** (T7.3), on every ingestion path |
| Ingestion | Connector harvest only | **Hybrid** — connector harvest JSON *and* Gmail export `.mbox`/`.eml`, one ingest path (D23) |
| Demo data | One real inbox | A real account, a test inbox, or both — each its own database (D23, D24) |
| Refresh | `POST /api/sync` returns 501 | **Drop folder** — Refresh ingests new files (D25) |
| Ambiguous matches | Merged on sender domain | **Routed to review** with a suggested application (D26) |
| Editing | Per-field inline | **Panel edit mode**, Save/Cancel (D27) |
| Review threshold | The constant 0.75 | **Per-user slider** in Settings (D28) |
| Sidebar | Calendar and Archive placeholders | **Removed** (D29) |
| Company filter (old R09) | Flagged, undecided | **Search box that keeps rank order** (D30) |
| Test set | ~300 real labels, "later" | **Protocol agreed**; size set after an inventory (D32) |

### Build order

By dependency, not deadline. Steps 1 and 2 needed nothing external. Step 3 starts with
T3.12, which needs nothing either; its T7.3 and T2.8 wait on **B3**.

| Step | Tasks | What | Waits on |
|---|---|---|---|
| **1** ✅ | T4.9 · T5.10 · T2.9 | Stage-correction archive bug (**C11**) · remove Calendar and Archive · an interval on every reported figure (**C12**) — *done 28 Sep* | — |
| **2** ✅ | T2.11 · T2.12 · T7.8 | Labelling toolkit and guide — early, because labelling is human time — with the mailbox reader (T7.8) pulled forward, since the toolkit reads exports — *done 28 Sep; T2.12's done-when completes at T8.3* | — |
| **3** | T3.12 · T7.3 · T2.8 | Prompt v2, so the prompt and the labelling guide agree (**C17**) before anything is measured — then the live classifier, then the Haiku-vs-Sonnet benchmark | T3.12: — · T7.3, T2.8: **B3** |
| **4** | T7.7 · T7.9 · T7.10 · T3.8 · T4.6 | Hybrid ingestion: event source and correct Gmail links (**C10**), unlabelled harvest, one ingest command, drop-folder sync — the mailbox reader (T7.8) already exists | T7.3 |
| **5** | T3.10 · T3.11 | Ambiguous matches routed to review (**C18**) · confirming onto an existing application applies the email, not a correction (**C16**) | — |
| **6** | T6.1 · T6.3 · T6.6 · T4.10 · T6.4 · T5.11 | Panel editing · review queue screen · row marker · settings API and slider · search | T4.9, T3.10 |
| **7** | T5.7 · T5.8 · T6.5 · T4.7 · T5.12 · T5.9 | Empty states · responsive · accessibility audit · security tests · performance · Documentation Center | — |
| **Alongside** | T8.3 · T2.10 | Export → inventory → label → freeze → measure; next-action judgements after each run. **Exporting and labelling can start now** — the toolkit and guide exist | **B6** · measuring: T3.12, T7.3 |

### Demo modes

One pipeline, three ways to fill it. Each is its own database, selected with `DATABASE_URL`:

| Mode | Contents |
|---|---|
| **Single account** | One team member's real inbox, by connector harvest or export |
| **Test inbox** | Real job-board mail from a dedicated test account, plus authored application emails, marked synthetic |
| **Hybrid** | Both, in one pipeline |

**One mailbox, one path.** The connector yields Gmail API ids; exports yield RFC 822
Message-IDs. The same email arriving both ways gets two ids, so the duplicate protection
cannot recognise it. Never ingest one mailbox through both.

---

## Demo track *(adopted 16 August 2026)*

> **Revised 28 September 2026.** Classification is no longer in-session and Refresh is no
> longer a gap. The Plan of record above supersedes this section where they differ; it is
> kept because it records why the demo track was adopted.

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
criteria intact, so the unit's traceability deliverable remains available if the project
continues:

| Deferred | Why it was safe to defer for a demo | Status, 28 September |
|---|---|---|
| T3.8 sync orchestrator | The harvest replaced it. Crash-safety still matters for a real product. | **Reinstated** as drop-folder ingestion (D25) |
| T4.1–T4.3 auth, sessions, token cipher | No login on a local single-user demo. | Still deferred |
| T7.1–T7.6 live adapters | Superseded by the in-session harvest. | **T7.3 reinstated**; T7.7–T7.10 added; the rest still deferred |
| T8.1–T8.5 traceability | Reinstate if the unit's traceability deliverable is resumed. | **T8.3 reinstated**; the rest still deferred |

**Still required for the demo:** see the Plan of record above.

### Harvest scope

Targeted search only — application confirmations, assessment invites, interview invites,
offers, rejections. Unrelated personal mail is not read. Expected volume 30–100 messages. Scope with `newer_than:` — the mailbox goes back to 2022 and holds casual
retail applications that are not part of the graduate pipeline.

Three things the real mailbox will test that the fixtures do not:

- **`criteriacorp.com` sends assessment invites for KPMG, PwC *and* nbn.** The sender
  domain is ambiguous across three employers, so company extraction from the body carries
  the whole matching decision. `findMatch` gates on an exact normalised company before the
  domain fallback applies, so a miss produces an **orphan job, not a wrong merge** — that is
  the failure mode to watch for, and it is the safe one.
- **Two NAB applications and two Macquarie applications** (Summer Intern vs Graduate
  Program; Technology vs Data, Sydney). Correct behaviour is four jobs, not two.
- **`correspondenceanzbanking@…successfactors.com` — "Inviting you to apply for the 2027
  ANZ Australia Graduate program".** A real ATS domain and a real graduate program, for an
  application that was never made. Harder than any hard negative in the 80-fixture corpus.
  Other genuine negatives present: a Westpac *share trading* application, an OS-HELP *loan*
  application, "Your Exclusive VIP Offer Inside", "Final round: Boxing Day Blitz ends soon",
  and newsletter subjects of the form "An interview with …".
Extracted fields are persisted; **subject and body are not**, exactly as the retention
boundary requires, which makes SM-6 demonstrable by inspection during the demo.

**From T7.9, harvest files carry no labels** — each email is classified live at import.
Replaying stored classifications remains available for tests only.

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

## Decisions locked (28 September 2026)

Full reasoning, including the options rejected, in [decision-record.md](decision-record.md)
**D22–D33**.

- **This repository is the single implementation.** All work lands here (D22).
- **Hybrid local ingestion, classified live** — connector harvest and Gmail exports through
  one path. Hosted OAuth stays deferred, on effort rather than cost (D23).
- **Demo data:** real job-board mail in a test inbox, plus authored application emails that
  are **visibly marked synthetic** and excluded from the headline accuracy figure (D24).
- **Refresh ingests a drop folder** (D25).
- **Ambiguous matches go to review** with a suggested application, and that application's row
  carries a "Review required" marker (D26).
- **Panel edit mode with Save/Cancel.** Save sends only the fields actually changed (D27).
- **The review threshold is a per-user slider**, applying to newly ingested mail (D28).
- **Calendar and Archive leave the sidebar** (D29).
- **A company search that keeps rank order** resolves the old R09 flag (D30).
- **Not building:** manual "add application"; a GradTracker login for the demo. **Stretch:** an
  "upcoming jobs to apply for" module (D31).
- **The evaluation protocol is agreed**; the held-out size is set after the inventory (D32).
- **Every reported figure carries its confidence interval** (D33).

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
| C8 | The shared `ListJobsQuerySchema` put `timezone` in the query string; the server has always read the `x-timezone` **header**. Two descriptions of one contract, and the schema held the wrong one. Nothing caught it because no client had ever consumed the schema. | Timezone is a header on every request — one place, every route, rather than each route remembering to ask for it. Removed from the query schema; `jobs.ts` now consumes `ListJobsQuerySchema` instead of a local copy. | **T5.3** Fixed |
| C9 | `MeResponseSchema` required `email`, `displayName` and `reviewThreshold`, none of which `/api/me` returned, and omitted `timeZone` and `demoMode`, which it did. | The schema is the contract, so the server was brought up to it — new `repository.findUser`, which selects no credential columns — and the two demo-mode fields were added to the contract. | **T5.3** Fixed |
| ~~C7~~ | **Fixed 2026-08-18 by T4.8.** ~~`email_events` stores `detected_stage`, `detected_deadline_at` and `detected_next_action` but **no detected company or role**. So a review card can only show a sender domain and a confidence — `GET /api/review` returns `company: null, role: null`, and `POST /:id/confirm` must 400 unless the student types both from memory. The queue is unusable as specified. | Add `detected_company` and `detected_role` to `email_events`. These are *extracted fields*, not raw content — `jobs` already stores both — so SM-6 is unaffected. Migration + repository + `ReviewItem` mapping + fixtures.~~ | ~~**T4.8**~~ Done |
| C6 | Gmail `gmail.readonly` is a Google-restricted scope: production verification needs a paid third-party security assessment. Not a blocker (test-user mode allows 100 users) but it means the app cannot be publicly launched as specified. | State it as a documented limitation. | T8.2 |
| C10 | Every timeline "Open in Gmail" link searches `rfc822msgid:` — an operator that matches an email's RFC 822 `Message-ID` header — but events store **Gmail API ids** (`1977c612af22f96a`). Every link in the real-inbox demo searches for something that does not exist. The test checked only the link's shape; nobody clicked one against real Gmail. | Record each event's source; build the link per id format; show **no** link for authored emails, which were never in a mailbox. Verify by clicking against real Gmail. | **T7.7** |
| ~~C11~~ | **Fixed 28 September 2026 by T4.9** — at the repository, which covered a third affected path (review confirm). ~~`PATCH /api/jobs/:id` setting a terminal stage leaves `status = 'active'`, so the application vanishes from **both** tabs — the bug fixed in the pipeline on 18 August, surviving on a second code path. Invisible only because no UI can set a stage yet; T6.1 would expose it.~~ | ~~A correction that sets a terminal stage archives, exactly as the pipeline and the withdraw route do.~~ | ~~**T4.9**~~ Done |
| ~~C12~~ | **Fixed 28 September 2026 by T2.9.** ~~RQ-03 requires a confidence interval on accuracy, precision, recall **and** false negatives. The harness prints one for accuracy only.~~ | ~~A Wilson interval on every reported proportion.~~ | ~~**T2.9**~~ Done |
| C13 | RQ-04 compares "every extracted field" against ground truth, but next action is free text with no scoring method. | Model outputs judged acceptable or not after each live run, reported as a rate with its interval. | **T2.10** |
| C14 | RQ-03 requires a dataset the classifier "was not tuned against". The 80 fixtures shaped the prompt, so they are not held-out. | They become the tuning set; the held-out set is new, real, and frozen before any model run (D32). | **T8.3** |
| ~~C15~~ | **Fixed 28 September 2026.** ~~Docs gave the unit as FIT3163 — the semester-1 code — for a project now in FIT3162 / FIT3164 / FIT3189 (Software Project Part 2).~~ | ~~Both semesters' codes recorded.~~ | Done |
| C17 | The prompt tells the model **never** to assign `withdrawn`, but withdrawal confirmations are labelled `withdrawn` — in the corpus (057, 058) and by the labelling guide — so a model that obeys its prompt is scored wrong on every one. Worse, the pipeline's **new-application path sets the detected stage directly** (`pipeline.ts`, `stage: c.stage ?? "applied"`), bypassing the stage engine's user-only guard. A probe on 28 September sent IBM's withdrawal confirmation, with no matching application, through the real pipeline: it **created an application straight into `withdrawn`**, archived, AI-provenanced, stage unlocked — the rule "`withdrawn` is never AI-assigned" broken. Latent until the live classifier sees a withdrawal with no history. | The prompt asks the model to *label* a withdrawal confirmation; the pipeline never *applies* an AI-detected user-only stage — it becomes a review item, on every path. | **T3.12** |
| C18 | A second application at the same employer **merges into the first and overwrites its role.** When roles differ, `findMatch` falls back to the sender domain — and one employer's ATS sends every stream's email from one domain. `match.test.ts`'s "different role at the same company" case passes only because it uses a **null** sender domain, which real mail never has. Found 28 September rewriting a pipeline test that T2.12's corpus fixes had broken; pinned by an `it.fails` test in `pipeline.test.ts`. | D26 already routes exactly this case to review; this is the evidence for it. | **T3.10** |
| C19 | Six authored labels disagreed with the prompt or with each other. **Fixed 28 September (T2.12):** 020 labelled a role the email never states — the model sees one email, and the prompt asks for the role "as stated"; 027 was "unresolvable" though "by Friday" is the prompt's own example of a date to resolve, so obeying the prompt scored as an invented deadline; "within N days" meant 23:59 in 023 and 037 but the received time in 020, 030 and 045, so no consistent model could score full marks on exact time; 046's note said "no response deadline" beside a correct one; 001's "Friday 23 May" is a Saturday. **Still open:** 016, 025 and 035 say "Commonwealth Bank" and 045 "Zip Co" where the emails say CommBank and Zip — the guide's naming rule disagrees, and the current prompt sets none. | Relabelled to the guide's rules (§5), which are the prompt's own wherever it has one. The four names are reconciled together with prompt v2, which adopts the guide's naming rule. | T2.12 · **T3.12** |
| C16 | Confirming a review item that **matches an existing application** writes every detected field as a human correction. An older, low-confidence "application received" email confirmed onto an application at interview moves its stage **back** to applied, moves `lastEventAt` **back** from 14 to 2 August, and locks all five fields — so a later offer or rejection can never move it again. Found 28 September by a probe while fixing C11 on the same code path. Latent today — no seeded review item matches an existing application — but T3.10 routes more items through exactly this path. | A match applies the email as the pipeline would; only fields the student edited become human. | **T3.11** |

---

## Blockers

Work that cannot proceed without action outside this repository. **A blocker is not a
task** — it is a task's precondition, and it belongs to a person, not a lane.

| # | Blocker | Blocks | Owner | Action needed |
|---|---|---|---|---|
| ~~B1~~ | ~~Node.js is not installed.~~ **Cleared 2026-08-16** — Node v24.19.0 / npm 11.17.0 installed. PowerShell's execution policy blocks `npm.ps1`; use `npm.cmd`, which needs no policy change. | — | — | Resolved. |
| ~~B2~~ | ~~No Google Cloud project.~~ **Descoped for the demo track 16 August 2026** — the Gmail connector on the team's Claude account replaces it. Reinstate if live OAuth is resumed (T7.1). | — | — | Not blocking. |
| **B3** | **Anthropic API key — reopened 28 September 2026.** Descoped on 16 August while classification ran in-session; back on the critical path now that every ingestion path classifies live (D23). A key has been created but not yet verified. | T7.3, T2.8, the measurement step of T8.3 | Jordan | Verify with one minimal request before T7.3 starts. A 200–300-email set across two models with tuning runs costs several times the original $1.30 estimate — price it from current rates before any run. |
| ~~B5~~ | ~~No application emails in the connected mailbox.~~ **Resolved 2026-08-16, superseded 2026-08-18.** The mailbox survey was run twice more. `jiddan2016@gmail.com` holds only grad-recruitment marketing. `jpso0002@student.monash.edu` holds 2 applications / 15 emails and **no offer at any point**. `jordanpsomas@gmail.com` holds ~12 graduate and vacation applications across ~60 emails, 9+ ATS domains, and **two complete offer journeys** (NAB 2025/26 Summer Intern, NAB 2027 Graduate — the latter accepted and ongoing). It is the source of record. The 16 August conclusion naming `jpso0002` was correct on the evidence then available and wrong once the third mailbox was checked. | — | — | Resolved — use `jordanpsomas@gmail.com`. |
| ~~B4~~ | ~~`docs/` is not under version control.~~ **Withdrawn 2026-08-16 — the claim was wrong.** All eight `docs/` files were already tracked and committed in `b6d846f`; the repo had three commits, not one. The claim was made without running `git ls-files`. Uncommitted work was doc *modifications* plus the new scaffold, now committed as `0056599` on branch `setup/scaffold-and-shared-schemas`. | — | — | Resolved. |
| **B6** | **Mailbox exports from all three members** *(added 28 September 2026)*. Each member runs two Gmail searches in their own inbox — application senders and subjects; job boards — labels the results, and exports that label via Google Takeout. Nobody reads anyone else's mail. | T8.3 | All three | About 15 minutes each, once the T2.11 toolkit exists to receive the files. |

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

- [ ] **T2.8 — Live-model benchmark mode** · Lane B · needs T2.6, T7.3, **B3**
  `npm run accuracy -- --live --model=<id>` runs the corpus against the real API and prints
  token cost. Default stays fake.
  *Done when:* Haiku 4.5 and Sonnet 5 both have a recorded accuracy-and-cost figure.

- [x] **T2.9 — An interval on every figure** · Lane B · needs T2.7 · ✅ **2026-09-28**
  A Wilson interval beside precision, recall and the false-negative rate, not only accuracy.
  Fixes **C12** — this is what RQ-03's verification method literally requires.
  *Done when:* every proportion the harness prints carries `95% CI … (Wilson, n=…)`, checked
  against hand-computed values as T2.7 was.
  *Verified:* every figure is now a `Proportion` — value, successes, n and a Wilson interval
  that is **null when n = 0**. Nine figures carry intervals: accuracy, precision, recall, the
  **false-negative rate** (new — SM-2 as a figure, not only a count), deadline detection,
  exact time, and company, role and stage accuracy. Precision (50/52), recall (50/55), the
  false-negative rate (5/55) and deadline detection (20/26) match hand-computed Wilson values
  from an asymmetric matrix, so a figure over the wrong denominator cannot pass. 0/0 now prints
  "—" and "nothing to measure" instead of "0.0 %". The output sweep was **broken on purpose** —
  precision's interval line deleted — and failed naming the exact line. The gate is unchanged:
  a normal run exits 0, `--invert` exits 1. The demo run shows why this matters: deadline
  detection reads 88.5%, a pass against 80%, but its interval runs **71.0–96.0%** — 26
  fixtures cannot rule out a true rate below target.

- [ ] **T2.10 — Next-action acceptability** · Lane B · needs T7.3, T2.11 · *new 28 Sep*
  Next action is free text, so exact matching means nothing. After a live run, each
  model-written next action is judged acceptable or not in the labelling spreadsheet, and the
  harness reports the acceptance rate with its interval. Fixes **C13**.
  *Done when:* `npm run accuracy` reports a next-action acceptance rate for any run with
  judgements recorded — and says plainly when none exist, rather than printing 0%.

- [x] **T2.11 — Labelling toolkit** · Lane B · needs T2.5, **T7.8** · ✅ **2026-09-28**
  Three commands. **Inventory:** counts per export — candidate positives, negatives, sender
  domains, date range — so the held-out size is chosen from real numbers. **Export to
  spreadsheet:** `.mbox`/`.eml` → one row per email with subject, sender domain, date and a
  body excerpt, a dropdown for stage and a column per field. **Import from spreadsheet:** →
  fixture files the harness reads. Anything containing real email content is written
  **outside the repository**.
  *Done when:* a Takeout `.mbox` round-trips to a spreadsheet and back into fixtures the
  harness scores, and a test proves the export refuses to write inside the repository.
  *Verified:* both, and through the real commands. `npm run label -- inventory | export |
  import | agreement | verify` (`packages/server/src/labelling/`). A synthetic Takeout `.mbox`
  → spreadsheet → labels written into it as a labeller's would be → fixtures that `loadCorpus`
  validates and `npm run accuracy -- --corpus <folder>` scores; the same flow was also run end
  to end through `npm.cmd` in PowerShell. **The repository rule is enforced, not
  conventional:** every write goes through `assertOutsideRepository`, which resolves links and
  compares case-insensitively on Windows — a nested, upper-cased path is refused, a sibling
  `GradTracker-private` folder allowed. The guard was **broken on purpose**: the test run wrote a
  spreadsheet into the repository and failed; restored. Beyond the task, because D32 needs
  them: a seeded `--sample` for the agreement exercise; `agreement` (per-field agreement with
  Wilson intervals and Cohen's κ, every disagreement listed by row); `import --tuning n`, a
  seeded, stratified tuning/held-out split; and a **freeze** — a SHA-256 manifest of every
  held-out file, checked by `verify` and by the harness, which **refuses to score a held-out
  set changed since freezing**. Import is all-or-nothing, each problem listed by row number;
  only ISO dates are accepted (`07/04/2026` is two different days); deadlines are entered as
  the email states them, in its timezone, and converted with daylight saving from the
  platform's timezone database (both sides of the October change tested). The inventory prints
  counts and domains only, never a subject or body; running it on synthetic mail caught two
  faults in its sizing heuristic, both fixed and tested. Needed T7.8, pulled forward. New
  dependencies `mailparser` and `exceljs` (its `uuid` pinned by a scoped override); `npm audit`:
  0 vulnerabilities.

- [ ] **T2.12 — Labelling guide** · Lane B · needs T2.3 · *new 28 Sep* — ◐ *written 2026-09-28; its done-when completes at T8.3*
  One page: what counts as an application email, the six stage definitions **taken from
  `prompt.ts`** so labellers and the model share one definition, how to label deadlines, and
  worked examples of the hard negatives.
  *Done when:* it is the only reference used for T8.3's labelling, and the agreement measured
  there is recorded against it.
  *Written:* [labelling-guide.md](labelling-guide.md). The six stage definitions are quoted
  verbatim, as is every other line it quotes from the prompt — **a test fails if the guide and
  `prompt.ts` drift apart** (`guide.test.ts`, seen failing on a one-word change to each). Writing
  it forced rules the prompt leaves open — deadlines counted in days or hours, "by Friday",
  "close of business", company and role naming — and checking them against the authored
  corpus found six labels in disagreement (**C19**, fixed but for four company names) and the
  `withdrawn` contradiction (**C17**). The spreadsheet's README tab now tells labellers plainly
  to label a withdrawal confirmation `withdrawn`. **Two team decisions are pending** (guide §7,
  and T8.3 below).

---

## Phase 3 — Pipeline *(weeks 3–5)*

Lanes diverge here. A owns the domain, B owns sync and security, C starts the shell.

- [x] **T3.1 — Company normalisation and job matching** · Lane A · needs T1.6 · ✅ **2026-08-16**
  `normaliseCompany()` + Dice coefficient ≥ 0.6 on role bigrams, sender-domain tiebreak.
  Human-verified values become the matching key.
  *Done when:* `matching.test.ts` covers exact match, near-miss roles, legal-suffix variants,
  and the human-key override. Over-merging is worse than a duplicate — test that boundary.
  **A test caught a real defect in the specified algorithm.** `implementation.md §7.6`
  prescribes Dice ≥ 0.6 on role bigrams. On raw titles, **"Graduate Engineer" and "Graduate
  Trader" score exactly 0.60** — the shared word "Graduate" is most of both strings — so the
  spec as written would have merged two entirely different applications at one employer.
  That is precisely the over-merge failure the section warns about.
  **Fix:** `normaliseRole()` strips role boilerplate (`graduate`, `program`, `intern`,
  intake years) before comparison, mirroring what `normaliseCompany()` does for legal
  suffixes, so similarity is measured on the *discriminating* part of a title. "Audit
  Graduate Program" vs "Consulting Graduate Program" now scores below threshold; "Audit
  Graduate Program" vs "…Programme" still scores 1.0. Deviation recorded in `rules.md`.
  Also fixed: `"Acme Pty. Ltd."` normalised to `"acme pty"`, because punctuation stripping
  produced a double space that the multi-word `pty ltd` pattern could not match.
  **A null sender domain never matches another null** — "unknown" is not an identity, and
  treating it as one is a direct route to merging unrelated applications.

- [x] **T3.2 — Stage engine** · Lane A · needs T1.4 · ✅ **2026-08-16**
  Forward-only progression; `rejected`/`offer` from any stage; `withdrawn` never AI-assigned;
  human-locked stage frozen.
  *Done when:* `stages.test.ts` covers all six stages, no-regression, terminal arrivals, and
  the human lock.
  **Order-independence is asserted directly:** the same three emails delivered in three
  different orders reach the same final stage. Gmail does not guarantee order and a re-sync
  replays history, so this is the property that matters rather than any single transition.
  Decisions return a **typed reason** (`would-regress`, `already-terminal`, `user-only`,
  `human-locked`, `no-stage-detected`) rather than a bare boolean, so the timeline can
  eventually explain why an email did not change anything.
  Two judgement calls: an **offer may follow a rejection** (a role reopens, a candidate is
  reconsidered — the newest email is the truth), but **nothing overwrites a withdrawal**,
  because the student made that decision.
  Also includes `isFollowUpRequired()` and `deriveNextAction()`, both computed, never stored.

- [x] **T3.3 — Provenance write path** · Lane A · needs T1.6 · ✅ **2026-08-16**
  `applyExtraction()` skips any field with `source = 'human'`. Enforced in the repository,
  inside the transaction.
  *Done when:* `provenance.test.ts` proves a human value survives a conflicting sync — SM-7's
  core evidence.
  **Verified beyond the stated bar:** a correction survives **five** consecutive conflicting
  syncs, survives a later classification at **confidence 1.0** (there is no score at which
  the pipeline may overrule the student), and locks *only* the corrected field — a student
  who fixes one company name has not opted out of automation for the rest of that job.
  A **cleared** deadline also sticks: correcting a wrongly-extracted deadline to null is
  itself a human answer, and is not refilled on the next sync.
  `applyExtraction` builds one patch and writes once, rather than a write per field: a
  half-applied extraction interrupted mid-way would leave a job in a state no email ever
  described.
  Correcting a company **recomputes `companyNormalised`**, or the corrected job would stop
  matching its own future emails and silently spawn a duplicate.

- [x] **T3.4 — Classification pipeline** · Lane A · needs T2.3, T3.1, T3.2, T3.3 · ✅ **2026-08-16**
  Pre-filter → classify → validate → discard non-application → confidence gate → match →
  apply → advance stage. `classifyOne()` holds the only body reference.
  *Done when:* all 80 fixtures flow end-to-end into jobs and `email_events`.
  **Verified:** the whole corpus runs through the pipeline — 25 negatives produce
  `not-application` and store *nothing at all* (no row, no id, no domain), 55 positives group
  into fewer than 40 jobs rather than 55, proving matching actually merges.
  **The pre-filter dropped two real applications.** A rule skipping
  `no-reply@google.com` also matched `careers-noreply@google.com`, silently filtering both
  Google fixtures before the model ever saw them. Invisible in accuracy figures, because an
  email that never reaches the classifier is never scored. **Google is both a mail provider
  and a major graduate employer** — the rule is gone, and only bounce notifications remain.
  This is exactly the failure §7.3 warns about, and the corpus test caught it as "53 jobs,
  expected 55".
  **The retention boundary is a type, not a discipline.** `classifyOne()` takes a `RawEmail`
  carrying subject and body and returns a `ClassifiedEmail` that structurally has neither —
  downstream code cannot persist what it cannot see.
  Idempotency is checked **before** the model call, so a crash re-read costs nothing.
  `lastEventAt` advances on every accepted email even when no field changed: an employer
  replying "still reviewing" is not a stale job.

- [x] **T3.5 — Confidence gate and escalation** · Lane A · needs T3.4 · ✅ **2026-08-16**
  Below 0.6 → escalate to Sonnet 5. Below `users.review_threshold` (0.75) → review queue with
  no job. `>=` accepts at the boundary.
  *Done when:* escalation and queueing are both covered, and `classifier_model` records which
  model produced each result.
  **Escalation is composed, not branched.** `EscalatingClassifier` wraps two classifiers and
  satisfies the `EmailClassifier` port, so the pipeline never learns escalation exists — and
  the accuracy harness can score the escalating pair exactly as it scores one model.
  The escalated answer **replaces** the primary rather than merging with it; combining two
  disagreeing classifications would produce a result neither model gave, which is
  untraceable at review. Token usage from both calls is summed, because both were paid for.
  **A low-confidence extraction creates no job.** Nothing is asserted until the student
  confirms it. An application with a null company is queued too, rather than inventing a job
  called "null".

- [x] **T3.6 — Retention test** · Lane B · needs T3.4 · ✅ **2026-08-16**
  Classify a fixture with distinctive subject and body strings, then assert neither substring
  appears in **any column of any table**.
  *Done when:* `retention.test.ts` is green and fails if a body ever reaches the database.
  This is SM-6's proof.
  **Stronger than the stated bar:** the entire corpus is run through the real pipeline, then
  every value of every row of all five tables is dumped and searched for every fixture's
  subject, six-word body phrases, and full sender address. `schema.retention.test.ts` proves
  forbidden *columns* do not exist; this proves permitted columns do not *contain* content —
  a `next_action` field stuffed with a sentence of body text would pass the former and fail
  this.
  **Includes a guard against a vacuous pass:** one test plants known content, confirms the
  search finds it, and removes it. Without that, an empty or unsearchable dump would make
  every other assertion pass for the wrong reason.

- [x] **T3.7 — Ranking function** · Lane A · needs T1.6 · ✅ **2026-08-16**
  Pure function. Urgency bucket → stage rank desc → `last_event_at` asc → company A–Z.
  Follow-up-required capped at bucket 3. **Server ranks using the client's IANA timezone (C2).**
  *Done when:* `ranking.test.ts` asserts exact ordering on fixture pipelines with known
  correct answers, including a timezone-boundary case. This is SM-4's proof.
  **`daysUntil` counts calendar days, not elapsed time.** At 11pm Sunday a 9am Monday
  deadline is 0.4 elapsed days away but is *tomorrow* — telling a student "0 days" for
  something due tomorrow is telling them the wrong thing. Asserted against a real timezone
  boundary: 15:00 UTC is already tomorrow in Melbourne and still today in London.
  Input order never affects output, and the alphabetical fourth key means an unchanged
  pipeline always renders identically — without it, tied jobs would swap places between
  requests, which reads as a bug.
  A stale job with no deadline outranks one with a deadline six weeks out.

- [x] **T3.9 — Inbox harvest** · Lane B · needs T3.4 · ✅ **2026-08-16**
  Read real recruitment email through the Gmail connector, classify in-session, and import
  through the real `processEmail` pipeline so matching, staging and provenance are all
  exercised. Replaces T3.8 on the demo track.
  *Done when:* the local database holds the student's real applications, and inspecting it
  shows extracted fields with no subject or body anywhere.
  **Mailbox comparison settled B5.** `jiddan2016@gmail.com` held zero application emails —
  only GradConnection and Forage marketing. `jpso0002@student.monash.edu` holds the real
  thing, and is the mailbox the harvest uses.
  **Result:** 15 emails imported → 2 jobs, 7 application events, 8 correctly rejected.
  - **KPMG 2025/26 Vacationer Program** — a complete five-email journey across two months
    and two sender domains (`criteriacorp.com` for the assessment invite,
    `smartrecruiters.com` for the rest): applied → assessment → assessment → interview →
    rejected. Every transition applied correctly and in order, and the sender-domain
    fallback in `findMatch` is what kept the Criteria invite attached to the same job.
  - **Wesfarmers Graduate Analyst (Business Development)** — two `livehire.com` emails
    matched to one job.
  **Verified: no email content in the database.** Every subject, seven-word body phrase and
  full sender address was searched across all five tables and none appear. What is stored
  per email is exactly: sender *domain*, detected stage, confidence, timestamps, Gmail ids.
  **The negatives are the interesting part.** All 8 were rejected, including a Monash
  *"Thanks for your application to defer your scheduled final assessment"* — containing
  "application", "assessment" and "defer", entirely about coursework — and a KPMG
  candidate-pool newsletter from the **same `smartrecruiters.com` domain** as five genuine
  application emails. Sender domain alone could not have separated those, which is exactly
  what corpus fixture `071` was built to model.
  **Known gap surfaced:** a job reaching a terminal *stage* is not automatically given
  `status = 'archived'`. Ranking already excludes terminal stages from the Active tab, so
  the dashboard is correct, but `listJobs({status:'active'})` still returns the rejected
  KPMG job. Two overlapping notions of "done" — worth reconciling before Phase 5.

- [ ] **T3.8 — Sync orchestrator: drop folder** · Lane B · needs T3.4, T7.10 · *reinstated 28 Sep*
  **Redefined for local ingestion (D25).** Lock → list new files in the configured drop
  folder → ingest each through the T7.10 path → record the file as processed → release.
  `sync_state.state` is the lock. `emails_read_total` and `last_full_scan_at` are written —
  which also fixes the dashboard reading "Emails read: 0" after an ingest.
  The Gmail-API form of this task — `history_id`, token bucket, 429 backoff — moves to T7.2
  and stays deferred with it.
  *Done when:* `sync.test.ts` proves a crash mid-ingest loses nothing, re-reading a file is
  idempotent, a concurrent run is refused, and a processed file is skipped. A skipped email is
  a missed application.

- [ ] **T3.10 — Ambiguous matches go to review** · Lane A · needs T3.1, T4.5 · *new 28 Sep*
  **D26.** `findMatch` returns three outcomes, not two: **match** (company plus role
  similarity), **ambiguous** (company plus sender domain alone, with role similarity actively
  low), or **none**. An ambiguous email becomes a pending review item carrying a
  `suggested_job_id` (new column on `email_events`); nothing is merged. `GET /api/jobs` marks
  rows that have a pending suggestion. Supersedes the "sender domain as a tiebreak" assumption.
  Fixes **C18**: today a second application at one employer merges into the first and
  overwrites its role.
  *Done when:* replaying the 18 August harvest yields **one** Macquarie application and **one**
  review item suggesting it, never a silent merge; both answers to a suggestion are tested; the
  retention guard passes unmodified; the known-defect test in `pipeline.test.ts` ("never
  overwrites one application with another at the same employer") is changed from `it.fails`
  to `it` and passes; and `match.test.ts`'s different-role case uses a real sender domain.

- [ ] **T3.11 — Confirming onto an existing application applies the email** · Lane A · needs T4.5 · *new 28 Sep*
  Fixes **C16**. When a confirmed review item matches an existing application, apply it the
  way the pipeline applies any email: the stage through the stage engine (forward-only, human
  locks respected), `lastEventAt` only ever moving forward, and fields the student did not
  touch written as AI with the item's confidence, skipping human-locked ones. **Only fields the
  student actually changed on the card become human.** Creating a *new* application from a
  card is unchanged — there the card *is* the application, so every confirmed field is human
  (T4.8). Pairs with T3.10, whose "same application" answer runs through this path.
  *Done when:* confirming an older, lower-stage email onto an application at interview leaves
  its stage, `lastEventAt` and field provenance unchanged, and a later offer email still moves
  it — all asserted.

- [ ] **T3.12 — Prompt v2: the prompt and the labelling guide agree** · Lane A · needs T2.12 · *new 28 Sep*
  Fixes **C17** and the open half of **C19**. Must land **before the first live measurement**
  (T2.8, T8.3): a figure measured while the prompt and the labels disagree measures the
  disagreement. Needs no API key.
  1. `withdrawn`: the prompt asks the model to **label** a confirmation of the student's own
     withdrawal; the app still never **applies** one — an AI-detected user-only stage becomes a
     review item on every path, including the new-application path that today creates the
     application straight into `withdrawn`.
  2. The guide's deadline conventions (§5) and naming rule (§3) written into the prompt.
  3. The four authored company labels reconciled with the naming rule (016, 025, 035, 045).
  4. `PROMPT_VERSION` → `v2`, with the guide updated in the same change — its drift test
     demands it.
  *Done when:* a test proves an AI-detected withdrawal never creates or moves an application;
  the guide's drift test passes against v2; the self-test passes on the reconciled corpus.

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

- [x] **T4.4 — Job routes** · Lane A · needs T3.7, T4.2 — *done 2026-08-18*
  `GET /api/jobs` (ranked, filtered), `GET /api/jobs/:id`, `PATCH /api/jobs/:id`,
  `POST /api/jobs/:id/withdraw`. Zod-validated, user-scoped.
  *Done when:* every route rejects invalid input with 400 naming the field, and a cross-user
  fetch returns **404, not 403** — 403 confirms the record exists.
  *Verified:* `routes.test.ts` — 400-with-`field` on unknown status, empty patch and blank
  company; 404 (asserted `not.toBe(403)`) on another user's job across GET, PATCH and
  withdraw. Unknown body fields are stripped, not persisted, so a client cannot smuggle
  `status` or `confidence` into a patch. Ranking is not client-overridable — there is no
  `?sort=`. Withdraw sets **both** `stage` and `status`, closing the gap the harvest found.

- [x] **T4.5 — Review routes** · Lane A · needs T3.5, T4.2 — *done 2026-08-18*
  `GET /api/review`, `POST /api/review/:id/confirm`, `POST /api/review/:id/dismiss`.
  Confirmed fields become `human`.
  *Done when:* a dismissed item never resurfaces, guaranteed by the unique constraint.
  *Verified:* dismissal sets `review_status = 'dismissed'` and never deletes the row, so the
  `(user_id, gmail_message_id)` unique constraint blocks re-insertion on a later sync.
  Confirm writes **every** confirmed field as `human`, and reuses `findMatch` so confirming
  an email for an existing application updates it rather than duplicating it.
  **See defect C7** — the queue cannot yet propose a company or role.

- [ ] **T4.6 — Sync routes** · Lane B · needs T3.8, T4.2 — ◐ *partial 2026-08-18*
  `POST /api/sync` (409 if already running), `GET /api/sync/status`.
  *Done when:* concurrent syncs for one user are impossible.
  *Partial:* `GET /api/sync/status` is complete and reads `sync_state`. `POST /api/sync`
  returns **501, not a faked 202** — T3.8 (the sync orchestrator) is deferred on the demo
  track, so there is nothing to start. The 409-on-concurrent path therefore has no test and
  the done-when is **not** satisfied. Do not tick this until T3.8 lands.
  *28 Sep:* T3.8 is reinstated as drop-folder ingestion (D25), so this completes with it —
  `POST /api/sync` runs the drop-folder ingest and returns 409 while one is already running.

- [x] **T4.8 — Detected company & role on review items** · Lane A · needs T4.5 — *done 2026-08-18*
  Add `detected_company` / `detected_role` to `email_events`, populate them in
  `processEmail`, and surface them on `ReviewItem`. Extracted fields, not raw content —
  the same two values `jobs` already stores — so the retention guard is unaffected and must
  stay green. Fixes defect **C7**.
  *Done when:* `GET /api/review` returns a non-null company and role for a seeded pending
  item, `POST /:id/confirm` succeeds with an empty `corrections` object, and
  `schema.retention.test.ts` still passes unmodified.
  *Verified:* all three, plus the SM-6 content search — which enumerates columns via
  `select()` with no projection, so it picked up the two new columns without being edited,
  and passed with real extracted values in them. Confirming an unedited card writes every
  field as `human` with `confidence: null`; a supplied correction still beats the detected
  value; an event the classifier read no company off still 400s, so that path stayed
  reachable. **Verified in the failing direction** — the pipeline's `detectedCompany` write
  was replaced with `null` and the guard fired before being restored. Closes defect **C7**.

- [x] **T4.9 — Stage corrections archive terminal stages** · Lane A · needs T4.4 · ✅ **2026-09-28**
  A correction that sets `rejected` or `withdrawn` also sets `status = 'archived'` — the rule
  the pipeline and the withdraw route already follow. Fixes **C11**. **Must land before T6.1**,
  which puts a stage control in front of the student.
  *Done when:* a `PATCH` to a terminal stage moves the application from Active to Archived,
  and a `PATCH` from a terminal stage back to a live one returns it to Active.
  *Verified:* both, plus more than the task asked. The rule had been **written by hand at four
  call sites and missing from two**, which is exactly how C11 happened — so it now lives in the
  one place every stage write shares. The repository derives `status` from `stage` on every
  insert and update; `JobPatch` has **no `status` field**, so no caller can set one without the
  other (asserted at type level in `repository.typecheck.ts`), and a status passed by an untyped
  caller is discarded at runtime. The four copies — two in the pipeline, one in the withdraw
  route, one in the seed — are deleted. Fixing the chokepoint also fixed a **third path** found
  on the way: confirming a review item whose detected stage is `rejected` created an application
  on neither tab. Tests written first and seen failing: five repository, two `PATCH`, one
  review-confirm. Two existing tests had been setting `status` by hand, **masking the defect** —
  those workarounds are removed and the tests pass without them. The reseeded demo database
  has identical stage and status pairs, with no archive step anywhere in the seed.

- [ ] **T4.10 — Settings API** · Lane A · needs T4.4 · *new 28 Sep*
  `GET` / `PATCH /api/settings` reading and writing `users.review_threshold`. The column has
  existed since T1.4 (default 0.75) but **nothing reads it**: `/api/me` reports the constant
  and the harvest importer hard-codes 0.75. Ingest passes each user's own threshold instead.
  **Applies to newly ingested mail only** — re-routing mail already processed would un-assert
  applications the student may have acted on (D28).
  *Done when:* changing the threshold changes the routing of the next ingest and nothing
  already stored, both asserted.

- [ ] **T4.7 — Security test suite** · Lane B · needs T4.1–T4.6
  Consolidates: no password column, token encryption, HTTPS, session flags, validation,
  cross-user isolation, read-only scope.
  *Done when:* `security.test.ts` covers every clause of SM-5 and is green.
  *28 Sep:* write it now for what exists — no credential column, validation on every editable
  field, cross-user isolation returning 404 — and add the transport, session and token clauses
  if T4.1–T4.3 are reinstated. RQ-08 is marked Partial on exactly this basis.

---

## Phase 5 — Dashboard *(weeks 6–8)*

- [x] **T5.1 — Design system integration** · Lane C · needs T1.2 — *done 2026-08-18*
  Import `styles.css`, wire the components, thin `src/ds/` re-export layer, dark-mode toggle
  via `data-theme`.
  *Done when:* a page renders `Button`, `StageBadge` and `DeadlinePill` correctly in both
  themes, with no hardcoded colour anywhere in `packages/client`.
  *Verified:* the pipeline renders all three in light and dark, checked in a browser. The
  design system is **vendored** into `src/ds/vendor/` — it lives at the repo root in a
  folder with a space in its name, outside every package — and `ds.sync.test.ts` fails if
  the copy drifts from the source, the same guard the two schema dialects use.
  `src/ds/index.ts` re-exports only; nothing is wrapped or restyled.
  `no-hardcoded-colour.test.ts` sweeps every `.ts`/`.tsx` outside `vendor/` for hex,
  `rgb()`, `hsl()` and named colours, and asserts it found source to check so an empty
  sweep cannot pass vacuously. Theme is `data-theme` on `<html>` and nothing else.

- [x] **T5.2 — App shell and routing** · Lane C · needs T5.1 — *done 2026-08-18*
  `SidebarNav` (240px), `TopBar` (56px), routes per
  [app-flow.md §1.1](app-flow.md), theme toggle, `Toast` host.
  *Done when:* all five routes render and the detail panel is deep-linkable.
  *Verified:* clicking a row navigates to `/pipeline/:jobId` and the URL is bookmarkable;
  browser-back closes the panel rather than leaving the pipeline. Calendar and Archive are
  in the sidebar and lead to a view that says no design exists yet — blank means blank
  (design.md §9), not a placeholder that reads as broken. *28 Sep:* both are removed by T5.10
  (D29).

- [x] **T5.3 — Typed API client** · Lane C · needs T1.3 — *done 2026-08-18*
  Fetch wrapper consuming the shared Zod types. Sends the browser's IANA timezone on
  pipeline requests **(C2)**.
  *Done when:* the client compiles against server types with no local interface definitions.
  *Verified:* every response type is inferred from a shared Zod schema and **parsed** at
  runtime, not cast — an unexpected payload fails next to the request rather than three
  components deep. `NetworkError` is separate from `ApiError` so "could not reach the
  server" and "the server said no" reach different surfaces. Satisfying this exposed two
  contract defects, both fixed — see **C8** and **C9**.

- [ ] **T5.4 — Connect view** · Lane C · needs T5.2 — ⏸ *deferred with T4.1–T4.3*
  Wordmark, value line, the explicit permissions block with `lock`, "Continue with Google".
  No mesh — product surfaces never get it.
  *Done when:* it states plainly what is and is not accessed, and a denied consent returns
  here with an explanation rather than a dead end.
  *Deferred:* the done-when is entirely about the OAuth consent round-trip, and T4.1–T4.3
  are deferred on the demo track. A Connect screen with a "Continue with Google" button that
  cannot connect would misrepresent what the demo does. The app announces demo mode in the
  sidebar instead. Reinstate with T7.1.

- [x] **T5.5 — Pipeline view** · Lane C · needs T5.2, T5.3 — *done 2026-08-18*
  Four `StatCard`s, Active/Archived tabs, stage filter chips, ranked `ApplicationRow` list,
  hairline separation, keyboard-navigable rows.
  *Done when:* a seeded 25-job pipeline renders in correct urgency order and filters
  re-filter without re-sorting.
  *Verified:* rendered live against the seeded database — 23 active, overdue first, stage
  badges and urgency-coloured deadline pills correct. A test feeds a deliberately
  non-alphabetical, non-date order and asserts the DOM preserves it, so any client-side
  sort fails. Filters are sent to the server, which re-ranks; the client never reorders what
  it holds. There is no `?sort=` control. Counts render as **—** until known, because
  "0 due this week" is a claim and "not loaded yet" is not.

- [x] **T5.6 — Detail panel** · Lane C · needs T5.5 — *done 2026-08-18*
  Company, role, stage control, extracted fields with `ConfidenceMeter`, `DeadlinePill`,
  next action, event timeline, withdraw.
  *Done when:* the timeline renders real `email_events` with sender-domain provenance and a
  Gmail deep link.
  *Verified:* the timeline shows each event's stage, date, detected company and role (T4.8)
  and links to `rfc822msgid:` in Gmail — a deep link, because GradTracker stores no subject
  or body and sending the student to their own inbox is the only honest way to show a source
  (SM-6). The AI-vs-human contract is tested three ways: meter for `ai`, "Edited" tag for
  `human`, and **neither when the field has no value**. That third case was a real bug found
  by using the app: a withdrawn job showed a 94% meter beside "Nothing outstanding", which
  reads as "94% sure there is nothing to do" — a claim the product never made.

- [ ] **T5.7 — Empty and error states** · Lane C · needs T5.5 — ◐ *partial 2026-08-18*
  All seven empty states from [app-flow.md §6](app-flow.md), the offline banner, the
  disconnected banner.
  *Done when:* every state in the table renders, including "synced, none found" routing to the
  threshold setting.
  *Partial:* the pipeline has four — empty, filtered-to-nothing, offline and error — each
  distinguishable from the others, plus a row-shaped loading skeleton rather than a spinner.
  The remaining states from app-flow.md §6 and the disconnected banner are not built, and
  "synced, none found" cannot route to a threshold setting that does not exist yet (T6.5).

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

- [x] **T5.10 — Remove Calendar and Archive** · Lane C · needs T5.2 · ✅ **2026-09-28**
  **D29.** Deadline pills already show due and overdue on every row, which is what a calendar
  was for; Archive only duplicated the Archived tab. Their placeholder routes go too.
  *Done when:* neither appears in the sidebar and neither route resolves to a placeholder.
  *Verified:* four tests written first, three seen failing — the positive control, that every
  remaining destination is still there, passed throughout, so an empty sidebar cannot satisfy
  the others. In the browser the sidebar reads Applications · Needs review · Settings ·
  Documentation, with no empty "Coming soon" heading; `/calendar` and `/archive` resolve to Not
  found; no console errors. Also corrected the Settings placeholder, which said settings arrive
  with T6.5 — Settings is T6.4.

- [ ] **T5.11 — Search that keeps rank order** · Lane C · needs T5.5 · *new 28 Sep*
  **D30**, resolving the old R09 flag. A search box narrows the list by company or role; the
  order stays the server's — the same rule the stage chips already follow.
  *Done when:* a test types a query and asserts the surviving rows keep their server order,
  and that clearing it restores the full list unchanged.

- [ ] **T5.12 — Performance measurement** · Lane B · needs T5.5 · *new 28 Sep*
  RQ-09's performance clause and SM-8: time the pipeline render and an edit round-trip on the
  seeded 25-application database. The lower-priority part of RQ-09.
  *Done when:* `performance.test.ts` records both timings against a stated budget.

---

## Phase 6 — Human-in-the-loop *(weeks 8–9)*

The product's most important feature. Every task here serves SM-7.

- [ ] **T6.1 — Panel edit mode** · Lane C · needs T5.6, T4.4, **T4.9** · *redefined 28 Sep*
  **D27.** The detail panel switches into edit mode and all five extractable fields become
  editable together. Changes are held in a temporary state: **Save** commits them in one
  request, **Cancel** discards them. Two rules that are easy to get wrong:
  - **Save sends only the fields actually changed.** Sending all five would stamp every field
    "Edited" and lock it against the classifier for good, though the student changed nothing.
  - **If an ingest updated the application while the panel was open, Save warns before
    overwriting**, rather than silently replacing a value the student never saw.
  *Done when:* all five fields are editable without leaving the dashboard; an untouched Save
  changes no provenance; a validation failure keeps the student's typing; and the stale-edit
  warning is tested.

- [ ] **T6.2 — AI-vs-human visual contract** · Lane C · needs T6.1
  Per [design.md §7](design.md): AI field shows `ConfidenceMeter`; human field shows an
  "Edited" `Tag` and **no meter**. Never both, never neither.
  *Done when:* provenance is distinguishable while scanning, without interaction, and carried
  by a text tag rather than colour alone.

- [ ] **T6.3 — Review queue view** · Lane C · needs T4.5, T5.2, T3.10
  Per-item cards with per-field confidence and source. Confirm / Edit and confirm / Not an
  application. Sidebar count. *28 Sep:* an item carrying a suggested application (T3.10) asks
  **same application, or a new one?** before confirming.
  *Done when:* confirming creates or updates a job with confirmed fields marked `human`, both
  answers to a suggestion are tested, and the item animates out with focus moving to the next.

- [ ] **T6.4 — Settings view** · Lane C · needs T5.2, T4.10 · *redefined 28 Sep*
  Review-threshold slider ("How sure GradTracker must be before adding an application
  automatically"), stating that it applies to new mail only (D28) · theme. Gmail connection
  and Disconnect are deferred with T4.1–T4.3 — there is no stored token to disconnect.
  *Done when:* moving the slider persists through `PATCH /api/settings`, and the next ingest
  routes by the new threshold.

- [ ] **T6.5 — Accessibility pass** · Lane C · needs T6.1–T6.4
  Per [design.md §10](design.md): keyboard paths, `role="meter"` with text alternative,
  `aria-live` regions, focus management in dialogs and inline editors, 200% zoom.
  *Done when:* the primary journey is completable by keyboard alone with no trap, and every
  stage and deadline signal survives colour removal. *28 Sep:* RQ-09 names **WCAG 2.1 AA** —
  record the audit against it, including a contrast check, since nothing in the repository
  checks contrast today.

- [ ] **T6.6 — "Review required" marker on rows** · Lane C · needs T3.10, T6.3 · *new 28 Sep*
  A row with a pending suggestion (T3.10) carries a small marker linking to that item in the
  review queue — the concrete meaning of the marker proposed on 1 September.
  *Done when:* the marker appears exactly while a pending suggestion exists, disappears once
  it is resolved, and is announced to assistive technology rather than carried by colour.

---

## Phase 7 — Ingestion and live classifier *(weeks 9–11)*

**Revised 28 September 2026 (D23).** The live classifier (T7.3) is reinstated — every
ingestion path now classifies live. Hosted Gmail access (T7.1, T7.2) stays deferred; mail
arrives through the hybrid local path instead (T7.7–T7.10). T7.4–T7.6 stay deferred with it.

- [ ] **T7.1 — Google OAuth flow** · Lane B · needs T4.3, T0.1 — ⏸ *deferred (D23)*
  PKCE, `state` in an httpOnly cookie, code exchange, user upsert by `google_sub`, encrypted
  refresh token, session issued.
  *Done when:* a real sign-in produces a session and an encrypted token, with the plaintext
  never touching a log or a response body.

- [ ] **T7.2 — Live Gmail client** · Lane B · needs T7.1, T2.1 — ⏸ *deferred (D23)*
  Implements `GmailClient` against Gmail API v1. Full scan bounded to 2,000 messages or 180
  days. Token refresh, typed `HISTORY_ID_EXPIRED`.
  *Done when:* it satisfies the same interface as the fake and **`sync.test.ts` still passes
  against the fake, unchanged**.

- [ ] **T7.3 — Live Claude classifier** · Lane B · needs T2.3, **B3** · *reinstated 28 Sep*
  Haiku 4.5 default, Sonnet 5 escalation, `messages.parse()` with the shared schema, retry on
  429/529. The adapter sits in `adapters/classifier/` beside the fake; nothing downstream
  changes. Check the SDK's current structured-output API before writing it (defect **C3**).
  *Done when:* real recruitment emails classify correctly and `npm run accuracy -- --live`
  runs the full corpus.

- [ ] **T7.4 — Batches API for initial scans** · Lane B · needs T7.3 — ⏸ *deferred; revisit if a labelled-set run proves costly*
  Route the initial full scan through the Batches API — 50% cheaper, and the scan is not
  latency-sensitive **(C4)**. Incremental syncs stay synchronous.
  *Done when:* a full scan runs as a batch, results keyed by `custom_id`, cost halved and
  recorded.

- [ ] **T7.5 — Progressive first-scan UI** · Lane C · needs T7.2, T4.6 — ⏸ *deferred with T7.2*
  Rows appear as they classify. Live honest count: "Reading your inbox — 341 of 1,204 emails".
  *Done when:* the first run shows real progress rather than a spinner, and closing the tab
  does not stop the scan.

- [ ] **T7.6 — End-to-end live test** · All lanes · needs T7.1–T7.5 — ⏸ *deferred with T7.1*
  Real account, real inbox, full scan, incremental sync, correct a field, sync again, confirm
  the correction survived.
  *Done when:* the full loop works against a real inbox for all three team members.

- [ ] **T7.7 — Event source and correct Gmail links** · Lane A · needs T1.4 · *new 28 Sep*
  A new `source` column on `email_events`: `connector`, `export` or `synthetic`. The timeline
  builds each Gmail link from it — the Gmail API id form for connector events, `rfc822msgid:`
  for exports — and shows **no** link for synthetic emails, plus a visible "Synthetic" tag.
  Fixes **C10**.
  *Done when:* each link type is tested, **and one link of each real type is clicked against
  real Gmail and opens the right email** — the step skipped the first time.

- [x] **T7.8 — Mailbox file reader** · Lane B · needs T2.1 · ✅ **2026-09-28** *(pulled forward for T2.11)*
  Reads a Google Takeout `.mbox` and individual `.eml` files into `RawEmail` through an
  established MIME parsing library: multipart bodies, quoted-printable and base64, HTML-only
  emails reduced to text — many ATS emails are HTML-only. The RFC 822 `Message-ID` is the
  message id; the Gmail thread id is used where the export carries one.
  *Done when:* fixtures covering multipart, HTML-only, encoded and non-ASCII emails parse
  correctly, and a malformed message is skipped and counted rather than aborting the file.
  *Verified:* `packages/server/src/mailbox/reader.ts`, on `mailparser`. Eleven tests, each email
  built as raw text: plain; multipart, text part preferred; HTML-only in quoted-printable with
  non-ASCII ("Café"); a base64 body ("résumé"); mbox splitting that does **not** split on a
  "From " inside a paragraph, and unescapes mboxrd `>From`; a malformed message skipped,
  counted and located while the rest of the file reads; a stable id derived when a message has
  no `Message-ID`; Gmail's `X-GM-THRID` as the thread id; folders read recursively in a stable
  order; duplicates across exports removed. The mbox split was **broken on purpose** — the
  blank-line rule removed — and the tests failed. The demo's ingest command that will use it is
  still T7.10.

- [ ] **T7.9 — Unlabelled harvest files** · Lane B · needs T7.3 · *new 28 Sep*
  The harvest schema's `classification` becomes optional. Absent → classified live; present →
  replayed, kept for tests and for re-running a past harvest reproducibly.
  *Done when:* an unlabelled harvest file ingests through the live classifier and a labelled
  one still replays, both tested.

- [ ] **T7.10 — One ingest command** · Lane B · needs T7.7, T7.8, T7.9 · *new 28 Sep*
  `npm run ingest -- [--synthetic] <files or folders>` accepts any mix of harvest JSON, `.mbox`
  and `.eml`, records each event's source, and runs one pipeline pass into the database named
  by `DATABASE_URL` — which is how the three demo modes are chosen. `--synthetic` marks
  authored emails (D24).
  *Done when:* a mixed folder ingests in one run, re-running it creates nothing new, and
  authored emails are tagged synthetic.

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

- [ ] **T8.3 — Real labelled corpus** · All lanes · needs T2.11, T2.12, **B6** · *reinstated and redefined 28 Sep*
  **The protocol (D32):**
  1. **Export.** Each member labels and exports their own application emails and hard
     negatives (B6).
  2. **Inventory.** T2.11 counts what the three exports actually contain. **The held-out size
     is set here, from real numbers** — the working target is ~200, about half positives.
  3. **Composition.** Held-out: real application emails, and real negatives weighted toward
     the hard ones — job-board ads, recruiter marketing, "application" false friends. Tuning:
     the 80 authored fixtures plus ~40 real. Authored emails never enter the headline figure.
  4. **Label** in the T2.11 spreadsheet against the T2.12 guide; **~25 emails labelled by two
     people independently**, and the agreement reported.
  5. **Freeze** the held-out set — before any model sees it.
  6. **Measure** with T7.3 and T2.8; report every figure with its interval (D33).
  Real email content lives **outside the repository**, whatever its visibility. Positives are
  deliberately enriched to about half, and the report says so — on a natural inbox, a
  classifier that answers "no" to everything scores ~98%.
  **Pending team decisions** (labelling guide §7). *Whose mail forms the agreement sample* —
  proposed: the owner draws it with `--sample`, reads it first and deletes any row they would
  not show a teammate. *How three members' held-out sets become one figure* without anyone
  handling another member's mail — proposed: each member scores their own frozen set and the
  harness pools the counts (not built yet).
  *Done when:* the frozen held-out set exists, `npm run accuracy -- --corpus <held-out folder>`
  reports against it with intervals, and the agreement figure is recorded.

- [ ] **T8.4 — README and setup guide** · Lane A · needs T7.6
  Clone to running in under five minutes, with no database server, Google account or API key.
  *Done when:* a teammate follows it on a clean machine and succeeds without asking a question.

- [ ] **T8.5 — Deployment config** · Lane B · needs T7.6
  Dockerfile, Postgres connection, environment documentation, HTTPS. Written and validated,
  not necessarily provisioned.
  *Done when:* the app runs from a container against Postgres with HTTPS enforced.

---

## Backlog and exclusions *(28 September 2026)*

| | Item | Status |
|---|---|---|
| **S1** | "Upcoming jobs to apply for" — a module built from job-board ads | **Stretch goal after the MVP.** Needs a new classification category, table and view, and would persist extracted content from non-application email for the first time — a privacy change to decide deliberately, not drift into. Nothing is built until RQ-01 to RQ-09 are complete. |
| — | Manual "add application" | **Not building.** Adding means confirming an item from the review queue (D31). |
| — | A GradTracker login for the demo | **Not building.** The local demo is operated by the team (D31). |

---

## Critical path

The chain that determines the finish date. Slip here and the deadline moves.

**Current (28 September 2026)** — two chains, one for the demo and one for the evidence:

```
Demo:      B3  → T7.3       → T7.10  → T3.8    → the demo
           key   classifier   ingest   refresh

Evidence:  B6      → T2.11 ✅ → T8.3   → T3.12     → T2.8      → accuracy evidence
           exports   toolkit    labels   prompt v2   benchmark
```

T3.12 needs nothing but code and can land at any point before T2.8's first measurement.

The evidence chain is the longer: it depends on three people's exports and on human
labelling time. That is why the toolkit (T2.11) is step 2 of the build order, ahead of work
that needs nothing but code.

**Original (16 August 2026)** — kept for the record; T0.1 and T7.6 are now deferred:

```
T0.1 → T1.4 → T2.1 → T2.6 → T3.4 → T4.4 → T5.5 → T6.1 → T7.6 → T8.1
OAuth   schema  ports  harness pipeline API   pipeline edit  live   traceability
```

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
