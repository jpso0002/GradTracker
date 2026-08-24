# GradTracker — Revision Plan

**What changes in the codebase, and why.** Derived from the DS-10 team meeting minutes of
**19 August 2026** (`meeting_s2m1_meeting_minutes.pdf`). This document covers **codebase
revisions** and **the classifier lane**. It deliberately does *not* cover the assessment
artefacts the minutes also assign — RTM condensation, risk register wording, Kanban items
and pitch slides live with their owners, not in this repository.

**Companion docs:** [masterplan.md](masterplan.md) (why) · [tasks.md](tasks.md) (order) ·
[implementation.md](implementation.md) (how) · [decision-record.md](decision-record.md)
(choices) · [rules.md](rules.md) (standing rules)

| | |
|---|---|
| **Team** | DS-10 — William Moreton, Jordan Psomas, Athan Vass |
| **Source meeting** | Wednesday 19 August 2026, 6:07 PM, Zoom. Chair and minutes: William |
| **Next meeting** | Wednesday 2 September 2026, 5:30 PM, Zoom |
| **Written** | 24 August 2026 |

---

## 0. The thing to say out loud first

**GradTracker cannot currently classify an email on its own.**

Every other part of the pipeline is real and tested — pre-filter, matching, stage
progression, provenance, ranking, retention boundary. The classifier is not. Only
`fake.ts` and `prompt.ts` exist in `packages/server/src/adapters/classifier/`; there is no
live adapter. The inbox demo works because the 32 emails were classified **in-session by a
human-driven model** and written to a harvest file that the pipeline then replayed.

Two consequences, and they point in opposite directions:

- **For the mid-semester pitch this is survivable.** The minutes are explicit (@7 min 30
  sec) that the pitch is about project management and progress — milestone progress,
  methodology adaptation, risk management, the updated RTM — *not* the product itself.
- **For the final demo it is the hole everything else sits on.** It also means the risk
  register's "misclassification of emails" critical risk is currently **unmeasurable**: you
  cannot misclassify if you are not classifying.

This makes **blocker B3 — no Anthropic API key** — the single highest-leverage item in the
project, at roughly **$1.30**. Tasks A2 and A3 below are both downstream of it, and so is
any honest accuracy claim in the pitch.

---

## 1. Classifier lane *(owner: Jordan)*

The minutes assign Jordan "the classifier and its fine-tuning" (@23 min 30 sec), and Athan
identified it as "the single most important step" (@12 min 05 sec).

### A1 — Correct the terminology before it reaches the RTM ⚠️ *do this first*

The minutes record the goal as **"fine-tuning the classification model"**. Taken literally
that is not deliverable: **Claude models do not support customer fine-tuning through the
API.** If "fine-tune the model" is written into the condensed RTM as a requirement, the
team has committed to something it cannot do, and a marker checking requirement-by-
requirement will find it.

What *can* be tuned — all of it real engineering, all of it already scaffolded:

| Lever | Where it lives | Status |
|---|---|---|
| Prompt design | `adapters/classifier/prompt.ts` | Version-stamped, six stage definitions, injected date, explicit hard-negative categories |
| Few-shot examples | drawn from `fixtures/` | Corpus exists; selection not yet tuned |
| Escalation ladder | `domain/classify/escalate.ts` | Built — Haiku first, Sonnet on low confidence |
| Confidence threshold | `DEFAULT_REVIEW_THRESHOLD = 0.75`, `ESCALATE_BELOW = 0.6` | Chosen by argument, never by measurement |

**Suggested RTM wording:** *"Classification accuracy ≥95% on a labelled corpus, achieved
through prompt design, few-shot selection and confidence-threshold tuning."* Outcome-stated,
measurable against the existing harness, and honest about method.

This is the cheapest correction in the entire plan and the window closes on **25 August**.

### A2 — Build the live Claude classifier *(T7.3)* — blocked on B3

One adapter behind an interface that already exists. `messages.parse()` with the shared Zod
schema, Haiku 4.5 default, Sonnet 5 escalation, retry on 429/529.

The architecture was built for precisely this substitution: the ESLint port-boundary rule
already blocks `@anthropic-ai/sdk` from being imported anywhere outside `adapters/`, and
`EmailClassifier` is the only surface the pipeline knows about. Nothing downstream changes.

### A3 — Run the live benchmark *(T2.8)* — blocked on B3

`npm run accuracy -- --live --model=<id>` across both models. This is the only way to settle
**decision D16** (Haiku-vs-Sonnet) with evidence rather than pricing estimates, and it
produces a real accuracy figure with a Wilson confidence interval — a far better thing to
put in a pitch than an unqualified percentage.

### A4 — The classifier test-case action item is largely already done

The minutes assign *"all members to collate a list of appropriate test cases for the
classifier"* (@12 min 55 sec). **Raise at the next stand-up that this substantially exists**,
so two other people do not rebuild it:

- **80 labelled fixtures** — 55 positive / 25 negative, all six stages, four ATS domains,
  26 carrying explicit deadlines in eight distinct phrasings
- **15 hard negatives** — 8 name companies the student has live applications with; one is
  sent from the same `greenhouse.io` domain as genuine updates; 6 carry deadline language.
  Neither company name, sender domain nor deadline text is sufficient to classify.
- **An accuracy harness** that gates CI and exits non-zero below 95% / 80%
- **~32 real labelled emails** from the 18 August harvest

This answers directly the TA's stated concern about **testing data and data quality**
(@11 min 55 sec) — the risk William is adding to the register.

**The genuine gap is T8.3: 300 real labelled emails.** At n=80 the Wilson interval spans
±4.6 points, so 96.3% and 91% are not distinguishable by this corpus. That limitation is
worth stating in the pitch rather than hiding: it demonstrates the team understands what its
own numbers do and do not prove.

---

## 2. Codebase revisions

### B1 — Matching: the Macquarie merge 🔴 *needs a team decision*

**Observed on real data, 18 August.** Two genuinely separate applications —
`Graduate Program 2027 — Technology` (12 Mar) and `Graduate Program 2027 — Data (Sydney)`
(21 May) — merged into one job.

`findMatch` requires an exact normalised company match plus **either** role similarity
**or** a shared sender domain. Both emails came from `recruitment.macquarie.com`, so the
domain arm fired even though the roles are plainly different.

This contradicts the project's own recorded rule that *every ambiguous case creates a new
job*, and it maps directly onto the register's **"misclassification of emails"** critical
risk (@11 min 34 sec).

**Proposed change:** a shared sender domain is not sufficient when role similarity is
**actively low**, as distinct from merely unknown. A null-vs-null role comparison should
still fall back to the domain; a low-scoring comparison should not.

This is a threshold decision about product behaviour, not a defect fix — hence a team call
rather than a silent change. Note the related risk: `criteriacorp.com` sends assessment
invites for KPMG, PwC **and** nbn, so sender domain is ambiguous across employers generally,
not just within one.

### B2 — Requirements the team has committed to keeping

Team decision, 24 August: **keep OAuth, accessibility and responsiveness in the RTM**,
with OAuth's non-implementation justified rather than the requirement removed.

| Requirement | Consequence in this repo |
|---|---|
| **Responsiveness** | **T5.8 must actually be built.** Acceptance is that ranking is *identical* at 375px with 44px touch targets — SM-4 ("one screen") is not a desktop-only promise. |
| **Accessibility** | design.md §10 states the standard but **nothing enforces it**. Needs a real task: keyboard-navigable rows, visible focus rings, colour never the only signal. Currently untested. |
| **OAuth 2.0** | Stays in the RTM, marked deferred **with justification**. T4.1–T4.3 remain descoped. |

**On the OAuth justification.** The TA's condition (@14 min 00 sec) was that local hosting is
acceptable *"provided the reasoning is documented convincingly in the RTM"* — so the
justification is itself a deliverable, not a footnote. The available reasoning is strong and
external, not a matter of convenience:

- `gmail.readonly` is a Google **restricted** scope. Production verification requires a paid
  third-party security assessment (recorded as defect **C6**), which a university unit with
  no provided budget cannot obtain.
- Test-user mode caps at 100 users, so even an approved app could not be publicly launched
  as originally specified.
- The demo track already substitutes a real Gmail read via the team's own connector, so
  **no capability is lost** — only the hosted auth round-trip.

**Contingency.** If the tutor rejects the deferral at sign-off, implementing T4.1–T4.3 is
roughly a week: OAuth with PKCE and verified `state`, sessions with `httpOnly`/`secure`/
`sameSite`, AES-256-GCM refresh-token encryption at rest, plus T4.7's security suite. Worth
knowing that number *before* being asked for it.

### B3 — Finish Phase 5, then Phase 6

| Task | State | Note |
|---|---|---|
| **T5.7** empty and error states | ◐ Partial | Four built (empty, filtered-to-nothing, offline, error). Remainder of app-flow.md §6 and the disconnected banner outstanding. |
| **T5.8** responsive | ☐ | Now a committed requirement — see B2. |
| **T5.9** Documentation Center | ☐ | Renders `docs/` in-app so the two cannot drift. |
| **T6.3** review queue view | ☐ | **Highest demo value.** The sidebar shows "Needs review: 4" and clicking it reaches a placeholder. The API behind it is complete, including T4.8's detected company and role. |
| **T6.1, T6.2, T6.4, T6.5** | ☐ | Inline editing, correction flow, settings. |

### B4 — Small honesty fixes

- **`sync_state.emailsReadTotal` is never written by the harvest**, so the dashboard reads
  "Emails read: 0" immediately after ingesting 32 emails. Visible on the demo.
- **`POST /api/sync` returns 501** and T4.6 stays open until T3.8 (the sync orchestrator)
  lands. Deliberate — a 202 that starts nothing is worse than an honest refusal — but it is
  a visible gap if anyone clicks it.

---

## 3. Sequencing

| When | What | Blocked on |
|---|---|---|
| **Tue 25 Aug** | RTM condensed to 7–10 requirements. **Fix the fine-tuning wording (A1) here** — cheapest possible moment. | The RTM itself (Google Drive) |
| **This week** | Individual sign-off; rough-draft pitch slides. Raise **voice interaction** and **local-vs-cloud** with the tutor — both assigned to Jordan. | — |
| **Before 2 Sep** | Obtain the API key → unblocks A2 and A3. Team decision on **B1**. Bring the fixture corpus to a stand-up (**A4**). | B3 (key) |
| **Wed 2 Sep** | Team meeting + TA sign-off (two weeks from 19 Aug). | — |
| **Mid-sem pitch** | **Date not recorded in the minutes — needs pinning down.** | — |

---

## 4. Open questions

1. **The RTM** — the 19 current requirements are in Google Drive. Condensation is blocked
   until they are in hand.
2. **B1** — tighten the matching rule, or accept occasional merges as visible and
   correctable? Team call.
3. **The mid-semester pitch date.**
4. **Is the Anthropic API key obtainable?** If not, the plan changes materially: the final
   demo remains a replay of pre-computed classifications, and that must be **declared in the
   limitations document rather than discovered by an assessor.**
5. **Voice interaction** — absent from the RTM and from every document in this repository.
   Team view is that it is not needed; Athan flagged the risk of being marked against the
   original brief (@21 min 30 sec). Jordan to confirm with the tutor. No code implication
   either way until that answer arrives.

---

## 5. What this plan does not cover

Assigned in the minutes, owned outside this repository:

- RTM condensation itself — all members, by 25 August
- Risk register: raising scope-creep impact, adding the testing-data / data-quality risk —
  William
- Kanban items targeting the mid-semester pitch requirements — all members
- Pitch narrative and slides — all members
- Front-end wireframes — William
- Backend / client-server research — Athan

The minutes also note (@12 min 55 sec) that **any code or functionality change must be
recorded in the shared document as it is made**. In this repository that obligation is
already met by [changelog.md](changelog.md) and [rules.md](rules.md); what is needed is a
pointer from the team's shared document to these, so there is one trail and not two.
