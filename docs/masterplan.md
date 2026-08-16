# GradTracker — Masterplan

**The product's North Star.** Every other document in `/docs` derives from this one. If a
proposed feature cannot be traced back to a user need or a success metric on this page, it
does not get built.

| | |
|---|---|
| **Project** | GradTracker — AI-powered graduate recruitment tracking dashboard |
| **Unit** | FIT3163, Monash University |
| **Team** | 3 students, 12-week semester |
| **Client / supervisor** | FIT3163 teaching team |
| **Status** | Pre-implementation. Architecture agreed 16 August 2026 (see [decision-record.md](decision-record.md)) |
| **Companion docs** | [implementation.md](implementation.md) · [design.md](design.md) · [app-flow.md](app-flow.md) |

---

## 1. Vision

> **Twenty applications, one ranked list of what's due next.**

A student in an active recruitment cycle opens one screen and immediately knows what to do
next. No inbox searching, no spreadsheet maintenance, no holding twenty parallel processes
in their head.

GradTracker reads the student's Gmail, decides which emails are about job applications,
extracts the company, role, stage, deadline and next action from each one, and renders the
result as a single pipeline ranked by urgency. The student's job changes from *reconstruct
my own status* to *act on what's at the top*.

### Core purpose

Recruitment status already exists — it is just scattered across an inbox in a format built
for communication rather than tracking. GradTracker does not ask the student to enter data.
It **reads the signal that is already there and gives it structure.**

That is the whole product thesis. Every feature either extracts structure from existing
signal, or presents that structure in priority order. Anything that asks the student to
type in data they already received by email is a failure of the thesis.

---

## 2. The problem

A student running 20+ concurrent applications receives every meaningful signal about them —
confirmations, online assessment invites, interview invites, offers, rejections, follow-up
requests — into a single Gmail inbox, interleaved with unrelated mail.

**Four concrete failures follow:**

1. **Status is unknowable without manual work.** Answering "where am I up to with
   Deloitte?" means searching and reading threads. Repeated every session.
2. **Deadlines are invisible.** "Complete your online assessment by Friday 23 May" is buried
   in an email body. Nothing surfaces it. **An expired online assessment window cannot be
   recovered** — this is the single most costly failure in the entire problem space.
3. **The spreadsheet workaround fails under load.** A manually maintained tracker is only
   accurate if updated after every email. It breaks down exactly when volume and stakes
   peak.
4. **No existing tool closes the gap.** Generic to-do apps and job trackers require full
   manual entry, so the cognitive load stays with the student. Nothing detects application
   emails automatically.

**Measurable cost:** repeated manual inbox searching per session; applications silently
going stale because a follow-up was overlooked; sustained cognitive load from holding a
20-application pipeline in working memory.

---

## 3. Target users

### 3.1 Primary — Student in an active application cycle
*Commerce and CS students at Monash. Daily to several times weekly during peak season.*

| Needs | Implication for the product |
|---|---|
| See every live application ranked by urgency, in one screen | Ranked pipeline, no pagination above the fold, sorted by deadline proximity → stage progression → staleness |
| Know the single next action for each application | Every row carries one imperative, specific next action string |
| Never search the inbox to reconstruct status | Extraction must be automatic and reliable enough to trust |
| Know what is about to expire | Deadline urgency computed against today, never frozen at ingestion time |

**Defining constraint:** this user is busy, stressed, and checking between classes. The
product gets *one screen* and a few seconds to be useful.

### 3.2 Primary — Student reviewing and correcting AI output
*Same person, different mode. Roughly weekly, whenever extraction looks wrong.*

| Needs | Implication for the product |
|---|---|
| Fix any AI-extracted field without leaving the dashboard | Inline editing on every extracted field |
| See at a glance which values are AI-extracted vs human-verified | Persistent visual distinction, not a hover state |
| Have corrections survive future syncs | Field-level provenance enforced on the write path |

**Defining constraint:** trust is the product's scarcest resource. One overwritten
correction teaches the student that the tool cannot be relied on, and the spreadsheet comes
back.

### 3.3 Secondary — FIT3163 teaching team *(supervisor / client / evaluator)*
*At milestone reviews.*

Needs **requirements traceability**: evidence that classification accuracy, deadline
detection, and security behaviours are *demonstrably met and testable*, not asserted. Every
success metric in §5 therefore maps to an automated test or a documented verification
procedure, and §5 names which.

### 3.4 Out of scope — University early careers services
*Would consume anonymised aggregate pipeline data.*

**Build nothing for this.** The data model must simply not preclude it: every job row
carries a stable anonymous user key and there is no free-text notes field, so a future
aggregate query never has to touch identifying data. That is the entire accommodation.

---

## 4. Value proposition

**For** a university student running 20+ concurrent graduate applications
**who** cannot track their pipeline without constant manual inbox searching and spreadsheet
upkeep,
**GradTracker is** a recruitment dashboard that reads their Gmail and builds the pipeline
for them,
**unlike** spreadsheets and generic job trackers that require the student to enter
everything by hand,
**it** extracts company, role, stage, deadline and next action automatically, ranks every
application by urgency, and lets the student correct anything the AI got wrong — permanently.

### Why the alternatives fail

| Alternative | Why it loses |
|---|---|
| Manual spreadsheet | Accuracy depends on discipline exactly when discipline is scarcest |
| Generic job trackers (Teal, Huntr) | Manual entry — the cognitive load never leaves the student |
| To-do apps | No concept of application stage; nothing detects the deadline |
| Gmail labels and filters | Static rules cannot read "complete your assessment by Friday" out of prose |
| Doing nothing | Missed assessment windows, which are unrecoverable |

### The defensible core

Two things, together:

1. **Automatic extraction** — no manual entry, which is what every competitor requires.
2. **Correction that persists** — the AI is never treated as final, which is what makes
   automatic extraction safe to rely on.

Either alone is a worse product. Extraction without correction is untrustworthy;
correction without extraction is a spreadsheet.

---

## 5. Success metrics

Each metric names its verification method. **"Owning test"** is the artefact shown at
milestone review. This table *is* the requirements traceability matrix.

| # | Success criterion | Target | Verification | Owning test |
|---|---|---|---|---|
| **SM-1** | Classification of job-application vs non-job-application email | **≥95% accuracy**, precision and recall reported separately | Held-out manually labelled corpus of graduate recruitment emails | `npm run accuracy` — fails CI below threshold |
| **SM-2** | False negatives (a real application email missed) | Tracked and reported explicitly as a first-class number | Same harness, separate counter | `npm run accuracy` — FN count printed and asserted |
| **SM-3** | Deadline surfaced from emails containing explicit deadline language | **≥80%** | Structured test set of known deadline-bearing emails with expected dates | `npm run accuracy` — deadline detection rate |
| **SM-4** | A student with 20+ active applications identifies their most urgent item within one screen, no searching | Top-of-dashboard item is the correct answer to "what next" | Deterministic ranking function tested against fixture pipelines with known correct ordering | `ranking.test.ts` + usability walkthrough at review |
| **SM-5** | Zero credentials stored | OAuth 2.0 only; no user passwords server-side; refresh tokens AES-256 encrypted at rest; HTTPS enforced; input validation on every user-editable field; sessions managed securely | Inspection **and** automated test | `security.test.ts` — asserts no plaintext token persists, middleware behaviour, validation rejection |
| **SM-6** | No raw email content persists beyond the classification processing window | Only structured extracted fields stored | Schema inspection + a test that classifies a fixture then asserts no body or subject substring exists anywhere in the database | `retention.test.ts` |
| **SM-7** | Any AI-extracted field can be corrected; the correction persists across syncs; AI vs human values visually distinguishable at a glance | 100% of extracted fields editable | Provenance write-path test: correct a field, re-run a sync carrying a conflicting value, assert the human value survives | `provenance.test.ts` |
| **SM-8** | Runs in a standard browser with no end-user install; dashboard interactions respond promptly under normal load | Pipeline render and inline edit round-trip under normal load | Manual verification + API response-time assertion on a seeded 25-application pipeline | `performance.test.ts` |
| **SM-9** | Every requirement maps to an automated or documented test | 100% coverage of SM-1…SM-8 | This table, kept current | Traceability doc, Phase 8 |

### Metric honesty — recorded limitation

The fixture corpus authored during development proves the harness works and produces a
first accuracy number. It **cannot** validate the classifier against the real distribution
of a student's inbox, because the fixtures encode the author's assumptions about what
recruitment emails look like.

**SM-1 becomes defensible only once the team hand-labels several hundred real emails.** The
harness is built so that dropping real labelled data in is a directory copy. This
limitation is stated in the project documentation and at review rather than glossed over.

---

## 6. Product principles

Five rules that settle arguments. When a design decision is contested, the higher-numbered
principle yields to the lower.

**P1 — No AI-extracted value is ever final.**
Every extracted field is editable, every correction persists, and low-confidence
extractions are queued for review rather than silently entering the pipeline as fact. The
product asks when it is unsure.

**P2 — Never store what we do not need.**
Email bodies and subjects exist only in memory during classification. The database holds
structured fields, message ids, and metadata. Privacy is a schema property, not a policy
document.

**P3 — Urgency is computed, never stored.**
Deadline proximity and staleness are derived from today's date at render time. A pipeline
left open overnight is not lying by morning.

**P4 — One screen answers the question.**
The top of the pipeline on load is the answer to "what do I need to do next". Features that
require navigating away to answer that question are the wrong features.

**P5 — Describe the model by what it did.**
"Detected from a Greenhouse email", "Needs review", "How sure the model is about this
email". Never magic, never a confidence number without an explanation of what it means.

---

## 7. Scope

### In scope — the MVP

- Google OAuth 2.0 sign-in with Gmail **read-only** scope
- Initial full inbox scan, then incremental sync via Gmail `historyId`
- LLM classification and structured extraction (company, role, stage, deadline, next action)
- Automatic stage assignment and progression
- Ranked pipeline dashboard with stage summary strip
- Derived next-action suggestions and an agenda panel
- Inline correction with persistent field-level provenance
- Confidence-gated review queue for low-confidence extractions
- On-demand sync ("Refresh data")
- Multi-account (each student sees only their own pipeline), no admin layer
- Labelled fixture corpus and the accuracy test harness

### Explicitly out of scope

Listed so they are not re-litigated mid-semester.

| Not building | Why |
|---|---|
| Email sending or replying | Read scope only; sending is a different trust and permission conversation |
| Calendar integration | Real integration cost, no core-workflow benefit inside 12 weeks |
| Multi-user administration, roles, permissions | No stakeholder needs it |
| Analytics for early careers services | Secondary consumer, explicitly deferred (§3.4) |
| Marketing website | Serves no workflow and no success metric |
| Mobile native apps | Browser-based is a stated criterion; responsive web covers it |
| Non-Gmail providers (Outlook, IMAP) | The `GmailClient` port makes it possible later; not now |
| Document or CV storage | Not a tracking problem |

---

## 8. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Real-world accuracy falls short of 95% | SM-1 fails | Build the harness in Phase 2, before the pipeline, so accuracy is measurable from week 3 and there is time to iterate on the prompt. Report precision and recall separately so a fixable weakness is visible. |
| Fixture corpus does not represent real inboxes | Accuracy number is unearned | Stated openly (§5). Team hand-labels real emails as capacity allows; harness accepts them as a directory drop-in. |
| Google OAuth verification limits | Live testing blocked | Unverified apps allow explicitly added test users. Add all three team members early. Demo mode (mocked Gmail) means the build is never blocked on this. |
| LLM API cost exceeds free tier | Development stalls | Haiku 4.5 as the default classifier with escalation to Sonnet 5 only on low confidence. Fixture-backed fake classifier means tests cost nothing. |
| Gmail rate limits or quota errors | Sync fails, data lost | Token-bucket limiter, exponential backoff with jitter, and `historyId` advanced only inside the committing transaction — a crash re-reads, never skips. |
| Three-person coordination over 12 weeks | Integration failures late | Ports and fakes (Phase 2) let front-end, pipeline, and adapters be built in parallel against stable contracts. |
| Scope creep | MVP incomplete at deadline | §7 out-of-scope table is binding. Changes require an entry in the decision record. |

---

## 9. Milestones

Aligned to the phased plan in [implementation.md §12](implementation.md).

| Phase | Deliverable | Evidence at review |
|---|---|---|
| 1 | Schema, migrations, provenance model, seed data | Migrations run clean; seeded pipeline queryable |
| 2 | Ports, fakes, fixture corpus, **accuracy harness** | `npm run accuracy` prints real numbers |
| 3 | Classification pipeline and stage engine | Fixtures flow end-to-end into jobs |
| 4 | API with scoping, validation, security middleware | `security.test.ts` green |
| 5 | Dashboard — pipeline, ranking, summary strip, detail panel | SM-4 walkthrough |
| 6 | Inline correction and review queue | SM-7 demonstrated live |
| 7 | Live Gmail and Claude adapters | Real inbox sync |
| 8 | Traceability document | SM-9 — this table, fully evidenced |

---

## 10. Definition of done

The MVP is complete when **all nine success metrics in §5 pass their named verification**,
the out-of-scope list in §7 has not been violated, and a developer who has never seen the
project can clone the repository, run `npm install && npm test`, and watch every
requirement prove itself without configuring a database, a Google account, or an API key.
