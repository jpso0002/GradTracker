# GradTracker — Revision Plan

**What changes, and why.** Revision 2 — 28 September 2026. Supersedes Revision 1
(24 August), whose open items are all resolved below.

Reconciles the condensed RTM (v3, 24 August) and the team's September meetings against the
repository as it actually stands. Covers **codebase revisions**, the **classifier and
evaluation lane**, and the **RTM amendments** those decisions imply. The RTM itself lives
outside this repository; §4 is written so its owner can apply it directly.

**Companion docs:** [tasks.md](tasks.md) (the Plan of record and every task) ·
[decision-record.md](decision-record.md) (D22–D33, with rejected options) ·
[rules.md](rules.md) (standing rules) · [project-context.md](project-context.md) (full context)

| | |
|---|---|
| **Team** | DS-10 — William Moreton, Jordan Psomas, Athan Vass |
| **Unit** | FIT3162 / FIT3164 / FIT3189 Software Project Part 2 |
| **Inputs** | RTM v3 (24 Aug) · team meetings of 1 and 19 September · repository inspection, 28 Sep |
| **Next checkpoints** | Team meeting 7 October · TA sign-off 9 October — no hard target set for either |

---

## 0. What has not changed since Revision 1

**There is still no live classifier.** `packages/server/src/adapters/classifier/` holds
`fake.ts` and `prompt.ts` and nothing else. Every figure the harness has printed is the
fixture corpus scored against itself — it proves the harness works, not that a model does.

Everything else is built and tested: pipeline, matching, stage engine, provenance, ranking,
retention boundary, API and dashboard. **365 tests pass.** Code last changed 18 August.

What *has* changed is that the classifier moves from "optional" to the critical path:
every ingestion path the team chose on 28 September classifies live (D23).

---

## 1. Revision 1's open items, and how they closed

| Revision 1 item | Outcome |
|---|---|
| **A1** — "fine-tuning" wording must not reach the RTM | ✅ **Resolved in RTM v3.** RQ-03 speaks of prompt design and automated evaluation, not fine-tuning. |
| **A2** — build the live classifier | **Reinstated as T7.3**, now on the critical path (D23). Waits on B3. |
| **A3** — run the Haiku-vs-Sonnet benchmark | T2.8, immediately after T7.3. |
| **A4** — the classifier test cases already exist | Superseded by the full evaluation protocol (D32, §6 below). |
| **B1** — the Macquarie merge | ✅ **Decided:** ambiguous matches go to review with a suggested application (D26, T3.10). |
| **B2** — keep OAuth, accessibility, responsiveness | ✅ **Held in RTM v3:** RQ-01 "Deferred — justified", RQ-09 retained in full. |
| **B3** — finish Phases 5 and 6 | In the build order, with T6.1, T6.3 and T6.4 redefined. |
| **B4** — "Emails read: 0"; `POST /api/sync` returns 501 | Both fixed by the drop-folder sync (D25, T3.8). |
| Open — the RTM | ✅ Condensed to nine requirements, v3, 24 August. |
| Open — the API key | Created, not yet verified. **Blocker B3 reopened.** |
| Open — voice interaction | Absent from RTM v3. If the tutor has not confirmed it is optional, that confirmation is still worth having in writing. |

---

## 2. Decisions taken 28 September

Full reasoning and rejected options are in [decision-record.md](decision-record.md).

| | Decision |
|---|---|
| **D22** | This repository is the single implementation; plans are reconciled against it |
| **D23** | **Hybrid local ingestion, classified live** — connector harvest and Gmail exports (`.mbox`/`.eml`) through one ingest path. Three demo modes, one database each. Hosted OAuth deferred on effort, not cost |
| **D24** | Demo data: real job-board mail in a test inbox, plus **authored** application emails as `.eml`, **marked synthetic** and kept out of the headline figure |
| **D25** | Refresh ingests a **drop folder**; `POST /api/sync` becomes real, with 409 on a concurrent run |
| **D26** | **Ambiguous matches go to review** with a suggested application; that row carries a "Review required" marker |
| **D27** | **Panel edit mode**, Save/Cancel; Save sends only the fields changed and warns on a stale edit |
| **D28** | Review threshold is a **per-user slider**, applying to new mail only |
| **D29** | Calendar and Archive removed from the sidebar |
| **D30** | A search box that **keeps rank order** resolves the old R09 flag |
| **D31** | Not building manual add or a demo login; "jobs to apply for" is post-MVP stretch |
| **D32** | Evaluation dataset protocol — §6 |
| **D33** | Every reported figure carries its Wilson interval; the claim is a point estimate with its interval |

**Two consequences worth stating on their own:**

- **Never ingest one mailbox through both paths.** The connector gives Gmail API ids and
  exports give RFC 822 Message-IDs, so the duplicate protection cannot recognise the overlap.
- **Authored emails must be visibly marked as synthetic in the demo.** Presenting them as
  real mail is the one thing an assessor could fairly call misleading.

---

## 3. What inspecting the repository found

| # | Finding | Fix |
|---|---|---|
| **C10** | Every "Open in Gmail" link in the real-inbox demo is broken: it searches `rfc822msgid:` with a Gmail API id. The test checked the link's shape only. | T7.7 — per-source links, verified by clicking against real Gmail |
| **C11** | A correction setting `rejected` leaves the application on neither tab — the 18 August pipeline bug on a second code path. Latent until T6.1 adds a stage control. | ✅ Fixed by T4.9 |
| **C12** | RQ-03 requires intervals on accuracy, precision, recall and false negatives; only accuracy has one. | ✅ Fixed by T2.9 |
| **C13** | RQ-04 scores every extracted field, but next action has no scoring method. | T2.10 — judged after each run |
| **C14** | The 80 fixtures shaped the prompt, so they are not the held-out set RQ-03 requires. | T8.3 — they become the tuning set |
| **C15** | The docs gave the semester-1 unit code. | ✅ Fixed |
| **C16** | Confirming a review item onto an existing application moves its stage and `lastEventAt` **backwards** and locks all five fields. Found by probe while fixing C11. | T3.11, with T3.10 |

Also found: `users.review_threshold` has existed since T1.4 but **nothing reads it** —
`/api/me` reports the constant and the harvest importer hard-codes 0.75. T4.10 wires it.

---

## 4. Recommended RTM amendments — v4

For the RTM's owner. **No status changes** — all nine stay as they are until the work is
built and verifiable.

| Req. | Amendment | Why |
|---|---|---|
| **RQ-01** | Add to the Notes: *"Testing-mode OAuth for a single demo account was considered and deferred on effort rather than cost. The demo ingests a connector read or user-exported mailbox files, so no credential is ever handled by the system."* Deliverable: add hybrid local ingestion. | The RTM itself cites the free 100-user allowlist, so an assessor can fairly ask why the demo did not use it. Answering first is stronger than being asked. |
| **RQ-02** | Deliverable: *"drop-folder ingestion triggered by the dashboard's refresh control."* Remove "deliberately refuses the request". | D25 makes the on-demand clause buildable locally. |
| **RQ-03** | Add the protocol: tuning set (80 authored + ~40 real) separate from a held-out set frozen before any model run; positives enriched to about half and declared; agreement measured on ~25 double-labelled emails; authored emails excluded from the headline. Replace "≈ $1.30" with *"priced from current rates before the run"*, and note the key exists but is unverified. | D32 and C14. The $1.30 was for 80 emails on one model; a 200–300-email set across two models with tuning runs costs several times that. |
| **RQ-04** | Verification Method: add *"next action judged acceptable or not after each run, reported as an acceptance rate with its interval."* | C13 — free text has no exact answer to compare against. |
| **RQ-05** | Replace the R09 flag with: *"Resolved — a search box narrows the list while preserving the prioritised order (decision D30)."* | The tension was with re-sorting, not filtering. |
| **RQ-06** | Deliverable: *"panel edit interface with Save/Cancel; confidence-gated review queue, including ambiguous matches routed for confirmation with a suggested application and a row marker; per-user confidence threshold."* | D26–D28. |
| **RQ-07** | No change. | Complete and accurately described. |
| **RQ-08** | Notes: the security suite is to be written now for what exists — absence of credentials, validation on every editable field, cross-user isolation — with transport and session clauses added if hosted deployment is resumed. | Matches the Partial status honestly, and makes the Partial actionable. |
| **RQ-09** | Replace *"the design system enforces colour-contrast"* with *"no colour is used outside the design system's token set (enforced by automated test); contrast is verified in the WCAG 2.1 AA audit."* | **Nothing in the repository tests contrast.** An assessor asking to see that check would find none. |
| *Doc control* | Version v4; date; basis — team decisions of 28 September 2026. | — |

---

## 5. Build order

The full table, with task ids and dependencies, is the Plan of record in
[tasks.md](tasks.md). In short:

1. **Fixes needing nothing** — C11 archive bug, remove Calendar/Archive, intervals on every figure
2. **Labelling toolkit and guide** — early, because labelling is human time
3. **Live classifier, then the benchmark** — waits on B3
4. **Hybrid ingestion** — event source and correct links, mailbox reader, unlabelled harvest, one ingest command, drop-folder sync
5. **Ambiguous matches to review**
6. **Phase 6 UI** — panel editing, review queue screen, row marker, settings and slider, search
7. **Non-functional work** — empty states, responsive, accessibility audit, security tests, performance, Documentation Center

**Alongside:** the evaluation dataset (T8.3), from the moment the toolkit exists.

---

## 6. The evaluation dataset

**The key insight:** the 80 fixtures already shaped the prompt, so they are the tuning set by
definition. Every new label can go toward the held-out set.

| Set | Contents |
|---|---|
| **Tuning** | The 80 authored fixtures, plus ~40 real emails |
| **Held-out** | ~200 real emails — about half application emails from the three members' own inboxes, half real negatives weighted toward the hard ones (job-board ads, recruiter marketing, "application" false friends) |
| **Never in the headline** | Authored emails; public datasets (none suitable is known) |

**The final held-out size is set after the inventory** of what the three exports contain —
agreed 28 September, so the team decides from real numbers rather than a guess.

**Order:** export → inventory → decide size → label → double-label ~25 → **freeze** → measure.

### Human effort — rough estimates

| Activity | Who | Time |
|---|---|---|
| Two Gmail searches, label, Takeout export | Each member, own inbox | ~15 min each |
| Read the labelling guide | Each labeller | ~20 min |
| Label ~200 held-out emails | Split between two labellers | ~2–2.5 h in total — negatives ~15 s each, positives ~1 min each |
| Second labelling of the ~25-email overlap | The other labeller | ~20 min |
| Label ~40 real tuning emails | Either | ~30 min |
| Judge next actions after a run | Either | ~10–15 min per 100 applications |

**Roughly 4–5 hours of human time across the team**, most of it the labelling. Tooling cost
falls on the build, not the labellers.

**Statistical honesty, in one line:** at n≈200 and ~97% measured accuracy, the interval runs
roughly 93.6–98.6%. The claim is that point estimate with its interval — not a 95% floor,
which would need ~98% measured.

---

## 7. Still open

| Item | Owner | Blocks |
|---|---|---|
| **B3** — verify the Anthropic API key with one minimal request | Jordan | T7.3, T2.8, the measurement step of T8.3 |
| **B6** — mailbox exports from all three members | All three | T8.3 |
| Held-out size | Team, after the inventory | Freezing the held-out set |
| Cost of the labelled-set runs | Priced from current rates before any run | Nothing — but know it first |

**Steps 1 and 2 of the build order are blocked by nothing.**

---

## 8. Not covered here

Owned outside this repository: editing the RTM itself (§4 is the input), the risk register,
the Kanban board, pitch slides and presentation practice, Figma walkthroughs, and the final
demonstration rubric, which had not been released as of 19 September.

Code and functionality changes are already recorded as they happen, in
[changelog.md](changelog.md) and [rules.md](rules.md). A pointer from the team's shared
document to these keeps one trail rather than two.
