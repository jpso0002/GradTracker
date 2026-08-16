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
- **No vendor SDK may be imported above the port line** — enforced by lint rule, not convention.
- **No global state library.** Server state lives in the typed API client + component state; a store gets added only when two distant components demonstrably need the same data.
- **The design system is a read-only dependency.** `GradTracker Design System/` is consumed, never edited and never re-implemented.
- **Adapters default to `fake`** — `GMAIL_ADAPTER` and `CLASSIFIER_ADAPTER` must be explicitly set to `live`.
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
- **Ranking, staleness and urgency are pure functions** with no I/O, so they are exhaustively testable.
- **Mutations are optimistic with rollback** and a `Toast` on success.
- **Colour is never the only signal** — stage badges carry text, deadline pills carry dates, provenance carries a tag.
- **Empty states admit the gap** rather than filling space. Blank means blank.
- **No fake progress.** If duration is unknown, show a real count of work done.

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
