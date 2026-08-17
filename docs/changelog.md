# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- **2026-08-16** — **T2.6** Accuracy harness. `npm run accuracy` scores the corpus and gates on the 95% / 80% thresholds, naming every false negative by fixture id — a percentage says nothing about what to fix. Verified from the command line in both directions: `--invert` exits 1, the normal run exits 0. `--demo` injects a realistic failure pattern (hard negatives naming pipeline companies mistaken for applications, an informal email missed, relative deadlines two days late, a deadline invented from an interview time) to show the report shape. Deadline scoring reports date-correct and exact-time separately, because a 9am deadline predicted as 11:59pm is still a missed assessment. · `packages/server/src/harness/{metrics,report,accuracy}.ts`, `package.json`
- **2026-08-16** — **T2.7** Wilson 95% confidence interval printed beside every accuracy figure. Wilson rather than the normal approximation, which extends above 100% at proportions near 1 — not a possible accuracy. At n=80 the interval spans ±4.6 points, making visible that 96.3% and 91% are not distinguishable by this corpus, which is the argument for T8.3's real labelled emails. · `packages/server/src/harness/metrics.ts`
- **2026-08-16** — 34 harness tests covering the scoring arithmetic against hand-computed values, including an asymmetric case that catches precision and recall being swapped — a swap that would hide exactly the failure SM-2 exists to surface. · `packages/server/src/harness/{metrics,harness}.test.ts`
- **2026-08-16** — **T2.4, T2.5** Fixture corpus complete: 80 labelled fixtures, 55 positive and 25 negative. Positives cover all six stages (applied 13, assessment 15, interview 12, offer 5, rejected 8, withdrawn 2) across four ATS domains plus 8 emails from named humans, with 26 carrying explicit deadlines in eight distinct phrasings. Negatives are 15 hard and 10 easy; 8 of the hard ones name companies with live applications, one is sent from the same `greenhouse.io` domain as genuine updates, and 6 carry deadline language — so neither company name, sender domain nor deadline text is sufficient to classify. 17 composition tests assert this shape rather than assuming it. · `fixtures/emails/**`, `fixtures/expected/**`, `packages/server/src/corpus/corpus.test.ts`
- **2026-08-16** — Three deadline negative controls added to the positives: an applications-close date meant for other applicants, an interview time, and a promise about when the employer will act. All three are deadline-shaped and must not be extracted. · `fixtures/expected/015-*.json`, `034-*.json`, `042-*.json`
- **2026-08-16** — **T2.1** Port interfaces: `GmailClient` and `EmailClassifier`, with typed error classes (`HistoryIdExpiredError`, `GmailRateLimitError`, `GmailAuthRevokedError`, `ClassifierUnavailableError`, `ClassificationInvalidError`) so the sync engine can catch an expired cursor specifically rather than pattern-matching a message. ESLint now blocks vendor SDK imports anywhere in the server outside `adapters/` — verified in both directions. · `packages/server/src/ports/**`, `eslint.config.js`
- **2026-08-16** — **T2.2** Fake adapters. `FakeGmailClient` simulates paging, cursor advance, cursor expiry and mid-batch fetch failure, delivering oldest-first so stage progression applies in order. `FakeEmailClassifier` replays corpus labels and exposes `confidenceFor`/`corrupt` hooks so the accuracy harness itself can be tested at T2.6. Both are forced under `NODE_ENV=test` even when `live` is requested. Corpus loader validates ground truth on load and rejects contradictory labels. · `packages/server/src/adapters/**`, `packages/server/src/corpus/loader.ts`, `packages/shared/src/schema/fixture.ts`
- **2026-08-16** — **T2.3** Version-stamped classification prompt with all six stage definitions, injected date for resolving relative deadlines, and explicit hard-negative categories. Six seed fixtures added, including two hard negatives (a LinkedIn job alert carrying real companies and a deadline, and a "someone at Deloitte viewed your profile" notice naming a company the student *has* applied to). · `packages/server/src/adapters/classifier/prompt.ts`, `fixtures/emails/**`, `fixtures/expected/**`
- **2026-08-16** — **Phase 1 complete.** T1.1–T1.7 done, 127 tests green, typecheck and lint clean, 0 vulnerabilities. · `docs/tasks.md`
- **2026-08-16** — **T1.6** Repository layer with mandatory user scoping. Every method takes a branded `UserId` first, so omitting it is an arity error and passing an unauthenticated string is a type error. `repository.typecheck.ts` asserts this with `@ts-expect-error` — verified in the failing direction, where supplying the argument makes `tsc` fail with `TS2578`. Provenance methods scope through the owning job via a single `assertOwnsJob`, since `job_field_provenance` carries no `user_id` of its own. Identity operations that legitimately run without a user are isolated in their own small repository. 11 isolation tests. · `packages/server/src/db/repository.ts`, `repository.typecheck.ts`, `repository.test.ts`, `client.ts`
- **2026-08-16** — **T1.7** Seed data: 25 applications covering all six stages and all five urgency buckets, 4 detections awaiting review, 125 provenance rows including 5 human-verified. Deadlines are offsets from an injected "today" rather than fixed dates, so bucket coverage cannot rot. 16 tests assert the coverage instead of trusting the list. · `packages/server/src/db/seed.ts`, `seed-cli.ts`, `seed.test.ts`
- **2026-08-16** — `urgencyBucket()` and the branded `UserId` type added to the shared package. The ranking comparator (T3.7) will build on the former rather than duplicating the bucket boundaries. · `packages/shared/src/schema/stage.ts`
- **2026-08-16** — **T1.4** Database schema and migrations. Five tables per implementation.md §4 defined for both dialects, with generated migrations verified against real SQLite (a file on disk) and real Postgres (PGlite, compiled to WASM, so no server is required). `schema.parity.test.ts` compares the two dialect definitions column by column so they cannot drift; `migrate.test.ts` asserts both apply clean from empty, that a second run is a no-op, and that Postgres genuinely rejects a duplicate `(user_id, gmail_message_id)` — the constraint that makes a crashed sync safe to re-read. · `packages/server/src/db/schema.pg.ts`, `schema.sqlite.ts`, `schema.parity.test.ts`, `migrate.ts`, `migrate.test.ts`, `packages/server/migrations/**`, `packages/server/drizzle.config.*.ts`
- **2026-08-16** — **T1.5** Forbidden-column guard: 27 column names across raw content, identity beyond sender domain, and credentials, checked against both dialects. **Verified in the failing direction** — a `subject` column was added temporarily and two independent guards fired before it was reverted. Also asserts positively what the retention boundary permits, so the rule is not later over-applied. · `packages/server/src/db/schema.retention.test.ts`
- **2026-08-16** — **T1.2** Repo scaffold: npm workspaces monorepo with three packages, TypeScript strict mode with project references, Vitest, ESLint flat config, and an `.env.example` that works unedited (both adapters default to `fake`). ESLint carries a stub port-boundary rule blocking `googleapis` and `@anthropic-ai/sdk` imports from the domain layer — the full rule lands with the ports in T2.1. *Written but unverified — Node.js is not installed (blocker B1).* · `package.json`, `tsconfig.base.json`, `tsconfig.json`, `vitest.config.ts`, `eslint.config.js`, `.gitignore`, `.env.example`, `packages/*/package.json`, `packages/*/tsconfig.json`
- **2026-08-16** — **T1.3** Shared Zod schemas — the single source of type truth. `stage.ts` turns decision D10 into code (six-value enum, progression ranks, terminal / always-applies / user-only sets, per-stage staleness thresholds, urgency bucket bounds); `classification.ts`, `job.ts` and `api.ts` cover the classifier contract, job and event shapes, and every API request/response. 20 assertions in `stage.test.ts`. *Written but unverified — blocker B1.* · `packages/shared/src/**`, `packages/server/src/index.ts`, `packages/client/src/index.ts`
- **2026-08-16** — Blockers table added to the task list, distinguishing a task's missing precondition from the task itself: B1 Node.js not installed, B2 no Google Cloud project, B3 no Anthropic key, B4 `docs/` not under version control. · `docs/tasks.md`
- **2026-08-16** — Scaffold conventions recorded: npm workspaces over pnpm/yarn, ESM throughout with `.js` import extensions, TypeScript project references, Node 20 LTS minimum. · `docs/rules.md`
- **2026-08-16** — Documentation Center task (T5.9) added to Phase 5: in-app `/docs` pages for Architecture, Components, Data flow, API and Dependencies, rendered from the markdown in `docs/` so the two cannot drift. New scope, not part of the original MVP definition. · `docs/tasks.md`
- **2026-08-16** — Project rulebook created: ~90 one-line rules across Architecture, Naming Conventions, Design Patterns, Business Logic and Integrations. Established that `rules.md` holds the rule and `decision-record.md` holds the reasoning; on conflict, `rules.md` is correct. · `docs/rules.md`
- **2026-08-16** — Naming conventions defined (previously undocumented): `snake_case` plural tables, `camelCase` API payloads with repository-layer mapping, kebab-case modules, PascalCase components, `NNN-slug.json` fixtures. · `docs/rules.md`
- **2026-08-16** — State management decided: no global store. Server state via the typed API client, everything else component state; a store is added only when two distant components demonstrably need the same data. · `docs/rules.md`
- **2026-08-16** — Implementation task list created: 54 tasks across 9 phases with owner lanes (Domain / Quality / Interface), dependencies, and per-task completion criteria. Includes a new Phase 0 (week 1) for Google Cloud and OAuth setup, created to de-risk the schedule. · `docs/tasks.md`
- **2026-08-16** — Four product requirement documents created. · `docs/masterplan.md`, `docs/implementation.md`, `docs/design.md`, `docs/app-flow.md`
  - `masterplan.md` — vision, target users, value proposition, nine success metrics each with a named owning test, product principles, scope boundaries, risks.
  - `implementation.md` — architecture, repository layout, column-level schema, port interfaces, classification pipeline, stage rules, job matching, sync engine, API surface, security implementation, accuracy harness, phased plan.
  - `design.md` — brand foundation, tokens, component inventory, the AI-vs-human visual contract, iconography, content voice, accessibility, responsive behaviour.
  - `app-flow.md` — screen map, routes, four state machines, six user journeys, per-screen specs, empty states, 17 error states, 22 edge cases.
- **2026-08-16** — Initial architecture decision record created, covering decisions D1–D15 with options rejected and reasoning. · `docs/decision-record.md`
  - Stack: TypeScript end-to-end (React + Vite client, Node + Express server), diverging from the submitted proposal's Node-or-Python option.
  - Database: Postgres in production, SQLite in dev and test via Drizzle, diverging from the submitted MySQL.
  - Build against mocked Gmail and a fixture-backed classifier first; live adapters behind the same ports.
  - Multi-account with row-level scoping, no admin layer. Marketing site out of scope. Confidence-gated review queue in the MVP.

### Changed

- **2026-08-16** — T1.1–T1.3 committed as `0056599` on branch `setup/scaffold-and-shared-schemas` (30 files). Added `.gitattributes` normalising line endings to LF so a team on mixed platforms does not generate phantom whole-file diffs. · `.gitattributes`
- **2026-08-16** — Blocker B4 withdrawn as incorrect. The claim that `docs/` was not under version control was made without checking; all eight files were already tracked and committed in `b6d846f`, and the repository had three commits rather than one. · `docs/tasks.md`
- **2026-08-16** — **T1.2, T1.3 verified and marked done.** Blocker B1 cleared: Node v24.19.0 / npm 11.17.0 installed. `npm.cmd install` → 163 packages, 0 vulnerabilities; `npm.cmd test` → 18 passed; `typecheck` and `lint` both clean, with no config edits needed after install. · `docs/tasks.md`
- **2026-08-16** — Vitest upgraded from `^2.1.4` to `^3.2.4`. Vitest 2 pulled a vite/esbuild chain carrying 5 advisories including one critical; Vitest 3 audits clean. Dev-only dependencies, but a scaffold should not ship with a critical advisory. · `package.json`
- **2026-08-16** — Windows shell conventions recorded: documentation commands must be PowerShell-safe (no `&&`), and `npm.cmd` is used instead of `npm` because the `npm.ps1` shim is blocked by the default execution policy — no `Set-ExecutionPolicy` change is ever required. Zero npm audit vulnerabilities set as the standing baseline. · `docs/rules.md`
- **2026-08-16** — Documentation maintenance rules added: documentation is updated per task rather than batched, and the in-app Documentation Center renders `docs/` rather than duplicating it. · `docs/rules.md`
- **2026-08-16** — Decision record raised to revision 2: resolved D10, added D16–D21, added a section recording six specification defects, added the measured cost model and the statistical-power finding. · `docs/decision-record.md`
  - **D10 resolved** — six computed stages, not seven literal ones. "Deadline Approaching" becomes `DeadlinePill` coloured from `daysLeft`; "Follow-up Required" becomes a computed staleness flag. Unblocked the database schema.
  - **D16** — classifier is `claude-haiku-4-5`, escalating to `claude-sonnet-5` below 0.6 confidence. ~$4.30 per 2,000-email scan, ~$65 across development.
  - **D17** — 80 synthetic fixtures now, ~300 real hand-labelled emails during the semester; harness reports a Wilson 95% confidence interval alongside every figure.
  - **D18** — live-adapter spike moved to week 1 from week 9.
  - **D19** — structured output via `output_config.format` with `zodOutputFormat`, superseding the tool-use schema approach.
  - **D20** — Batches API for initial inbox scans, halving the largest single cost.
  - **D21** — three parallel owner lanes: Domain, Quality, Interface.
- **2026-08-16** — T8.3 (real labelled email corpus) rescheduled to start week 3 rather than week 11 — it is the longest-lead item in the project and the only one that makes the accuracy claim defensible. · `docs/tasks.md`

### Fixed

- **2026-08-16** — **T1.1** Defects C1, C2, C3 and C5 applied to the specification documents, closing the gap between what was decided and what the documents said. · `docs/implementation.md`, `docs/app-flow.md`
  - **C5** — `implementation.md §7.5` no longer describes D10 as "the one open decision"; it records the six-stage resolution and why computing beats storing.
  - **C1** — `implementation.md §5.2` marks `reasoning` optional and dev-only, with an explicit retention rule: a log line containing email content is the same defect as a database column containing it.
  - **C3** — `implementation.md §7.4` replaces the tool-use schema with `output_config.format` + `zodOutputFormat`, and notes which Zod constraints the API enforces versus which the SDK validates client-side. The C4 no-prompt-caching note was folded in at the same site.
  - **C2** — `app-flow.md §8` now has the server compute `daysLeft` from the client's IANA timezone and return it per job; the client renders it and never recomputes. One clock governs ranking and display.
- **2026-08-16** — Six specification defects found reviewing the four documents against each other, each assigned to the task that fixes it. · `docs/decision-record.md`, `docs/tasks.md`
  - **C2** — `implementation.md` and `app-flow.md` disagreed on which clock computes deadline urgency; a row could display "2 days left" while ranked in the 3–7 day bucket. Resolved: the client sends its IANA timezone and the server ranks with it.
  - **C3** — JSON output was specified via tool-use schema rather than `output_config.format`.
  - **C4** — the cost model wrongly assumed prompt caching applies; Haiku 4.5's minimum cacheable prefix is 4,096 tokens, far above a classification prompt. Batches API adopted as the offset.
  - **C5** — D10 was recorded as open in all four documents after being resolved.

### Removed

- (none yet)

### Security

- **2026-08-16** — Defect C1 given a structural fix rather than a promise. `emailRef()` reduces an email to message id, thread id, sender *domain* and timestamp — the only shape permitted into a log, error or metric — so code outside the classifier adapter never holds subject or body to leak. `scrubForLog()` backstops objects of unknown shape. A log line containing a subject is the same SM-6 violation as a database column containing one, and "we'll be careful what we log" is not a control. · `packages/server/src/ports/redact.ts`
- **2026-08-16** — SM-6 and SM-5 made structural rather than asserted. The retention boundary and "zero credentials stored" are now properties of the schema, checked on every test run: a developer who adds a `subject` column to make debugging easier breaks CI whether or not anything writes to it yet. Confirmed to fail when violated. · `packages/server/src/db/schema.retention.test.ts`
- **2026-08-16** — npm `overrides` pins esbuild `^0.25` under `@esbuild-kit/core-utils`, clearing four moderate advisories introduced by drizzle-kit's deprecated transitive dependency. npm's suggested remedy was a major *downgrade* to drizzle-kit 0.18; the override keeps the current version and audits clean. The advisory covers esbuild's dev server, which drizzle-kit never starts — it uses esbuild only to transpile its config file. · `package.json`
- **2026-08-16** — **C1** — the classifier's declared `reasoning` field, described as "logged for debugging, never persisted", would have leaked email content into persisted logs — violating the no-raw-content criterion through the log file rather than the database. Resolved: development-only, scrubbed, never written to a persisted log. · `docs/decision-record.md`, `docs/tasks.md`
- **2026-08-16** — **C6** — recorded that `gmail.readonly` is a Google *restricted* scope: public launch would require a paid third-party security assessment. Not a blocker (test-user mode permits 100 users) but it bounds the product's future distribution. · `docs/decision-record.md`

---

**Format for new entries:**

- **Added** for new features
- **Changed** for changes in existing functionality
- **Fixed** for bug fixes
- **Removed** for removed features
- **Security** for security improvements

**Rules:**

- Add a new entry after every completed task or group of related tasks
- Include the date, a short description, and files affected
- This is a historical log — never edit or delete past entries

---

*No application code has been written yet. Implementation begins at task T0.1.*
