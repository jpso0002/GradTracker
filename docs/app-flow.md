# GradTracker — Application Flow

**The product's skeleton.** Screens, journeys, state transitions, and every error and edge
case a developer will hit. If [implementation.md](implementation.md) says what to build,
this says what happens when someone uses it.

**Companion docs:** [masterplan.md](masterplan.md) · [implementation.md](implementation.md)
· [design.md](design.md)

---

## 1. Screen map

Five surfaces, matching the design system's app UI kit exactly.

```
                        ┌─────────────┐
   not authenticated →  │   Connect   │   ConnectView
                        └──────┬──────┘
                          OAuth│ + initial scan
                        ┌──────▼──────────────────────────────┐
                        │            App shell                │
                        │  sidebar · top bar · theme toggle   │
                        ├─────────────┬───────────┬───────────┤
                        │  Pipeline   │  Needs    │ Settings  │
                        │  (default)  │  review   │           │
                        └──────┬──────┴───────────┴───────────┘
                          row  │ click
                        ┌──────▼──────┐
                        │Detail panel │   overlay, not a route change
                        └─────────────┘
```

**Calendar and Archive appear in the sidebar but are deliberately blank** — the brief
defines no design for them, and [design.md §9](design.md) says blank means blank rather than
filled with placeholder content.

### 1.1 Routes

| Route | View | Auth | Notes |
|---|---|---|---|
| `/` | Redirect | — | → `/pipeline` if authenticated, else `/connect` |
| `/connect` | ConnectView | public | Redirects away if already authenticated |
| `/pipeline` | PipelineView | required | Default landing surface |
| `/pipeline/:jobId` | PipelineView + DetailPanel | required | Deep-linkable and shareable |
| `/review` | ReviewView | required | Badge count in sidebar |
| `/settings` | SettingsView | required | |
| `/auth/google/callback` | — | public | Server-handled |

The detail panel is a route so a student can bookmark a specific application and so browser
back closes the panel rather than leaving the pipeline.

---

## 2. Navigation model

**Sidebar** (240px, persistent): Wordmark · Pipeline · Needs review *(count badge)* ·
Calendar *(blank)* · Archive *(blank)* · Settings. Theme toggle bottom-left.

**Top bar** (56px): view title · search · "Sync inbox" with last-synced timestamp · avatar.

**Detail panel** (380px): opens on row click, pushes a route, closes on `Escape`, on the
close control, or on selecting another row (which swaps content without closing).

**Navigation rules.**
- The pipeline is always one click away from anywhere.
- Correcting a field never navigates ([design.md §7.2](design.md)) — that is workflow 6's
  core requirement.
- Confirming a review item does not leave Needs review; the item animates out and the next
  takes focus.
- Nothing in the product opens a new tab except the "View in Gmail" deep link.

---

## 3. Core state machines

### 3.1 Job stage

```
      ┌──────────────────── rejected / offer arrive from ANY stage ─────────┐
      │                                                                     │
  applied ──► assessment ──► interview ──► offer                            │
  (rank 1)    (rank 2)       (rank 3)     (rank 4)                          │
      │            │             │           │                              │
      └────────────┴─────────────┴───────────┴──────────────────────► rejected  [terminal]
      └────────────┴─────────────┴───────────┴──────────────────────► withdrawn [terminal, user only]
```

**Rules** *(see [implementation.md §7.5](implementation.md))*:
1. Forward only — a new stage applies only if its rank exceeds the current rank.
2. `rejected` and `offer` apply from any stage.
3. `withdrawn` is never AI-assigned.
4. A `human` provenance lock on `stage` freezes it against the pipeline entirely.
5. Every transition writes an `email_events` row, so the timeline is a projection of real
   events.

**Two computed overlays, not stages:**
- **Deadline approaching** — `DeadlinePill` colour from `daysLeft`, recomputed at render.
- **Follow-up required** — `now - last_event_at` past the per-stage threshold: `applied` 14
  days, `assessment` 5, `interview` 7, `offer` 3.

### 3.2 Field provenance

```
   ┌────────────┐   student edits   ┌──────────────┐
   │  ai        │──────────────────►│  human       │
   │ meter      │                   │ "Edited" tag │
   │ overwritable│◄─── never ───────│  locked      │
   └────────────┘                   └──────────────┘
        ▲
        │ classifier writes freely
```

The reverse arrow does not exist. Nothing in the product downgrades a human field back to
AI. This is SM-7.

### 3.3 Sync

```
 idle ──POST /api/sync──► running ──success──► idle
   ▲                         │
   │                         └──error──► failed ──retry──► running
   └──────── reconnect ◄──── disconnected (token revoked)
```

`running` is the lock — a second sync for the same user returns **409**. `history_id`
advances only inside the committing transaction.

### 3.4 Review item

```
 pending ──confirm──► confirmed  (job created/updated, confirmed fields → human)
    │
    ├──edit + confirm──► confirmed  (edited fields → human)
    │
    └──dismiss──────────► dismissed (never resurfaces)
```

---

## 4. User journeys

### 4.1 Journey A — First run *(workflow 1 + 2)*

**Goal:** from a cold start to a populated pipeline.

| # | Student | System | Screen |
|---|---|---|---|
| 1 | Opens the app | No session → `/connect` | Connect |
| 2 | Reads what will be accessed | States plainly: read-only Gmail access, no password stored, no email content kept. `lock` icon. | Connect |
| 3 | Clicks "Continue with Google" | Redirect to Google consent, scopes `openid email gmail.readonly`, PKCE | Google |
| 4 | Grants access | Callback verifies `state`, exchanges code, encrypts refresh token, creates session | — |
| 5 | — | Initial scan begins: most recent 2,000 messages or 180 days | Pipeline (scanning) |
| 6 | Watches progress | Live count: "Reading your inbox — 341 of 1,204 emails". Applications appear as they are found. | Pipeline |
| 7 | — | Scan completes: "612 emails read · 23 applications found · 4 need review" | Pipeline |
| 8 | Sees the ranked pipeline | Most urgent first | Pipeline |

**Design notes.** The scan is **progressive, not blocking** — rows appear as they classify.
A student watching an empty spinner for two minutes on first run is the worst possible first
impression, and the count is honest work-in-progress rather than a fake progress bar.

If step 4 is denied → return to Connect with "GradTracker needs read access to your Gmail to
build your pipeline. Nothing is sent and nothing is stored." Never a dead end.

### 4.2 Journey B — Daily check *(workflow 4, the primary journey)*

**This is the journey SM-4 measures.** It must work in seconds.

1. Student opens `/pipeline`.
2. Stat strip: live applications · due this week · needs review · emails read.
3. Ranked table renders — deadline proximity → stage progression → staleness → name.
4. **The top row is the answer to "what do I need to do next."** No searching, no sorting,
   no filtering required.
5. Student reads the next action on that row and acts.

**Ranking** *(pure function, [implementation.md §7.9](implementation.md))*:

```
1. urgency bucket   overdue → 0 | ≤2d → 1 | 3–7d → 2 | 8–14d → 3 | none/>14d → 4
                    follow-up-required is capped at bucket 3
2. stage rank       descending — offer 4, interview 3, assessment 2, applied 1
3. last_event_at    ascending — stalest first
4. company          A–Z — stable, reproducible ordering
```

Filters (stage chips, Active/Archived tabs) **re-filter but never re-sort**. Urgency order
is the product's one opinion and it is not overridable — a student who sorts by company name
has recreated their spreadsheet.

### 4.3 Journey C — Correct the AI *(workflow 6)*

**Goal:** fix a wrong value without leaving the dashboard, permanently.

1. Student notices "Deloite" in the company column — the field shows a `ConfidenceMeter`, so
   it is AI-extracted.
2. Clicks the field → becomes an `Input` in place, pre-filled, focused, text selected.
3. Types "Deloitte", presses `Enter`.
4. Optimistic update. `PATCH /api/jobs/:id`.
5. Server validates, writes the value, sets provenance `source = 'human'`, clears confidence.
6. Field returns to display type. **The meter is replaced by an "Edited" tag.** Toast:
   "Company updated".
7. On the next sync, an email carrying "Deloite" again **does not overwrite it** — and
   because human values are the matching key, that email lands on the corrected job.

**Escape** cancels and restores the original. **Validation failure** keeps focus, shows the
error beneath, and never discards what was typed. **Request failure** rolls back the
optimistic update and shows an error toast with "Try again".

### 4.4 Journey D — Review queue *(workflow 6, low-confidence path)*

**Goal:** the model asks instead of guessing.

1. Sidebar shows "Needs review · 4".
2. Student opens `/review`. Header: "These emails look like applications. Confirm what
   GradTracker read, or dismiss the ones that aren't."
3. Each item shows the extracted fields with per-field confidence and provenance ("Detected
   from a Greenhouse email · 18 May").
4. Three actions:
   - **Confirm** — creates or updates the job; confirmed fields become `human`.
   - **Edit then confirm** — inline edit first; edited fields become `human`.
   - **Not an application** — `dismissed`; never resurfaces.
5. The item animates out; focus moves to the next; the sidebar count decrements.
6. Empty queue → `EmptyState`: "Nothing to review. GradTracker was confident about
   everything it found." with a `mail-check` icon.

**Why fields land here individually.** A student confirming a company but not a deadline
should be able to say so — per-field confidence and per-field confirmation is what makes
this a review rather than an all-or-nothing accept.

### 4.5 Journey E — Manual sync *(workflow 7)*

1. Student clicks "Sync inbox" in the top bar.
2. Button enters a loading state; the label becomes "Syncing…".
3. `POST /api/sync` → incremental fetch from `history_id`, pipeline over new mail only.
4. Rows update in place. New jobs animate in. Changed stages update their badge.
5. Toast: "3 new emails · 1 new application · 1 stage change".
6. Timestamp becomes "Synced just now".
7. Nothing new → "No new mail since 09:14". **Say nothing happened; never fake activity.**

Sync is non-blocking: the pipeline stays readable and interactive throughout.

### 4.6 Journey F — Withdraw

1. Student opens a job's detail panel, clicks "Withdraw".
2. `Dialog` confirms: "Withdraw your Deloitte application? It moves to Archive and stops
   appearing in your pipeline."
3. Confirm → `stage = 'withdrawn'`, `status = 'archived'`, provenance `human` (so no future
   email revives it).
4. Row leaves the Active tab. Toast with **Undo** for 8 seconds.

Withdraw is the only stage a student sets directly, and the only destructive-feeling action
in the MVP — hence the dialog and the undo.

---

## 5. Screen specifications

### 5.1 Connect

**Purpose:** earn permission by being explicit about what is and is not accessed.

Wordmark · one-line value statement ("Twenty applications, one ranked list of what's due
next") · a permissions block with `lock`: *reads your Gmail, read-only* / *never stores your
password* / *never keeps email content* · "Continue with Google" (primary, pill) · a link to
what is stored.

**Empty of decoration.** No mesh — [design.md §3.5](design.md): product surfaces never get
the mesh.

### 5.2 Pipeline *(the product)*

| Region | Content |
|---|---|
| Stat strip | Four `StatCard`s: live applications · due this week · needs review · emails read |
| Tabs | Active · Archived |
| Filter chips | Stage filters, multi-select, showing counts |
| Table | Ranked `ApplicationRow`s: avatar, company, role, `StageBadge`, next action, `DeadlinePill`, chevron |
| Row separation | A single bottom hairline — never card gaps |

Rows are keyboard-navigable buttons. Selected rows take `--surface-selected`.

### 5.3 Detail panel

Company and role (both editable) · `StageBadge` with a stage `Select` · extracted fields
with `ConfidenceMeter` or "Edited" tag · deadline (editable, `DeadlinePill`) · next action
(editable) · **timeline** of `email_events` (stage, date, sender domain, "View in Gmail")
· "Withdraw".

**The timeline is provenance made visible.** It is how a student answers "why does it think
this?" — and it works precisely because event rows are metadata-only, so showing the history
never means showing stored email content.

### 5.4 Needs review

Header explaining the ask · one card per pending item with per-field confidence and source ·
Confirm / Edit / Not an application · empty state as §4.4.

### 5.5 Settings

Gmail connection (account, last sync, Disconnect) · detection (review threshold slider,
described as "How sure GradTracker must be before adding an application automatically") ·
follow-up reminder thresholds · profile · theme.

**Disconnect** confirms via `Dialog`, deletes the encrypted refresh token and `sync_state`,
and **keeps the pipeline data** — the student's corrections are theirs. State this in the
dialog.

---

## 6. Empty states

Every one admits the gap rather than filling space ([design.md §9](design.md)).

| Screen | Condition | Content |
|---|---|---|
| Pipeline | Never synced | `mail-search` · "No applications yet" · "Connect your inbox and GradTracker will find your applications." · "Scan inbox" |
| Pipeline | Synced, none found | `mail-search` · "No applications found" · "GradTracker read 612 emails and didn't find any job applications. If that's wrong, lower the detection threshold in Settings." |
| Pipeline | All filtered out | `layers` · "No applications match these filters" · "Clear filters" |
| Archived tab | Empty | `archive` · "Nothing archived" |
| Needs review | Empty | `mail-check` · "Nothing to review" · "GradTracker was confident about everything it found." |
| Detail timeline | One event | The single event — never "no history" |
| Calendar / Archive | Always | "Not built yet" — deliberately blank |

The "synced, none found" state routes the student to the threshold rather than leaving them
stuck, because that state most often means the gate is too high.

---

## 7. Error states

| Error | Trigger | Behaviour | Recovery |
|---|---|---|---|
| OAuth denied | Student declines consent | Return to Connect with an explanation | "Continue with Google" again |
| OAuth `state` mismatch | Possible CSRF | Reject, no session, generic error | Restart sign-in |
| Token revoked | Access revoked in Google settings | Banner: "GradTracker lost access to your inbox." Pipeline data stays visible. | "Reconnect" |
| Gmail rate limit | 429 / `rateLimitExceeded` | Backoff and retry silently. If exhausted: "Gmail is rate-limiting us. Your sync will resume shortly." Cursor unmoved. | Automatic; manual retry available |
| Gmail quota exhausted | Daily quota | "Gmail's daily limit is reached. Try again tomorrow." Cursor unmoved. | Next day |
| `historyId` expired | 404 | Silent bounded full rescan. "Catching up on your inbox…" | Automatic |
| Classifier unavailable | Anthropic 429 / 529 | Emails left unprocessed, not marked read. "Some emails couldn't be classified. They'll be retried on the next sync." | Next sync |
| Malformed LLM output | Zod validation fails | One retry, then drop with a logged error. Never persist a partial. | Next sync retries |
| Sync already running | Concurrent `POST /api/sync` | 409. Button shows in-progress state instead of erroring. | Wait |
| Sync crash mid-run | Process death | Cursor unmoved. `state = 'failed'` on restart. **No email lost.** | Next sync re-reads |
| Validation failure on edit | Bad field value | 400 with the field name. Input keeps focus and the typed value; error beneath. | Correct and resave |
| Edit request fails | Network / 500 | Roll back the optimistic update, error toast with "Try again" | Retry |
| Job not found | Deep link to a deleted job | "That application no longer exists." → pipeline | — |
| Cross-user access | `:id` belongs to another user | **404, never 403** — existence is not disclosed | — |
| Session expired | Cookie expired | Redirect to Connect preserving the intended route | Sign in → return to that route |
| Offline | Network unavailable | Banner "You're offline." Cached pipeline stays readable; edits queue and flush on reconnect. | Automatic |

---

## 8. Edge cases

| Case | Behaviour |
|---|---|
| Two applications, same company, different roles | Two jobs — role similarity below the 0.6 Dice threshold separates them |
| Same role, company renamed mid-process ("Deloitte Digital" → "Deloitte") | Student corrects company once; **the human value becomes the matching key** and later emails land correctly |
| Rejection arrives before the confirmation email | `rejected` applies from any stage; the confirmation cannot regress it |
| Interview email arrives after an offer | Forward-only rule: stage stays `offer` |
| Deadline in the past at ingestion | Stored as-is. `DeadlinePill` renders overdue (bucket 0), so it ranks first — an already-missed deadline is exactly what the student most needs to see |
| Email with no deadline | `deadline_at` null; `DeadlinePill` renders chrome-less; job ranks in bucket 4 |
| Ambiguous relative deadline ("by Friday") | Resolved against the email's `received_at`, not today, with the current date supplied to the prompt |
| Two emails for one job in one sync | Processed in `received_at` order so stage advances correctly |
| Duplicate `gmail_message_id` | UNIQUE constraint — silent no-op. Re-processing is always safe |
| Student edits a field mid-sync | Provenance check happens inside the transaction; the human write wins regardless of ordering |
| Student edits stage, then a later email suggests another | Human lock holds. Stage never changes again without the student |
| Job with every field human-verified | Pipeline still records `email_events` for the timeline but writes no fields |
| Confidence exactly at the threshold | `>=` accepts — the threshold is the accept boundary |
| Student lowers the threshold in Settings | Applies to future syncs only. Existing dismissed items stay dismissed |
| Review item dismissed, same email re-fetched | UNIQUE constraint prevents re-queueing |
| 200+ applications | Table virtualises past 50 rows. Ranking is unaffected |
| Inbox with zero application emails | "Synced, none found" empty state (§6) |
| Student signs in with a different Google account | Separate `google_sub` → separate user → separate pipeline. No merge |
| Two browser tabs open | Last write wins; the stale tab's next request returns fresh data and re-renders |
| First scan interrupted by a closed tab | Server-side and continues. Progress resumes on return |
| Clock skew / timezone | All timestamps stored UTC (`timestamptz`). The client sends its IANA timezone with every pipeline request; **the server computes `daysLeft` and ranks with it, and returns `daysLeft` on each job** (C2). The client renders that value and never recomputes it — one clock governs ranking and display, so a row cannot read "2 days" while sitting in the 3–7 day bucket |

---

## 9. Loading and feedback

| Situation | Treatment |
|---|---|
| Initial pipeline load | Skeleton rows, correct height — no layout shift when data arrives |
| First scan | Progressive: rows appear as classified, with a live honest count |
| Manual sync | Non-blocking. Button loading state; the table stays interactive |
| Inline edit | Optimistic, with rollback on failure |
| Confirm review item | Optimistic; item animates out; count decrements |
| Withdraw | Optimistic with an 8-second undo |
| Any mutation | `Toast`, one line, sentence case, no trailing period |
| Long operation (>2s) | Progress with a real number, never an indeterminate spinner alone |

**No fake progress.** If the system does not know how long something takes, it says what it
is doing and counts what it has done. This is [P5](masterplan.md) applied to loading states.

---

## 10. Journey-to-requirement traceability

| Journey | Workflow | Success metric |
|---|---|---|
| A — First run | 1, 2 | SM-5 (OAuth, no credentials), SM-6 (no raw content) |
| B — Daily check | 4 | **SM-4** (one screen, no searching), SM-8 (responsive) |
| C — Correct the AI | 6 | **SM-7** (editable, persistent, distinguishable) |
| D — Review queue | 6 | SM-7, SM-2 (false negatives surfaced rather than silently dropped) |
| E — Manual sync | 7 | SM-1, SM-3 (classification and deadline extraction in production) |
| F — Withdraw | 3 | Stage integrity |

Every journey exists to satisfy a requirement. A screen that serves no journey is not in
the MVP.
