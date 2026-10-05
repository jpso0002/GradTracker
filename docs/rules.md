# Project Rules & Decisions

This file is the single source of truth for all project-wide decisions. Update it immediately when any decision is made.

## How to use this file

- Every architecture choice, naming convention, or design pattern we agree on goes here
- Every business rule or constraint gets documented here
- If a decision overrides a previous one, update the entry (don't duplicate)
- Group entries by category for easy scanning

> **Relationship to the other docs.** This file holds *the rule*.
> [decision-record.md](decision-record.md) holds *why* — the options considered and
> rejected, for the unit's review. If the two ever disagree, this file is correct and the
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
- **An npm script that takes arguments starts with `node`; a build step goes in its `pre` script.** On Windows, npm escapes `--` arguments twice when a script begins with a batch file such as `npm.cmd`, so a path with a space arrived with literal carets (C22). A test guards `label` and `accuracy`.
- **Every package the code imports is declared in that package's `package.json`,** even when another dependency already installs it — a transitive copy can change or vanish with that dependency's next release.
- **Zero npm audit vulnerabilities is the baseline.** Dev-only advisories count: the scaffold shipped clean on Vitest 3 rather than carrying Vitest 2's critical advisory. Re-check after any dependency change.
- **Audit from the repository root.** A workspace-scoped audit reported 0 vulnerabilities while the root audit did not (28 September 2026).
- **An override pins a transitive dependency under the package that needs it** (`exceljs` → `uuid`), never globally — a global override did not reach the nested copy.
- **`packages/shared` is the only place types are defined.** Client and server import them; neither redeclares them.
- **Two ports, each with a fake:** `GmailClient` and `EmailClassifier`. Fakes are the default in test and demo mode.
- **No vendor SDK may be imported anywhere in the server except `adapters/`** — enforced by ESLint `no-restricted-imports`, verified in both directions. If domain, route or db code could reach the Gmail or Anthropic SDK directly, swapping in the fakes would stop exercising the real path and every offline test would become a lie.
- **Errors crossing a port are typed classes, never message strings.** `HistoryIdExpiredError` must be catchable specifically so sync can fall back to a rescan; pattern-matching a message is not a control.
- **Anything logged about an email is an `EmailRef`** — message id, thread id, sender *domain*, timestamp. Never subject, body or full address. Callers outside `adapters/classifier/` never hold content to leak; `scrubForLog()` is the backstop, not the mechanism.
- **A fake-classifier score is labelled a self-test, prominently.** The fake replays corpus labels, so it always scores 100%. An unlabelled perfect score gets screenshotted and presented as a model measurement.
- **Accuracy figures are never printed without their confidence interval.** Wilson, not the normal approximation — at proportions near 1 the textbook interval exceeds 100%.
- **A threshold with a zero denominator fails, it does not pass vacuously.** 0/0 is not 100%; silently passing would let the fixtures backing a criterion be deleted while the gate still reported success.
- **Failures are named by fixture id, never summarised as a percentage.** A rate tells you the size of a problem; ids tell you what to fix.
- **Corpus realism outranks corpus targets.** Deadlines are labelled only where an email would genuinely carry one — 27 deadline-bearing (26 until 027's "by Friday" was resolved, C19) rather than a padded 30. Inventing deadlines in acknowledgements to hit a number would make the corpus less representative, and the number it produced would mean less.
- **Hard negatives must defeat the shortcuts.** A negative that names no pipeline company, arrives from an unused domain and carries no deadline text teaches nothing. At least: some naming live-application companies, one from a shared ATS domain, several carrying deadline language.
- **Fixture ground truth is validated on load, not trusted.** A mislabelled fixture corrupts every accuracy figure derived from it and the result still looks plausible, so the loader refuses to load it.
- **A defect found while testing and scheduled rather than fixed is pinned by an `it.fails` test** naming its finding and fixing task. It passes while the defect exists and fails the moment the defect is fixed — the prompt to turn it into an ordinary test, which is part of the fixing task's done-when (C18, T3.10). Check once, by running it as a plain test, that it fails on its assertion and not on a setup error.
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
- **Type-level guarantees are asserted in `*.typecheck.ts`, never in `*.test.ts`.** Test files are excluded from both packages' tsconfigs (the client's since 28 September 2026), so a `@ts-expect-error` placed in one is never checked. Files named `*.typecheck.ts` are compiled, contain only `declare`d bindings, and emit no runtime code.
- **`createIdentityRepository` holds the only operations that run without a `UserId`**, because they are what establishes one. Keep it minimal so it stays auditable.
- **Tables without a `user_id` column scope through their owning row.** `job_field_provenance` goes through `assertOwnsJob`, implemented once — this is where the scoping guarantee is easiest to lose silently.
- **A job's status is derived from its stage, in the repository, and nowhere else.** Terminal stages are archived; every other stage is active. `JobPatch` has no `status` field, and a status passed by an untyped caller is discarded. While the rule lived at call sites it was written four times and missing twice (defect C11).
- **An invariant that several code paths must uphold belongs at the one point they all share**, not repeated at each. A copy that is missing fails silently.
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
- **A mutation shows its result once the server has agreed, with a `Toast` on success** *(revised 5 October 2026, T6.1)*. It was "optimistic with rollback" while editing was per-field. Panel Save checks for a stale edit before it writes, so it cannot show a value before knowing whether to warn; and a review card that left before the server agreed would have to come back, moving focus twice. The wait is one round trip, and the button says so meanwhile.
- **Colour is never the only signal** — stage badges carry text, deadline pills carry dates, provenance carries a tag.
- **Empty states admit the gap** rather than filling space. Blank means blank.
- **No fake progress.** If duration is unknown, show a real count of work done.

### API routes
- **A record belonging to another user returns 404, never 403.** A 403 confirms the record exists, which is itself a disclosure. "Not yours", "already handled" and "never existed" must be indistinguishable to the caller.
- **There is no `?sort=`.** Ranking is the product's single opinion about what matters today. A client that can re-sort by company name has rebuilt the spreadsheet GradTracker exists to replace.
- **Validation errors return the offending `field` alongside `error`**, so an inline editor can attach the message to the input rather than showing a banner.
- **Validation messages are written for the student.** The editors show them beneath the field as they are, so the shared schema states them as sentences — "Company cannot be empty." — never Zod's defaults.
- **A request the body parser refuses is the client's error, in fixed words**: 413 "Request body too large.", 400 "Malformed request." — never a 500, and never the parser's own message.
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
- **Panel Save sends only the fields actually changed.** Sending all five would mark every field human-edited and lock it against the classifier, though the student changed nothing.
- **Save warns if an ingest changed the application while the panel was open.** It never silently replaces a value the student did not see.
- **The panel and the review card share one definition of a change** (`views/fields.tsx`): text compares trimmed, typed-and-deleted is no change, and a Save with no change sends no request at all.
- **The stale-edit check re-reads the application just before saving and compares only the fields being saved.** A field the student left alone is not sent, so it cannot be overwritten and never warns.
- **A suggestion is answered before confirming, in the client as on the server.** Confirm stays enabled and asks — a disabled button does not say why.
- **Search narrows; it never reorders** — the same rule as the stage chips. It is a client-side `filter` of the server's list, with no comparator.
- **A row sits in a list item that owns its hairline and tints**, so anything carried beneath it — the "Review required" marker — reads as part of the row.
- **After an action, focus goes somewhere deliberate:** the next review card, or the empty queue; Edit, when the editor closes; the refused field, after a refusal; the safe choice, when a warning appears. Never to the page.
- **An animation that gates removal reads its duration from the motion token** (`tokenDurationMs`), never a second constant. `prefers-reduced-motion` zeroes the token, and the removal follows it.
- **The threshold slider saves once per gesture.** It waits for the student to stop, and a failed save restores the stored value and says so.
- **The pipeline is cards whenever the list is narrower than the design system's row needs (800px), at any screen size** — measured on the list, not inferred from the viewport. The row needs 788px; at the 1280px reference size with the panel open it had 579 and spilled under the panel (T5.8).
- **Below 1024px every control is a 44px touch target.** GradTracker's own controls set `--touch-min` inline; the design system's are restated in `app.css`, with `!important`, because their inline sizes beat a stylesheet.
- **Over the list, the detail panel is a modal dialog** (below 1280px): focus is held inside, Escape always closes it, and focus returns to the row that opened it. Beside the list it is a landmark (`aside`). A phone gets a full-screen sheet with Back.
- **Rows are buttons, named with everything they show** — stage and deadline urgency in words — because the design system's row is a `div` no keyboard reaches.
- **Every view renders `ViewTitle`**: the document title and an `<h1>`, since `TopBar` draws its title as a `span`.
- **What was loaded stays through a failed reload; a different question starts empty.** Offline, the shell's banner says so over the last pipeline; a new tab or filter never shows the previous answer.
- **A single-key shortcut has an off switch** (WCAG 2.1.4). "/" to search is turned off in Settings → Keyboard.
- **`app.css` holds only what tokens cannot express inline** — focus rings, touch sizes, rendered markdown — and declares no colour of its own.
- **Contrast is computed from the token files, not assumed** (`contrast.test.ts`). A pair the app relies on must pass; the design system's known failures are pinned as failing until fixed at the source.
- **Documentation pages are sections of `docs/`, compiled in** — never copied into the app. A link to another docs file becomes plain text, not a dead link.

## Business Logic

### Stages and progression
- **Six stages only:** `applied` · `assessment` · `interview` · `offer` · `rejected` · `withdrawn`.
- **"Deadline Approaching" and "Follow-up Required" are computed, never stored** — they are properties of today's date, not of an email.
- **Stage advances forward only** — a new stage applies only if its rank exceeds the current rank.
- **`rejected` and `offer` may arrive from any stage** and always apply.
- **`withdrawn` is never AI-assigned.** User action only. The model may *recognise* a withdrawal confirmation — the labels say `withdrawn` — but no AI classification *applies* it, on any path. Enforced in the pipeline before matching: an AI-detected withdrawal becomes a review item on every path, and the student's confirmation sets the stage (C17, fixed by T3.12).
- **A stage with `human` provenance is frozen** — the pipeline never changes it again.

### Provenance and correction
- **A field with `source = 'human'` is never written by the classification pipeline.** Enforced in the repository write path, inside the transaction.
- **Provenance never downgrades.** There is no `human → ai` transition.
- **Human-verified company and role become the job-matching key**, so corrections route future emails to the corrected job.
- **All five extractable fields are editable:** company, role, stage, deadline, next action.
- **A next action the student set is displayed exactly as set, blank included.** Staleness, a closed application and stage defaults derive only over the model's values. Deriving over the student's made a saved correction look unsaved (C23).

### Classification and confidence
- **Escalate to Sonnet 5 below 0.6 confidence.** Queue for review below `users.review_threshold` (default 0.75). `>=` accepts at the boundary — except at the maximum, 1.0, which means review everything (D28), even an email the model scored 1.0.
- **Never filter on a provider domain.** Google, Microsoft and Amazon are mail providers *and* major graduate employers. A rule matching `google.com` dropped genuine `careers-noreply@google.com` application emails, and the loss was invisible in accuracy figures because a filtered email is never scored. Filter on specific bounce addresses only.
- **The retention boundary is a type, not a discipline.** `classifyOne()` returns a `ClassifiedEmail` with no subject, body or full address, so downstream code cannot persist content it never receives.
- **Escalation is composition, not a branch.** `EscalatingClassifier` satisfies the `EmailClassifier` port, so the pipeline is unaware of it and the harness scores the pair as one model. An escalated answer replaces the primary — never merges with it.
- **`daysUntil` counts calendar days in the student's timezone, never elapsed time.** At 11pm Sunday, a 9am Monday deadline is 0.4 elapsed days away and *tomorrow*.
- **The model is shown when an email arrived in the student's timezone, not only in UTC.** Relative deadlines count from the local date, and 08:00 in Melbourne is still the previous day in UTC (C20). Melbourne is the default until the server stores a zone per student.
- **The pre-filter may never make a classification judgement** — it skips only self-sent mail and calendar system notifications. When in doubt, the email goes to the model.
- **False negatives are the costly failure** and are counted and named explicitly in every harness run.
- **Threshold changes apply to future syncs only.** Dismissed items stay dismissed.
- **The threshold is per user** — `users.review_threshold`, set from the Settings slider. The pipeline reads each user's own value on every email; no caller passes one, so no ingest path can substitute a constant, as the harvest importer once did (T4.10).
- **A match resting on sender domain alone, with low role similarity, is not a match.** It goes to review with a suggested application. Domains like `criteriacorp.com` serve several employers, and a silent merge destroys an application's history. `findMatch` returns `match`, `ambiguous` or none (T3.10).
- **Every review item names its likely application when there is one**, so the card can ask "same application, or a new one?" — and confirming such an item requires that answer. A confirmed item with no suggestion attaches only on a clear match.
- **One step applies an email to an application — `applyEmailToJob` — for the pipeline and the review queue alike.** An email older than the application's latest event changes no detail and never moves `lastEventAt` back; an older offer or rejection never overrules newer news; an older email that moves the stage forward still counts.

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
- Email sending or replying · calendar integration · admin roles or permissions · analytics for early careers services · marketing site · non-Gmail providers · CV or document storage · manual "add application" · a GradTracker login for the local demo.
- **Post-MVP stretch only:** an "upcoming jobs to apply for" module (backlog S1). It would store extracted content from non-application email for the first time — decide it, don't drift into it.

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
- **The prompt is version-stamped**, and the harness reports which prompt version produced a given accuracy figure. Any change to its text bumps the version — `v2` since 28 September (T3.12).
- **Cost baseline** — repriced 28 September 2026 from current rates, with prompt v2: about US$0.003 per real email on Haiku 4.5 and $0.007 on Sonnet 5 — a 2,000-email scan is about $5.40 on Haiku 4.5 ($2.70 batched), and the whole evaluation about $15–20.
- **The app's key is scoped to the GradTracker workspace, never to the whole organization.** An organization-scoped key must name a workspace on every request and can manage workspaces and members through the Admin API; a workspace key can do only what the app needs, and the workspace carries its own spend limit. The key lives in the git-ignored `.env` and nowhere else (28 September 2026).

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

*Last updated: 28 September 2026 · Reasoning and rejected options: [decision-record.md](decision-record.md)*

## Harvest

- **Harvest input files live outside the repository.** They contain email subjects and bodies; only extracted fields reach the database. The file is a transient input, never a committed artefact.
- **The harvest runs the real `processEmail` pipeline**, not a shortcut importer — matching, stage progression, provenance and the retention boundary must all be exercised, or the demo proves nothing about the product.
- **`jordanpsomas@gmail.com` is the recruitment mailbox of record** (since 18 August 2026) — about 12 applications and two complete offer journeys. `jpso0002@student.monash.edu` holds two applications and no offer; `jiddan2016@gmail.com` carries grad-recruitment *marketing* only.
- **From T7.9, harvest files carry no labels** — each email is classified live at import. Replaying stored classifications is for tests only.

## Ingestion *(28 September 2026)*

- **One ingest path, several readers.** Harvest JSON, `.mbox` and `.eml` all become `RawEmail` and run through the unchanged `processEmail`. A new input format is a new reader, never a second pipeline.
- **An email's body is its plain-text part when that says anything, otherwise its HTML converted to text** — never empty while HTML exists. Applicant-tracking systems send HTML in shapes the parser does not convert on its own (C21); an empty body is a missed application.
- **One mailbox, one path.** Connector events carry Gmail API ids; exports carry RFC 822 Message-IDs. Ingest one mailbox both ways and every email is stored twice, invisibly.
- **Every event records its `source`** — `connector`, `export` or `synthetic` — and the timeline builds its Gmail link from it.
- **Authored emails are ingested with `--synthetic`, shown with a "Synthetic" tag and no Gmail link, and never count toward an accuracy figure.** Presenting authored mail as real is the one thing an assessor could fairly call misleading.
- **Never send mail from an employer's real domain.** Authored emails are files, not deliveries.
- **Mail meant for classification must not come from the ingesting user's own address** — the pre-filter drops self-sent mail by design.
- **Demo modes are databases.** `DATABASE_URL` selects which one an ingest fills; single account, test inbox and hybrid never share a database.
- **Refresh ingests the drop folder.** `sync_state.state` is the lock; a concurrent request gets 409, never a second run.

## Evaluation dataset *(28 September 2026)*

- **Real email content never enters git**, whatever the repository's visibility. Files that hold content live outside the repository.
- **Each member exports their own mail.** Nobody reads anyone else's inbox.
- **The 80 authored fixtures are the tuning set.** They shaped the prompt, so they can never be held-out.
- **The held-out set is frozen before any model sees it.** Tune against held-out results once and they become tuning results.
- **The model never pre-labels held-out data.** A test set shaped by the model's guesses inflates that model's score.
- **Positives are enriched to about half, and the report says so.** On a natural inbox, answering "no" to everything scores about 98%.
- **Every reported proportion carries its Wilson 95% interval.** The claim is a point estimate with its interval, not a guaranteed floor.
- **0/0 prints "—", never "0.0 %".** An empty denominator is nothing to measure, and a zero would claim a result — the same rule that stops SM-3 passing vacuously.
- **Confirming onto an existing application is an email, not a correction.** Only fields the student edited on the card become human; everything else goes through `applyEmailToJob` like any other email (defect C16, T3.11). The one exception is a stage only the student may set: confirming a withdrawal is the student's own act.
- **Next action is judged after the run, not labelled before it.** Free text has no single right answer to match.

## Labelling *(28 September 2026)*

- **The labelling guide is the one reference for labels** — [labelling-guide.md](labelling-guide.md). A case it does not cover is decided by the team and added to it, so the next labeller does the same.
- **The guide quotes the prompt; it never paraphrases it.** Stage definitions and every quoted line are verbatim, enforced by `guide.test.ts`. A prompt change updates the guide in the same change.
- **The prompt and the labels state the same rules** (D34). Since prompt v2 the prompt states every convention the guide uses. A label the prompt forbids the model to produce — a role the email never states, a deadline the prompt says to resolve — scores the prompt, not the model (C19). A new convention goes into both, in one change.
- **A field is labelled from the email alone, never from its thread.** The classifier sees one email at a time.
- **Deadlines:** hours are exact; days, weeks and business days end at 23:59 on the last day (business days are Monday to Friday, public holidays ignored); "by", "before", "until" or "no later than" a date is that date at 23:59; "close of business" is 17:00; a weekday alone is the first such day on or after receipt; when a weekday and a date disagree, the date wins.
- **Company as this email names it** — its sentences, then its sign-off, then its subject — minus a country, a legal suffix (Pty Ltd, Limited, Co) and team words; never the ATS. The scorer matches exactly, apart from case and spacing, so the rule must be mechanical.
- **Toolkit writes are refused inside the repository** (`assertOutsideRepository`) — enforced, not conventional, including through links and differently-cased Windows paths.
- **Import is all-or-nothing**, each problem reported by row number. **Dates are ISO only:** `07/04/2026` is 7 April or 4 July depending on the reader's locale.
- **Splits and samples are seeded, never hand-picked.** The same sheet and seed give the same tuning/held-out split and the same agreement sample; the seed is recorded in the freeze manifest.
- **A frozen held-out set is verified before every measurement**, and the harness refuses to score one that has changed.
- **Leaving an email out is always allowed** — a blank `is_application`. Privacy outranks completeness; the import reports how many were left out.
