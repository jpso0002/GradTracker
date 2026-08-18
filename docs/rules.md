# Project Rules & Decisions

This file is the single source of truth for all project-wide decisions. Update it immediately when any decision is made.

## How to use this file

- Every architecture choice, naming convention, or design pattern we agree on goes here
- Every business rule or constraint gets documented here
- If a decision overrides a previous one, update the entry (don't duplicate)
- Group entries by category for easy scanning

> **Relationship to the other docs.** This file holds *the rule*.
> [decision-record.md](decision-record.md) holds *why* — the options considered and
> rejected, for the FIT3163 review. If the two ever disagree, this file is correct and the
> decision record needs updating.

## Categories to track:

- **Architecture** — Tech stack choices, folder structure, state management approach
- **Naming Conventions** — Component names, file names, database columns, API routes
- **Design Patterns** — Reusable patterns, component composition rules, styling approach
- **Business Logic** — Validation rules, access control, feature flags, pricing logic
- **Integrations** — Third-party services, API keys needed, webhook configurations

Keep entries concise. One line per decision when possible.

---

## Architecture

- **Stack is TypeScript end-to-end** — React 18 + Vite client, Node 20 + Express server.
- **Postgres in production, SQLite in dev and test**, one Drizzle schema driving both.
- **`npm install && npm test` must pass on a clean clone** — no database server, no Google account, no API key. This constraint outranks convenience.
- **Monorepo:** `packages/shared` (Zod schemas + types), `packages/server`, `packages/client`, `fixtures/`.
- **npm workspaces**, not pnpm or yarn — boring and preinstalled with Node (the brief prefers well-documented dependencies over clever ones).
- **ESM throughout** (`"type": "module"`), `moduleResolution: NodeNext`. Relative imports carry the `.js` extension even in `.ts` source.
- **TypeScript project references** with `composite: true`; build with `tsc --build`. Strict mode plus `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`.
- **Node 20 LTS minimum**, enforced by `engines` in the root `package.json`.
- **Commands in documentation are PowerShell-safe.** The development machine is Windows, and Windows PowerShell 5.1 rejects `&&` as a statement separator. Write each command on its own line, or chain with `;` / `if ($?) { … }` — never `cmd-a && cmd-b`.
- **Use `npm.cmd`, not `npm`, in PowerShell.** The `npm.ps1` shim is blocked by the default execution policy. `npm.cmd` bypasses it and needs no security setting changed — never instruct anyone to run `Set-ExecutionPolicy` for this.
- **Zero npm audit vulnerabilities is the baseline.** Dev-only advisories count: the scaffold shipped clean on Vitest 3 rather than carrying Vitest 2's critical advisory. Re-check after any dependency change.
- **`packages/shared` is the only place types are defined.** Client and server import them; neither redeclares them.
- **Two ports, each with a fake:** `GmailClient` and `EmailClassifier`. Fakes are the default in test and demo mode.
- **No vendor SDK may be imported anywhere in the server except `adapters/`** — enforced by ESLint `no-restricted-imports`, verified in both directions. If domain, route or db code could reach the Gmail or Anthropic SDK directly, swapping in the fakes would stop exercising the real path and every offline test would become a lie.
- **Errors crossing a port are typed classes, never message strings.** `HistoryIdExpiredError` must be catchable specifically so sync can fall back to a rescan; pattern-matching a message is not a control.
- **Anything logged about an email is an `EmailRef`** — message id, thread id, sender *domain*, timestamp. Never subject, body or full address. Callers outside `adapters/classifier/` never hold content to leak; `scrubForLog()` is the backstop, not the mechanism.
- **A fake-classifier score is labelled a self-test, prominently.** The fake replays corpus labels, so it always scores 100%. An unlabelled perfect score gets screenshotted and presented as a model measurement.
- **Accuracy figures are never printed without their confidence interval.** Wilson, not the normal approximation — at proportions near 1 the textbook interval exceeds 100%.
- **A threshold with a zero denominator fails, it does not pass vacuously.** 0/0 is not 100%; silently passing would let the fixtures backing a criterion be deleted while the gate still reported success.
- **Failures are named by fixture id, never summarised as a percentage.** A rate tells you the size of a problem; ids tell you what to fix.
- **Corpus realism outranks corpus targets.** Deadlines are labelled only where an email would genuinely carry one — 26 deadline-bearing rather than a padded 30. Inventing deadlines in acknowledgements to hit a number would make the corpus less representative, and the number it produced would mean less.
- **Hard negatives must defeat the shortcuts.** A negative that names no pipeline company, arrives from an unused domain and carries no deadline text teaches nothing. At least: some naming live-application companies, one from a shared ATS domain, several carrying deadline language.
- **Fixture ground truth is validated on load, not trusted.** A mislabelled fixture corrupts every accuracy figure derived from it and the result still looks plausible, so the loader refuses to load it.
- **Under `NODE_ENV=test` the adapters are forced to fake**, even if `live` is requested. A test that can reach a live API might succeed — spending money and coupling CI to the network.
- **No global state library.** Server state lives in the typed API client + component state; a store gets added only when two distant components demonstrably need the same data.
- **The design system is a read-only dependency.** `GradTracker Design System/` is consumed, never edited and never re-implemented.
- **Adapters default to `fake`** — `GMAIL_ADAPTER` and `CLASSIFIER_ADAPTER` must be explicitly set to `live`.
- **Commits are made by the team, not by Claude** (set 16 August 2026). Claude leaves the working tree ready and reports what changed; staging, committing and branching are manual. Documentation updates still happen per task, so a commit is always a coherent unit.
- **Documentation is maintained per task, not in a batch.** On completing any task: log it in [changelog.md](changelog.md), record any decision here, tick it in [tasks.md](tasks.md), and update the in-app `/docs` pages if architecture, components, data flow, APIs or dependencies changed.
- **The changelog follows Keep a Changelog** — `[Unreleased]` grouped by Added / Changed / Fixed / Removed / Security. Every entry carries a date, a short description, and the files affected. Past entries are appended to, never edited or deleted.
- **The in-app Documentation Center renders the markdown in `docs/`** rather than duplicating it, so the two cannot drift (task T5.9).

## Naming Conventions

- **DB tables:** `snake_case`, plural — `users`, `jobs`, `email_events`, `job_field_provenance`, `sync_state`.
- **DB columns:** `snake_case`. Timestamps end `_at`; foreign keys end `_id`; booleans start `is_` or `has_`.
- **Enum values:** lowercase single words — `applied`, `assessment`, `interview`, `offer`, `rejected`, `withdrawn`.
- **API routes:** `/api/<plural-noun>`, kebab-case, no verbs — the HTTP method is the verb. Exception: `/api/jobs/:id/withdraw`, where the action is not a CRUD operation.
- **API payloads:** `camelCase` on the wire; the repository layer maps to `snake_case` columns.
- **Files:** `kebab-case.ts` for modules (`gmail-client.ts`, `token-cipher.ts`).
- **React components:** `PascalCase.tsx`, one component per file, filename matches the export.
- **Views:** `<Name>View.tsx` — `PipelineView`, `ReviewView`, `SettingsView`, `ConnectView`. `DetailPanel` is the one exception (it is a panel, not a route).
- **Tests:** `<subject>.test.ts`, beside the module it tests.
- **Fixtures:** `NNN-slug.json`, zero-padded, matching filenames in `fixtures/emails/` and `fixtures/expected/`.
- **Env vars:** `SCREAMING_SNAKE_CASE`.
- **Never use "smart", "AI-powered", or "magic" in identifiers or UI copy** — describe what the code does.

## Design Patterns

- **Stage colour is reachable only through `StageBadge`.** Never read a `--stage-*` token directly; never colour anything else with a stage colour.
- **`DeadlinePill` receives `daysLeft`, never a colour.** Urgency is the component's judgement so it cannot disagree between two places in the UI.
- **`ConfidenceMeter` appears on AI-sourced fields only.** It disappears the moment a field becomes human-verified.
- **A field shows a confidence meter or an "Edited" tag — never both, never neither.**
- **No hardcoded colours, sizes, radii or durations.** Every value comes from a CSS custom property; a hex code in application code is a defect.
- **Buttons are always pill-shaped**, minimum 8px 16px. Inputs 6px radius, cards 12px.
- **Hover tints, press darkens. Never scale, shrink, or bounce anything.**
- **Sentence case everywhere** — buttons, headings, table headers. All-caps only in the 10px eyebrow tier.
- **No emoji.** Not in UI, not in copy, not in empty states.
- **Repository methods take `userId` as their first argument** — omitting it must be a compile error.
- **`UserId` is a branded type.** `asUserId()` is the only widening point and is called only where an id has genuinely been authenticated — session middleware, seeds, tests. A plain string cannot be passed where scoping is required.
- **Type-level guarantees are asserted in `*.typecheck.ts`, never in `*.test.ts`.** Test files are excluded from the tsconfig, so a `@ts-expect-error` placed in one is never checked. Files named `*.typecheck.ts` are compiled, contain only `declare`d bindings, and emit no runtime code.
- **`createIdentityRepository` holds the only operations that run without a `UserId`**, because they are what establishes one. Keep it minimal so it stays auditable.
- **Tables without a `user_id` column scope through their owning row.** `job_field_provenance` goes through `assertOwnsJob`, implemented once — this is where the scoping guarantee is easiest to lose silently.
- **Seed deadlines are offsets from an injected "today", never fixed dates.** Hardcoded dates stop covering the overdue and imminent buckets within a week of being written.
- **The schema is defined once per dialect and kept in lockstep by a test.** Drizzle requires separate `pg-core` and `sqlite-core` definitions; `schema.parity.test.ts` compares column names, nullability, primary keys, declared indexes and uniqueness. Two hand-maintained copies drift silently, so drift is a CI failure.
- **Migrations are generated by `drizzle-kit`, never hand-written**, and live at `packages/server/migrations/` — the package root, not under `src/`. They are data, and `tsc` does not copy `.sql` into `dist/`, so a folder inside `src/` works for tests and silently breaks the built script.
- **Dialect mappings:** `uuid` → `text`, `timestamptz` → `integer` epoch-ms in SQLite. Drizzle maps both pairs to the same JS types (`string`, `Date`), so application code never branches on dialect.
- **Refresh-token columns are `text` holding base64, not `bytea`/`blob`** — a deliberate deviation from implementation.md §4.1. AES-256-GCM output encodes losslessly, the security property is unchanged, and identical column types in both dialects are what let the parity test compare them directly.
- **Postgres is verified in-process with PGlite**, real Postgres compiled to WASM, so "runs on both engines" is a CI assertion rather than something someone once did on their laptop. The `pg` server driver arrives with deployment (T8.5).
- **Role similarity is measured on the distinguishing part of a title, not the raw string.** `normaliseRole()` strips `graduate`, `program`, `intern` and intake years before the Dice comparison. On raw titles "Graduate Engineer" and "Graduate Trader" score 0.60 — over threshold — and two unrelated applications at one employer would merge. Deviation from implementation.md §7.6, which specifies raw bigrams.
- **A null sender domain never matches another null.** "Unknown" is not an identity; treating it as one merges unrelated applications.
- **Over-merging beats duplicating, always.** A duplicate is visible and correctable; a wrong merge silently destroys an application's history and surfaces as a missed deadline. Every ambiguous case creates a new job.
- **Correcting a company recomputes `companyNormalised`** — otherwise the corrected job stops matching its own future emails.
- **Stage decisions return a typed reason, not a boolean**, so the timeline can explain why an email changed nothing.
- **Ranking, staleness and urgency are pure functions** with no I/O, so they are exhaustively testable.
- **Mutations are optimistic with rollback** and a `Toast` on success.
- **Colour is never the only signal** — stage badges carry text, deadline pills carry dates, provenance carries a tag.
- **Empty states admit the gap** rather than filling space. Blank means blank.
- **No fake progress.** If duration is unknown, show a real count of work done.

### API routes
- **A record belonging to another user returns 404, never 403.** A 403 confirms the record exists, which is itself a disclosure. "Not yours", "already handled" and "never existed" must be indistinguishable to the caller.
- **There is no `?sort=`.** Ranking is the product's single opinion about what matters today. A client that can re-sort by company name has rebuilt the spreadsheet GradTracker exists to replace.
- **Validation errors return the offending `field` alongside `error`**, so an inline editor can attach the message to the input rather than showing a banner.
- **Unknown body fields are stripped, not rejected and not persisted.** A client must not be able to smuggle `status` or `confidence` into a `PATCH`.
- **An empty patch is a 400, not a 200 no-op.** Silently accepting a request that changes nothing hides a broken client.
- **Every confirmed field is written as `human`, not `ai`.** Confirming is the moment a machine guess becomes a human fact; a later sync must not overwrite what the student looked at and accepted.
- **A route with nothing behind it returns 501 with an explanation, never a faked success.** `POST /api/sync` refuses rather than returning a 202 that starts nothing.
- **Timezone comes from the `x-timezone` request header and falls back on anything unparseable.** A bad value from a client must not crash ranking (defect C2).
- **`createApp` takes an explicit `userId` for tests.** Depending on which row `limit 1` returns is a test that passes for the wrong reason.
- **Confirming an unedited review card is a 200, not a 400.** "Yes, as shown" is the common case; requiring the student to retype what the classifier already read is the friction the product exists to remove.
- **A correction beats a detected value; a detected value beats nothing.** Both are better than asking.
- **Anything a review card displays must be stored on the event, not the job.** A review item has no job yet — that is the definition. An extraction that lives only on `jobs` cannot be shown before the student confirms.
- **Extracted fields are not raw content.** Company, role, stage, deadline and next action may be persisted per-email; subject, body and sender address may not. The line is "did the model derive this", not "did it come from the email".
- **`demoContext` is the only unauthenticated seam, and it is loud about it:** it throws under `NODE_ENV=production` and refuses to start without `ALLOW_UNAUTHENTICATED=1`. Restoring real auth replaces that one function and nothing else.

### Client

- **The design system is vendored, never edited.** `scripts/sync-ds.mjs` copies it in; `ds.sync.test.ts` fails on any byte of drift. If a component needs changing, change it at the source and re-sync — a local edit is a silent fork.
- **Everything imports from `src/ds`, never from `src/ds/vendor` directly.** One place to see what the app uses, one place to shim, one path to change if the system ever ships as a package.
- **No hardcoded colour in `packages/client`** — no hex, no `rgb()`, no `hsl()`, no named colours. Enforced by `no-hardcoded-colour.test.ts`, which also asserts it found source to check so it cannot pass vacuously.
- **The app sets `data-theme` and picks no colours.** The design system defines both palettes; choosing one is the app's whole job.
- **The client never re-sorts the pipeline.** Order is the server's single opinion about what matters today. Filters are sent to the server, which re-ranks. There is no `?sort=` and no client-side comparator.
- **`format.ts` does no date arithmetic.** `daysLeft` arrives on the payload, computed server-side from the `x-timezone` header. A client that recomputes it can disagree with the rank it was given — that is defect C2 exactly.
- **A count renders as `—` until it is known, never as `0`.** "0 due this week" is a claim; "not loaded yet" is not.
- **A field shows a confidence meter, an "Edited" tag, or neither — never two.** Neither is correct when the field has no value: a meter beside "Nothing outstanding" claims confidence in an absence.
- **"Could not reach the server" and "the server said no" are different states.** `NetworkError` is a separate class from `ApiError` and reaches a different surface.
- **Loading states have the shape of the thing loading.** Rows for a list, not a spinner.
- **A surface with no design says so.** Blank means blank; a plausible placeholder reads as a broken feature rather than an unbuilt one.
- **Icons are bundled, not fetched.** A product with an offline banner must not need the network to draw it. `icons.test.ts` proves the bundled subset covers every name referenced in source.
- **Responses are parsed, not cast.** A `fetch` returning something unexpected must fail next to the request, not three components deep.

## Business Logic

### Stages and progression
- **Six stages only:** `applied` · `assessment` · `interview` · `offer` · `rejected` · `withdrawn`.
- **"Deadline Approaching" and "Follow-up Required" are computed, never stored** — they are properties of today's date, not of an email.
- **Stage advances forward only** — a new stage applies only if its rank exceeds the current rank.
- **`rejected` and `offer` may arrive from any stage** and always apply.
- **`withdrawn` is never AI-assigned.** User action only.
- **A stage with `human` provenance is frozen** — the pipeline never changes it again.

### Provenance and correction
- **A field with `source = 'human'` is never written by the classification pipeline.** Enforced in the repository write path, inside the transaction.
- **Provenance never downgrades.** There is no `human → ai` transition.
- **Human-verified company and role become the job-matching key**, so corrections route future emails to the corrected job.
- **All five extractable fields are editable:** company, role, stage, deadline, next action.

### Classification and confidence
- **Escalate to Sonnet 5 below 0.6 confidence.** Queue for review below `users.review_threshold` (default 0.75). `>=` accepts at the boundary.
- **Never filter on a provider domain.** Google, Microsoft and Amazon are mail providers *and* major graduate employers. A rule matching `google.com` dropped genuine `careers-noreply@google.com` application emails, and the loss was invisible in accuracy figures because a filtered email is never scored. Filter on specific bounce addresses only.
- **The retention boundary is a type, not a discipline.** `classifyOne()` returns a `ClassifiedEmail` with no subject, body or full address, so downstream code cannot persist content it never receives.
- **Escalation is composition, not a branch.** `EscalatingClassifier` satisfies the `EmailClassifier` port, so the pipeline is unaware of it and the harness scores the pair as one model. An escalated answer replaces the primary — never merges with it.
- **`daysUntil` counts calendar days in the student's timezone, never elapsed time.** At 11pm Sunday, a 9am Monday deadline is 0.4 elapsed days away and *tomorrow*.
- **The pre-filter may never make a classification judgement** — it skips only self-sent mail and calendar system notifications. When in doubt, the email goes to the model.
- **False negatives are the costly failure** and are counted and named explicitly in every harness run.
- **Threshold changes apply to future syncs only.** Dismissed items stay dismissed.

### Ranking
- **Lexicographic:** urgency bucket → stage rank descending → `last_event_at` ascending → company A–Z.
- **Urgency buckets:** overdue = 0, ≤2d = 1, 3–7d = 2, 8–14d = 3, none or >14d = 4.
- **Follow-up-required jobs are capped at bucket 3** so staleness cannot hide beneath far-future deadlines.
- **Staleness thresholds by stage:** `applied` 14 days, `assessment` 5, `interview` 7, `offer` 3.
- **Ranking is not user-overridable.** Filters re-filter but never re-sort — a user who can sort by company name has rebuilt their spreadsheet.
- **The server ranks using the client's IANA timezone.** One clock governs both ranking and display.

### Data and retention
- **No raw email content is ever persisted** — no subject, body, snippet, or full sender address, in the database or in any log.
- **Forbidden columns are enforced by a test** that fails CI if one is added.
- **The email body exists only inside `classifyOne()`**, which returns a body-free result.
- **Initial scan is bounded** to the most recent 2,000 messages or 180 days, whichever is smaller.
- **`(user_id, gmail_message_id)` is unique** — re-processing an email is always a safe no-op.
- **`history_id` advances only inside the transaction that commits the batch.** A crash re-reads; it never skips.

### Access control and validation
- **Every query is scoped to `req.user.id`.** No route can return another user's data.
- **Cross-user access returns 404, not 403** — a 403 confirms the record exists.
- **Every request body is Zod-validated at the route boundary.** Unknown fields are stripped, never persisted.
- **Field limits:** company and role 1–160 chars trimmed; next action ≤120 chars; deadline a valid ISO date within ±2 years; stage one of six.
- **Sessions:** `httpOnly`, `secure` in production, `sameSite=lax`, signed, 7-day rolling, destroyed on logout.
- **No password column exists anywhere in the schema.** Zero credentials stored is a schema property, not a policy.
- **Disconnecting Gmail deletes the encrypted token and sync state but keeps pipeline data** — the corrections are the student's work. The dialog says so.

### Out of scope (do not build)
- Email sending or replying · calendar integration · admin roles or permissions · analytics for early careers services · marketing site · non-Gmail providers · CV or document storage.

## Integrations

### Google / Gmail
- **OAuth 2.0 with PKCE**, scopes `openid email gmail.readonly`. Read-only — the app is technically incapable of sending.
- **`state` is verified on callback**; mismatch rejects with no session issued.
- **Refresh tokens are AES-256-GCM encrypted at rest** — ciphertext, IV and auth tag in separate columns. Plaintext never touches a log or a response body.
- **Test-user mode only.** `gmail.readonly` is a Google *restricted* scope; public launch would require a paid third-party security assessment. Cap is 100 test users.
- **Rate limits:** token-bucket at 5 req/s, exponential backoff with jitter on 429 and `rateLimitExceeded`, bounded full rescan on an expired `historyId`.

### Anthropic / Claude
- **`claude-haiku-4-5` is the default classifier**, escalating to `claude-sonnet-5` below 0.6 confidence.
- **Structured output via `output_config.format`** with `zodOutputFormat(ClassificationSchema)` — not a tool-use schema.
- **Initial inbox scans run through the Batches API** (50% cheaper, not latency-sensitive). Incremental syncs stay synchronous.
- **Prompt caching does not apply** to the classifier path — Haiku 4.5's minimum cacheable prefix is 4,096 tokens, far above a classification prompt.
- **The prompt is version-stamped**, and the harness reports which prompt version produced a given accuracy figure.
- **Cost baseline:** ~$4.30 per 2,000-email scan on Haiku 4.5 (~$2.15 batched); ~$65 across development.

### Environment variables
| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | Postgres URL, or `file:./dev.db` |
| `SESSION_SECRET` | yes | Session signing |
| `TOKEN_ENCRYPTION_KEY` | yes | 32 bytes base64, AES-256-GCM |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | live only | OAuth |
| `ANTHROPIC_API_KEY` | live only | Classification |
| `GMAIL_ADAPTER` / `CLASSIFIER_ADAPTER` | no | `live` \| `fake` (default `fake`) |
| `NODE_ENV` | yes | `production` enables HTTPS enforcement and HSTS |

- **No webhooks.** Sync is user-triggered; Gmail push notifications are not used.
- **Secrets are never logged**, and CORS is restricted to the client origin.

---

*Last updated: 16 August 2026 · Reasoning and rejected options: [decision-record.md](decision-record.md)*

## Harvest

- **Harvest input files live outside the repository.** They contain email subjects and bodies; only extracted fields reach the database. The file is a transient input, never a committed artefact.
- **The harvest runs the real `processEmail` pipeline**, not a shortcut importer — matching, stage progression, provenance and the retention boundary must all be exercised, or the demo proves nothing about the product.
- **`jpso0002@student.monash.edu` is the recruitment mailbox.** `jiddan2016@gmail.com` carries grad-recruitment *marketing* only and contains no application emails.
