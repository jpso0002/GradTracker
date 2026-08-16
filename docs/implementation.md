# GradTracker — Implementation Guide

**The step-by-step build guide.** Architecture, schema, feature requirements, and the
phased plan. Decisions recorded here were agreed on 16 August 2026; the reasoning behind
each is in [decision-record.md](decision-record.md).

**Companion docs:** [masterplan.md](masterplan.md) · [design.md](design.md) ·
[app-flow.md](app-flow.md)

---

## 1. Stack

| Layer | Choice | Notes |
|---|---|---|
| Client | React 18 + Vite + TypeScript | Consumes `GradTracker Design System/components/` directly |
| Server | Node 20 + Express + TypeScript | ESM throughout |
| Database | Postgres (production) · SQLite (dev + test) | Same schema, same SQL, via Drizzle ORM |
| Validation | Zod | One schema reused by the classifier, the API, and the client |
| Testing | Vitest + Supertest | `npm test` runs with zero external services |
| LLM | `claude-haiku-4-5`, escalating to `claude-sonnet-5` | See §7.4 |
| Mail | Gmail API v1, `gmail.readonly` scope | Behind the `GmailClient` port |

**Two declared divergences from the submitted architecture** (React + Node/Python + MySQL):
Node over Python, Postgres/SQLite over MySQL. Full reasoning in the decision record §1.

### 1.1 Why one language

The classifier's output contract is a Zod schema. That same schema validates the LLM
response, validates inbound API edits, and generates the client's TypeScript types. In a
split-language stack this contract is written three times and drifts. This is the single
largest correctness win available to a three-person team on a 12-week clock.

---

## 2. System architecture

```
┌────────────────────────────────────────────────────────────────────┐
│  Browser — React SPA                                               │
│  Pipeline · Detail panel · Needs review · Settings · Connect       │
└───────────────────────────┬────────────────────────────────────────┘
                            │ HTTPS · session cookie (httpOnly, secure)
┌───────────────────────────▼────────────────────────────────────────┐
│  Express API                                                       │
│  ├─ auth/      OAuth callback, session issue/verify                │
│  ├─ routes/    jobs, review, sync, settings   (all user-scoped)    │
│  └─ middleware/ https-enforce · session · validate · rate-limit    │
├────────────────────────────────────────────────────────────────────┤
│  Domain — knows nothing about Gmail or Claude                      │
│  ├─ sync/         orchestrator, historyId cursor, backoff          │
│  ├─ classify/     pipeline, confidence gate                        │
│  ├─ stages/       transition rules, terminal states                │
│  ├─ matching/     job identity + dedup                             │
│  ├─ provenance/   ai|human field locking                           │
│  └─ ranking/      urgency sort (pure function)                     │
├───────────────┬────────────────────────────────┬───────────────────┤
│  PORT         │  PORT                          │  Repository       │
│  GmailClient  │  EmailClassifier               │  (Drizzle)        │
│  ├ live: Gmail│  ├ live: Anthropic SDK         │                   │
│  └ fake: files│  └ fake: fixture map           │                   │
└───────────────┴────────────────────────────────┴─────────┬─────────┘
                                                 ┌─────────▼─────────┐
                                                 │ Postgres / SQLite │
                                                 └───────────────────┘
```

**The rule that makes this testable:** nothing above the port line imports the Gmail SDK or
the Anthropic SDK. Swapping in the fakes exercises the entire pipeline offline.

---

## 3. Repository layout

```
GradTracker/
├─ docs/                         masterplan · implementation · design · app-flow · decision-record
├─ GradTracker Design System/    supplied; consumed, never edited
├─ packages/
│  ├─ shared/                    Zod schemas + inferred types used by both sides
│  │  └─ src/schema/             classification.ts · job.ts · api.ts
│  ├─ server/
│  │  └─ src/
│  │     ├─ db/                  schema.ts · migrations/ · seed.ts
│  │     ├─ ports/               gmail-client.ts · email-classifier.ts   (interfaces)
│  │     ├─ adapters/
│  │     │  ├─ gmail/            live.ts · fake.ts
│  │     │  └─ classifier/       live.ts · fake.ts · prompt.ts
│  │     ├─ domain/              sync/ classify/ stages/ matching/ provenance/ ranking/
│  │     ├─ routes/              auth.ts · jobs.ts · review.ts · sync.ts · settings.ts
│  │     ├─ middleware/
│  │     └─ crypto/              token-cipher.ts   (AES-256-GCM)
│  └─ client/
│     └─ src/
│        ├─ views/               ConnectView · PipelineView · DetailPanel · ReviewView · SettingsView
│        ├─ ds/                  thin re-export layer over the design system
│        ├─ api/                 typed fetch client
│        └─ hooks/
└─ fixtures/
   ├─ emails/                    NNN-slug.json      one labelled email each
   ├─ expected/                  NNN-slug.json      expected classification
   └─ harness/                   accuracy.ts        the CI gate
```

---

## 4. Data model

Normalised `users` / `jobs` / `email_events` as submitted, plus `job_field_provenance`
(the correction-persistence mechanism) and `sync_state` (the `historyId` cursor).

### 4.1 `users`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `google_sub` | text UNIQUE NOT NULL | Google's stable subject id. The identity key. |
| `email` | text NOT NULL | For display only |
| `display_name` | text | |
| `anon_key` | uuid NOT NULL UNIQUE | Stable anonymous key for any future aggregate query. Never leaves the server. |
| `refresh_token_ciphertext` | bytea NOT NULL | AES-256-GCM |
| `refresh_token_iv` | bytea NOT NULL | |
| `refresh_token_tag` | bytea NOT NULL | |
| `review_threshold` | real NOT NULL DEFAULT 0.75 | Per-user confidence gate |
| `created_at` / `last_sync_at` | timestamptz | |

**No password column exists.** SM-5 is enforced by the absence of the column, not by policy.

### 4.2 `jobs`

One row per application. The unit the student thinks in.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK → users NOT NULL | Every query filters on this |
| `company` | text NOT NULL | Extractable field |
| `company_normalised` | text NOT NULL | Lowercased, suffixes stripped — the matching key |
| `role` | text NOT NULL | Extractable field |
| `stage` | text NOT NULL | enum, §7.5 |
| `deadline_at` | timestamptz NULL | Extractable field |
| `next_action` | text NULL | Extractable field |
| `sender_domain` | text NULL | Matching tiebreak + provenance display |
| `confidence` | real NOT NULL | Lowest field confidence on the job |
| `status` | text NOT NULL DEFAULT `'active'` | `active` \| `archived` |
| `first_seen_at` / `last_event_at` | timestamptz NOT NULL | `last_event_at` drives staleness |
| `created_at` / `updated_at` | timestamptz NOT NULL | |

Indexes: `(user_id, status)`, `(user_id, company_normalised)`, `(user_id, deadline_at)`.

**Extractable fields** — the four the AI produces and the student may correct — are
`company`, `role`, `deadline_at`, `next_action`, plus `stage`. Each has a provenance row.

### 4.3 `email_events`

One row per classified email. **The retention boundary lives here.**

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK NOT NULL | |
| `job_id` | uuid FK → jobs NULL | Null while queued for review |
| `gmail_message_id` | text NOT NULL | |
| `gmail_thread_id` | text NOT NULL | |
| `received_at` | timestamptz NOT NULL | |
| `sender_domain` | text NULL | e.g. `greenhouse.io` — provenance, never the full address |
| `detected_stage` | text NULL | What this email said |
| `detected_deadline_at` | timestamptz NULL | |
| `detected_next_action` | text NULL | |
| `confidence` | real NOT NULL | |
| `review_status` | text NOT NULL | `auto_accepted` \| `pending` \| `confirmed` \| `dismissed` |
| `classifier_model` | text NOT NULL | Which model produced this, for the harness |
| `created_at` | timestamptz NOT NULL | |

UNIQUE `(user_id, gmail_message_id)` — the idempotency guarantee. Re-processing an email is
a no-op.

> **Columns that must never exist:** `subject`, `body`, `snippet`, `body_html`,
> `from_address`, `raw`. `retention.test.ts` asserts this against the live schema, so adding
> one fails CI.

### 4.4 `job_field_provenance`

The mechanism behind SM-7.

| Column | Type | Notes |
|---|---|---|
| `job_id` | uuid FK NOT NULL | Composite PK with `field` |
| `field` | text NOT NULL | `company` \| `role` \| `stage` \| `deadline_at` \| `next_action` |
| `source` | text NOT NULL | `ai` \| `human` |
| `confidence` | real NULL | Null once human |
| `updated_at` | timestamptz NOT NULL | |

**The invariant:** a field whose `source = 'human'` is never written by the classification
pipeline. Enforced in the repository write path, not by convention, and covered by
`provenance.test.ts`.

### 4.5 `sync_state`

| Column | Type | Notes |
|---|---|---|
| `user_id` | uuid PK FK | |
| `history_id` | text NULL | Gmail cursor. Null = never synced. |
| `last_full_scan_at` | timestamptz NULL | |
| `state` | text NOT NULL | `idle` \| `running` \| `failed` |
| `last_error` | text NULL | |
| `emails_read_total` | integer NOT NULL DEFAULT 0 | Powers "612 emails read" |

`history_id` is advanced **only inside the transaction that commits the batch** (§8.2).

---

## 5. Ports

Two interfaces. Everything above them is testable offline.

### 5.1 `GmailClient`

```ts
export interface RawEmail {
  gmailMessageId: string;
  gmailThreadId: string;
  receivedAt: Date;
  fromAddress: string;   // in-memory only — only the domain is ever persisted
  subject: string;       // in-memory only — never persisted
  body: string;          // in-memory only — never persisted
}

export interface GmailPage {
  messageIds: string[];
  nextPageToken?: string;
  historyId: string;     // the cursor to persist once the batch commits
}

export interface GmailClient {
  /** Full scan when historyId is null; incremental when supplied. */
  listSince(historyId: string | null, pageToken?: string): Promise<GmailPage>;
  fetchMessage(id: string): Promise<RawEmail>;
}
```

`HISTORY_ID_EXPIRED` is a typed error the sync orchestrator handles by falling back to a
bounded full scan (§8.3).

### 5.2 `EmailClassifier`

```ts
export const ClassificationSchema = z.object({
  isApplication: z.boolean(),
  company:    z.string().min(1).max(120).nullable(),
  role:       z.string().min(1).max(160).nullable(),
  stage:      z.enum(['applied','assessment','interview','offer','rejected','withdrawn']).nullable(),
  deadlineAt: z.string().datetime().nullable(),
  nextAction: z.string().max(120).nullable(),
  confidence: z.number().min(0).max(1),
  reasoning:  z.string().max(300),   // logged for debugging, never persisted
});

export interface EmailClassifier {
  classify(email: RawEmail): Promise<Classification>;
}
```

**Fakes.** `FakeGmailClient` reads `fixtures/emails/`. `FakeEmailClassifier` is a map from
fixture id to a recorded response. Both are the default in test and in demo mode.

---

## 6. Configuration

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | Postgres URL, or `file:./dev.db` for SQLite |
| `SESSION_SECRET` | yes | Session signing |
| `TOKEN_ENCRYPTION_KEY` | yes | 32 bytes, base64. AES-256-GCM key for refresh tokens |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | live only | OAuth |
| `ANTHROPIC_API_KEY` | live only | Classification |
| `GMAIL_ADAPTER` | no | `live` \| `fake` (default `fake`) |
| `CLASSIFIER_ADAPTER` | no | `live` \| `fake` (default `fake`) |
| `NODE_ENV` | yes | `production` enables HTTPS enforcement and HSTS |

**Adapters default to `fake`.** A fresh clone runs, seeds, and tests with no credentials.

---

## 7. Core features

### 7.1 F1 — Connect inbox *(workflow 1)*

**Requirement.** The student signs in with Google. The system runs OAuth 2.0 with
`gmail.readonly`, stores no password, encrypts the refresh token at rest, and performs an
initial full inbox scan.

**Implementation.**
1. `GET /auth/google` → consent screen, scopes `openid email gmail.readonly`, PKCE, `state`
   in an httpOnly cookie.
2. `GET /auth/google/callback` → verify `state`, exchange code, upsert user by `google_sub`.
3. Encrypt the refresh token with AES-256-GCM (`crypto/token-cipher.ts`); store ciphertext,
   IV and auth tag in separate columns. **The plaintext token never touches a log or a
   response body.**
4. Issue a session cookie: `httpOnly`, `secure` in production, `sameSite=lax`, 7-day
   rolling expiry.
5. Enqueue the initial full scan; the client shows scan progress (see
   [app-flow.md §4.1](app-flow.md)).

**Acceptance.** SM-5. `security.test.ts` asserts: no `password` column exists anywhere in
the schema; the persisted refresh token bytes do not contain the plaintext; a
non-HTTPS request in production mode is redirected; a request with no session receives 401.

**Initial scan bound.** The first scan reads the most recent **2,000 messages or 180 days**,
whichever is smaller. Unbounded scans are a cost and rate-limit hazard, and older mail has
no live pipeline value.

### 7.2 F2 — Classify and extract *(workflow 2)*

**Requirement.** Each fetched email goes to the LLM classifier and returns structured JSON.
Non-application email is discarded; application email is written to the normalised tables.

**Pipeline, per email:**

```
fetchMessage → in-memory RawEmail
  → pre-filter (cheap, deterministic, §7.3)
  → classifier.classify()
  → Zod validation (invalid JSON → one retry → drop with a logged error)
  → if !isApplication            → record nothing, count it, discard   ◄── body freed here
  → if confidence < threshold    → email_events { review_status: 'pending', job_id: null }
  → else                         → match to job (§7.6) → apply provenance rules (§7.7)
                                 → advance stage (§7.5) → email_events { auto_accepted }
```

**The retention boundary is a single function.** `classifyOne(raw)` receives the only
reference to the body in the process and returns a body-free result object. Nothing
downstream can persist what it cannot see. This is what makes SM-6 structurally true rather
than a matter of discipline.

### 7.3 Pre-filter

A deterministic cheap pass before the LLM, purely to control cost:

- Skip messages from the user's own address (sent mail in the thread).
- Skip calendar `.ics` auto-notifications and Gmail system messages.
- **Nothing else.** The pre-filter must never make a classification judgement — a
  keyword-based skip would create false negatives, and false negatives are the costly
  failure (SM-2). When in doubt, the email goes to the model.

### 7.4 Model strategy

| Pass | Model | When |
|---|---|---|
| Primary | `claude-haiku-4-5` | Every email |
| Escalation | `claude-sonnet-5` | Primary returns confidence < 0.6 |

The escalated result replaces the primary. Both are recorded to `classifier_model` so the
harness can report accuracy per model, evidencing the cost/accuracy trade-off rather than
asserting it.

**Prompt contract** (`adapters/classifier/prompt.ts`): system prompt states the task, the
six stages with definitions, the output JSON schema, today's date (for resolving "by
Friday"), and the instruction to return `isApplication: false` rather than guess. Output is
constrained by a tool-use schema so malformed JSON is not a normal failure mode. **The
prompt is version-stamped**; the harness reports which version produced a given accuracy
number.

### 7.5 F3 — Stage the application *(workflow 3)*

**Six stages** — matching `StageBadge`, the design system's single source of stage colour:

| Stage | Meaning | Rank |
|---|---|---|
| `applied` | Application received / confirmed | 1 |
| `assessment` | Online assessment or test invited | 2 |
| `interview` | Interview invited or scheduled | 3 |
| `offer` | Offer received | 4 |
| `rejected` | Unsuccessful | terminal |
| `withdrawn` | Student withdrew | terminal, user-set only |

**Transition rules.**
1. Stage only advances forward: a new stage is applied only if its rank exceeds the current
   rank. A confirmation email arriving after an interview invite does not regress the job.
2. `rejected` and `offer` may arrive from **any** stage and always apply.
3. `withdrawn` is never AI-assigned. User action only.
4. Once `stage` provenance is `human`, the pipeline never changes it (§7.7).
5. Every transition writes an `email_events` row, so the detail-panel timeline is a
   projection of real events rather than a separate log.

**The brief's other two "stages" are computed, not stored** — see the decision record D10:

- **Deadline Approaching** → `DeadlinePill`, coloured from `daysLeft` at render time
  (≤2 ruby, 3–7 amber, else muted). Never goes stale.
- **Follow-up Required** → derived staleness flag: `now - last_event_at` exceeds the
  per-stage threshold — `applied` 14 days, `assessment` 5, `interview` 7, `offer` 3.

*(D10 is the one open decision. If the team elects to follow the brief literally,
`StageBadge` gains a seventh stage and both computed values become stored ones — at the
cost of staleness.)*

### 7.6 Job identity and deduplication

Two emails belong to the same job when, **within one user**:

1. `company_normalised` matches exactly, **and**
2. role titles match with **Dice coefficient ≥ 0.6** on normalised bigrams, **or** the
   `sender_domain` matches an existing job for that company.

`normaliseCompany()`: lowercase, strip legal suffixes (`pty ltd`, `ltd`, `inc`, `llc`,
`limited`, `group`, `australia`), strip punctuation, collapse whitespace.

Where a job has `human` provenance on `company` or `role`, the **human values are the
matching key** — correcting "Deloitte Digital" to "Deloitte" makes future Deloitte emails
land on the corrected job. This is what "the correction persists" means operationally.

Unmatched → new job. Over-merging is worse than a duplicate: a duplicate is visible and
correctable, a wrong merge silently destroys a real application's history.

### 7.7 F4 — Correct the AI *(workflow 6)*

**Requirement.** Clicking any extracted field makes it inline-editable. On save the value is
human-verified, tagged "Edited", and future classifications inherit rather than overwrite.

**Write-path rule — the whole feature in four lines:**

```ts
function applyExtraction(job, field, value, confidence, tx) {
  const prov = getProvenance(job.id, field, tx);
  if (prov?.source === 'human') return;          // ◄── SM-7 enforced here
  writeField(job, field, value, tx);
  upsertProvenance(job.id, field, 'ai', confidence, tx);
}
```

`PATCH /api/jobs/:id` sets `source = 'human'`, clears `confidence`, and is the only path
that may overwrite a human field. Validation per field: `company`/`role` 1–160 chars
trimmed, `next_action` ≤ 120, `deadline_at` a valid ISO date within ±2 years, `stage` one of
six. Rejection returns 400 with the field name.

**Visual contract** is [design.md §7](design.md): human-verified fields show an "Edited" tag
and drop the confidence meter; AI fields show `ConfidenceMeter`.

### 7.8 F5 — Review queue *(confidence gate)*

Emails classified below `users.review_threshold` (default 0.75) create an `email_events` row
with `review_status = 'pending'` and **no** job. They appear in Needs review with per-field
confidence. The student **confirms** (creates or updates the job, all confirmed fields
marked `human`), **edits then confirms**, or **dismisses** (`review_status = 'dismissed'`;
never resurfaces — the unique constraint on `gmail_message_id` guarantees it).

### 7.9 F6 — See the pipeline *(workflow 4)*

**Ranking is a pure function** — `domain/ranking/rank.ts`, no I/O, exhaustively testable
(SM-4). Lexicographic, in the order the brief specifies:

```
1. Urgency bucket    overdue → 0 | ≤2d → 1 | 3–7d → 2 | 8–14d → 3 | none/>14d → 4
                     (a follow-up-required job is capped at bucket 3 so staleness
                      cannot be buried beneath far-future deadlines)
2. Stage rank        descending — offer 4, interview 3, assessment 2, applied 1
3. last_event_at     ascending — stalest first
4. company           A–Z — guarantees a stable, reproducible order
```

Terminal jobs (`rejected`, `withdrawn`) are excluded from the default Active tab.

**The stat strip** shows live application count, count due this week, count needing review,
and total emails read.

### 7.10 F7 — Suggest next action *(workflow 5)*

Precedence: the AI-extracted `next_action` if present → otherwise a stage-derived default
(`applied` → "Wait for response"; `assessment` → "Complete online assessment";
`interview` → "Confirm interview time"; `offer` → "Respond to offer") → overridden by the
follow-up rule when stale ("Follow up — no reply in 14 days").

Deadline-bearing actions render with the date appended: "Complete online assessment by
23 May". Imperative, specific, sentence case, no trailing period ([design.md §9](design.md)).

### 7.11 F8 — Refresh on demand *(workflow 7)*

`POST /api/sync` triggers an incremental fetch, re-runs the pipeline over new mail only, and
returns a summary. Concurrent syncs for one user are rejected with 409 — `sync_state.state`
is the lock. The button shows progress and the timestamp updates to "Synced just now".

---

## 8. Sync engine

### 8.1 Flow

```
lock (sync_state.state = 'running')
  → listSince(history_id)
  → for each message id not already in email_events:
        fetchMessage → classify → stage/persist
  → BEGIN TX: write email_events + jobs + provenance
              + sync_state.history_id = page.historyId
     COMMIT                                    ◄── cursor moves only here
  → unlock (state = 'idle', last_sync_at = now)
```

### 8.2 Why the cursor moves last

Advancing `history_id` before the batch commits means a crash loses those emails
permanently — Gmail will never return them again. **A skipped email is a missed
application, which is the failure the product exists to prevent.** Committing the cursor
with the data makes a crash cause a harmless re-read; the unique constraint on
`(user_id, gmail_message_id)` makes the re-read idempotent.

### 8.3 Failure handling

| Condition | Response |
|---|---|
| HTTP 429 / `rateLimitExceeded` | Exponential backoff with jitter: 1s, 2s, 4s, 8s, 16s, max 5 attempts |
| HTTP 403 `userRateLimitExceeded` | Same backoff; halve the token-bucket rate for the rest of the run |
| HTTP 404 on `historyId` (expired) | Bounded full rescan (§7.1 limits); log the fallback |
| Token refresh fails / revoked | `state = 'failed'`, flag the user as disconnected, prompt reconnect in the UI |
| Anthropic 429 or 529 | Backoff and retry; on final failure leave the email unprocessed so the next sync retries it |
| Crash mid-run | Cursor unmoved; next sync re-reads; unique constraint absorbs duplicates |

A token-bucket limiter (default 5 requests/second, configurable) sits in front of every
Gmail call.

---

## 9. API surface

All routes require a session and are **scoped to `req.user.id`**. There is no route that can
return another user's data — enforced by a repository layer that takes `userId` as a
mandatory first argument on every method.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/auth/google` | Begin OAuth |
| `GET` | `/auth/google/callback` | Complete OAuth, issue session |
| `POST` | `/auth/logout` | Destroy session |
| `GET` | `/api/me` | Current user, connection status, sync state |
| `GET` | `/api/jobs` | Ranked pipeline. `?status=active\|archived&stage=` |
| `GET` | `/api/jobs/:id` | Job + event timeline + provenance |
| `PATCH` | `/api/jobs/:id` | Correct fields → marks `human` |
| `POST` | `/api/jobs/:id/withdraw` | Terminal stage, user-set |
| `GET` | `/api/review` | Pending review queue |
| `POST` | `/api/review/:eventId/confirm` | Accept, optionally with edits |
| `POST` | `/api/review/:eventId/dismiss` | Not an application |
| `POST` | `/api/sync` | Incremental sync; 409 if already running |
| `GET` | `/api/sync/status` | Progress for the in-flight sync |
| `GET`/`PATCH` | `/api/settings` | Review threshold, reminders, profile |

Every request body is Zod-validated by shared schemas. Validation failure → 400 with the
offending field. Unknown fields are stripped, never persisted.

---

## 10. Security implementation *(SM-5)*

| Requirement | Implementation | Test |
|---|---|---|
| Zero credentials stored | No `password` column exists | Schema assertion |
| OAuth 2.0 only | Google as sole identity provider, PKCE, `state` verified | `auth.test.ts` |
| Refresh tokens AES-256 encrypted at rest | AES-256-GCM, key from `TOKEN_ENCRYPTION_KEY`, IV per record, auth tag stored | Persisted bytes ≠ plaintext |
| HTTPS enforced | Middleware 308-redirects non-HTTPS in production; HSTS `max-age=31536000` | Middleware test |
| Input validation on every editable field | Zod at the route boundary, per-field | Invalid payload → 400 |
| Sessions managed securely | `httpOnly`, `secure`, `sameSite=lax`, signed, 7-day rolling, destroyed on logout | Cookie flag assertions |
| No cross-user data access | Repository requires `userId` on every method | Cross-user fetch → 404 |
| Read-only mail access | `gmail.readonly` — the app is technically incapable of sending | Scope assertion |

Additional: `helmet` for baseline headers, rate limiting on auth and sync routes, secrets
never logged, CORS restricted to the client origin.

---

## 11. Accuracy harness *(SM-1, SM-2, SM-3)*

**First-class deliverable, built in Phase 2 — before the pipeline that depends on it.**

### 11.1 Fixture format

```jsonc
// fixtures/emails/041-deloitte-oa-invite.json
{ "id": "041-deloitte-oa-invite",
  "gmailMessageId": "fixture-041", "gmailThreadId": "fixture-t041",
  "receivedAt": "2026-05-18T09:14:00+10:00",
  "fromAddress": "no-reply@greenhouse.io",
  "subject": "Your online assessment — Deloitte Audit Graduate Program",
  "body": "..." }

// fixtures/expected/041-deloitte-oa-invite.json
{ "isApplication": true, "company": "Deloitte", "role": "Audit Graduate Program",
  "stage": "assessment", "deadlineAt": "2026-05-23T23:59:00+10:00",
  "hasExplicitDeadlineLanguage": true }
```

`hasExplicitDeadlineLanguage` marks the SM-3 denominator: only emails flagged true count
toward the ≥80% deadline target.

### 11.2 Corpus composition — approximately 80 emails

| Class | Count | Contents |
|---|---|---|
| Application — positive | ~55 | All six stages; ATS senders (Greenhouse, Workday, Lever, SmartRecruiters) and direct human email; ~30 carrying explicit deadlines in varied formats ("by Friday 23 May", "within 5 business days", "before 11:59pm AEST on 23/05") |
| **Hard negatives** | ~15 | LinkedIn job alerts, Seek recommendations, university careers newsletters, "someone viewed your application", networking-event invites, recruiter cold outreach for roles never applied to |
| Easy negatives | ~10 | Unit announcements, banking, retail marketing, personal mail |

Hard negatives carry the weight. Anything can separate a rejection letter from a bank
statement; the real test is separating a genuine application update from a LinkedIn job
alert that uses identical vocabulary.

### 11.3 Output

```
$ npm run accuracy

GradTracker classification accuracy — prompt v3, model claude-haiku-4-5
─────────────────────────────────────────────────────────────
Corpus                      80 emails  (55 application / 25 not)

Accuracy                    96.3 %     (77/80)          target ≥95%   PASS
Precision                   98.2 %     (54/55 predicted)
Recall                      96.4 %     (53/55 actual)
False negatives                 2      ◄ missed applications        [SM-2]
False positives                 1

Deadline detection          83.3 %     (25/30 deadline-bearing)  target ≥80%   PASS

Field accuracy (on true positives)
  company                   94.5 %
  role                      89.1 %
  stage                     92.7 %

Missed applications (false negatives):
  062-boutique-consult-invite   confidence 0.41  → predicted not-application
  071-informal-recruiter-reply  confidence 0.38  → predicted not-application
─────────────────────────────────────────────────────────────
PASS — 2 thresholds met
```

**Exit code 1 if either threshold fails**, making it a CI gate rather than a report. Every
false negative is named, because SM-2 requires them tracked explicitly and a list of
filenames is what actually drives prompt iteration.

### 11.4 Live-model mode

`npm run accuracy -- --live` runs the same corpus against the real Anthropic API and prints
token cost. Default is the fake, so `npm test` costs nothing and needs no key.

---

## 12. Testing strategy

| Suite | Covers | Metric |
|---|---|---|
| `accuracy` | Classification and deadline extraction | SM-1, SM-2, SM-3 |
| `ranking.test.ts` | Pipeline ordering on fixture pipelines with known correct order | SM-4 |
| `security.test.ts` | Schema, encryption, HTTPS, sessions, validation, scoping | SM-5 |
| `retention.test.ts` | Classify a fixture, then assert no subject/body substring exists in any table; assert forbidden columns absent | SM-6 |
| `provenance.test.ts` | Correct → sync with a conflicting value → human value survives | SM-7 |
| `performance.test.ts` | Pipeline endpoint response time on a seeded 25-job pipeline | SM-8 |
| `stages.test.ts` | Transition table including no-regression and terminal states | F3 |
| `matching.test.ts` | Dedup, near-miss role titles, human-key override | F6 |
| `sync.test.ts` | Cursor safety, backoff, expired `historyId`, crash re-read idempotency | §8 |

**Phase 8 produces the traceability document**: every success metric → its test file → its
current result. That table is the milestone-review artefact for SM-9.

---

## 13. Phased plan — 12 weeks

Phase 2 lands before the pipeline it measures, on purpose. Accuracy becomes visible in
week 3, leaving nine weeks to improve it.

| Phase | Weeks | Deliverable | Exit criteria |
|---|---|---|---|
| **1 — Foundation** | 1–2 | Repo, TS config, Drizzle schema, migrations, provenance model, seed data | `npm run db:migrate && npm run db:seed` clean on SQLite and Postgres; seeded pipeline queryable |
| **2 — Harness** | 2–3 | Ports, both fakes, ~80 fixtures, accuracy harness | `npm run accuracy` prints real numbers and gates on threshold |
| **3 — Pipeline** | 3–5 | Classification pipeline, confidence gate, stage engine, job matching, provenance write path | Fixtures flow end-to-end into jobs; `stages`, `matching`, `provenance` green |
| **4 — API** | 5–6 | All routes, user scoping, validation, security middleware | `security.test.ts` and `retention.test.ts` green |
| **5 — Dashboard** | 6–8 | App shell, Pipeline view, ranking, stat strip, detail panel | SM-4 walkthrough on a 25-job seeded pipeline |
| **6 — Human-in-the-loop** | 8–9 | Inline correction, Edited tags, review queue, confirm/dismiss | SM-7 demonstrated live |
| **7 — Live adapters** | 9–11 | Real Gmail client, real Claude classifier, OAuth end-to-end, backoff, sync UI | Real inbox syncs; fakes still pass unchanged |
| **8 — Traceability** | 11–12 | Traceability document, README, deployment config, accuracy re-run on any real labelled data | SM-9; every metric evidenced |

**Parallelisation for three people.** After Phase 2 the ports are stable contracts, so one
person can build the front-end against seeded data, one the domain pipeline, and one the
live adapters, without blocking each other. This is the main reason Phase 2 comes early.

---

## 14. Local development

```bash
npm install
cp .env.example .env      # works as-is: adapters default to fake
npm run db:migrate
npm run db:seed           # ~25 realistic applications across all six stages
npm run dev               # client :5173, server :3000
```

```bash
npm test                  # every suite, no external services
```

```bash
npm run accuracy          # the SM-1/SM-2/SM-3 gate
```

No database server, no Google account, and no API key is required for any of the above.
That property is a requirement, not a convenience — it is how a marker verifies the project
on a machine that has never seen it.
