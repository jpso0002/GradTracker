# Final report plan (FIT3164, DS-10)

*2 November 2026. A section-by-section structure for the final written report, built from the
brief (`Final Written Report .pdf`), the marking rubric
(`Marking_rubric_project_report_FIT3162-64_220525.pdf`), the Semester 1 proposal
(`GradTracker_semester 1 report.docx.pdf`) and this repository. The team writes the prose in
the edit-logged Google Doc; this file only says what goes where and what backs it up.*

---

## 0. Before anyone writes

| # | Do this first | Why |
|---|---|---|
| 0.1 | Create the Google Doc and share it with all three members. Write **only** in it (no pasting in finished sections from elsewhere). | The brief requires an edit-logged Google Doc; the history is the authorship evidence. |
| 0.2 | Fix two notes in `GradTracker_RTM_v4.xlsx` before it goes in the appendix: RQ-03/RQ-04 say the 80 fixtures are held-out (they are the **tuning** set, D32), and give a $1.30 evaluation cost (it is **about US$15 to 20**, B3). | The RTM is graded evidence (Outcomes, 30 marks). A wrong note costs credibility. |
| 0.3 | Decide authorship per section (table in §12) and put initials on each heading in the Doc. | The Authorship Statement is mandatory (50% penalty if missing). |
| 0.4 | Collect the meeting minutes (s2m4 and the others) and the 6 October transcript into one shared folder. Use them as **evidence of who was allocated what**, not as a record of fact. | The workload discussion in the Critique (§6.4) leans on them. |
| 0.5 | Take the screenshots in §11 from the demo build (`npm.cmd run demo`) using the **sample mailbox only**. | No real inbox content in the report. |
| 0.6 | Agree reference style: **IEEE**, the same as Semester 1, so refs [1] to [15] carry over. | Consistency (References, 5 marks). |

**Stream:** the team is enrolled in **FIT3164 (Data Science)**. The brief asks Data Science
reports to show the data side throughout: where the data came from, how it was labelled and
processed, and how results were evaluated. That thread runs through §3, §4, §5 and §7 below.

---

## 1. Word budget (3,500 maximum, count on the cover)

| Section | Marks | Words | Notes |
|---|---:|---:|---|
| Cover, contents, Authorship Statement | — | 0 | Check with the unit whether the statement counts; plan as if it does not. |
| 1. Introduction | 10 | 300 | |
| 2. Background | 10 | 450 | Two paragraphs only (brief). |
| 3. Outcomes | 30 | 900 | The biggest section; screenshots and RTM go to the appendix. |
| 4. Methodology | 15 | 750 | Diagrams carry much of the weight. |
| 5. Sample code (commentary only) | 5 | 120 | The 50 to 100 lines of code sit in an appendix or figure. Confirm they are outside the count. |
| 6. Critique | 15 | 650 | |
| 7. Conclusion | 5 | 200 | |
| GenAI acknowledgement | — | ~130 | Check whether it counts. |
| **Total body** | | **3,370** | ~130 words of slack. Captions and tables usually count: keep them short. |
| References | 5 | — | |
| Style | 5 | — | Consistent headings, numbered figures, every figure referred to in the text. |

---

## 2. Section 1: Introduction (300 words, 10 marks)

**Job:** what the problem is, who it is for, what was built, and how the report is laid out.

- **The problem.** Graduate applicants run many applications at once, and the updates
  (confirmations, assessments, interview invites, rejections) arrive by email mixed in with
  job alerts and newsletters. Keeping a spreadsheet up to date is manual and gets dropped.
  Reuse one or two figures from the proposal's refs [1] to [3] (Prosple, QILT, Indeed Hiring
  Lab).
- **The aim.** GradTracker reads the student's job-related email, decides which emails are
  about an application they have made, extracts the company, role, stage, deadline and next
  action, and keeps a ranked dashboard of what to do next. The student stays in control:
  unsure results go to a review queue, and their corrections hold.
- **The data science question.** Can a large language model classify and extract from
  recruitment email accurately enough to be trusted, and how would we know? (Sets up the
  evaluation protocol in §4 and the honest Partial status in §3.)
- **Scope at a glance.** 10 requirements (RQ-01 to RQ-10); 5 Complete, 4 Partial,
  1 Deferred (RTM v4).
- **Roadmap sentence** naming sections 2 to 7.

**Evidence:** `docs/project-context.md`, `docs/masterplan.md`, proposal §1.

---

## 3. Section 2: Background (450 words, two paragraphs, 10 marks)

### Paragraph 1: Context (~200 words)
- Graduate recruitment in Australia: high application volumes, multi-stage processes
  (online assessment, video interview, assessment centre), fixed intake windows. Refs [1] to [3].
- Why email is the right data source: it is where every employer's update already lands, so
  no employer integration is needed.
- Who it is for: final-year and recent graduates applying to many programs at once.

### Paragraph 2: Literature and competitors, updated since the proposal (~250 words)
- **LLMs for extraction from text:** carry over Liu (ERE-LLM) [4] and Zhou (chain of thought)
  [5]. **Update:** say that the build uses a single structured-output call rather than the
  proposal's two-stage pipeline, and why (§4.2). Add one or two recent sources on structured
  output or schema-constrained generation *(find and verify; do not cite anything not read)*.
- **Human in the loop:** carry over [6], [7]. Tie to the review queue and the correction rule.
- **Evaluation of classifiers:** Sokolova & Lapalme [11] for precision and recall. **Add**
  Wilson (1927) and Brown, Cai & DasGupta (2001) for why the interval is Wilson's and not
  the normal approximation (D33). Both are real, standard references.
- **Competitors:** Huntr [12], JobShinobi [13], Simplify [14], GradAustralia [15]. One sentence
  on the gap: they track what the user types in or what they applied to through the tool,
  not what arrives by email afterwards. **Update since the proposal:** re-check each one's
  current features before submitting and say what changed, if anything.

**Rubric target:** show that the literature was *updated*, not copied from Semester 1. Name
at least one source that is new.

---

## 4. Section 3: Outcomes (900 words, 30 marks)

**Job:** what was delivered against the requirements, with evidence; what was not and why;
limitations; future work. Screenshots are in Appendix B and the RTM in Appendix A. Refer to
both by figure or row number throughout.

### 3.1 What was built (~200 words)
- A working web app: sign up / sign in (demo accounts, D40), Connect your Gmail (demo inbox,
  D35 to D37), initial scan, the **Applications** dashboard (ranked, with search, D30), the
  **Review** queue (D9, D28), the **Openings** page (D43), Settings with the review-threshold
  slider and Reset demo.
- Live Refresh from a real Gmail inbox over IMAP, read-only, through the same pipeline (D36).
- Figure: dashboard screenshot (Appendix B, B1) with callouts on urgency, stage and
  "Needs review".

### 3.2 Requirements met (~300 words, one table + short commentary)

Table 3.1: requirement, status, how it was verified, evidence.

| RQ | Status (RTM v4) | Verification to cite |
|---|---|---|
| RQ-01 Gmail connection | Deferred | Reworded: no credential in the product DB. The demo inbox shows the flow; Gmail OAuth was not built. |
| RQ-02 Ingestion and refresh | Complete | Duplicate protection tests; live IMAP Refresh in the demo. |
| RQ-03 Application classification | Partial | Pipeline, prompt v3, harness and gates built and tested; **no model measured** (B3). |
| RQ-04 Extraction and deadlines | Partial | Rules and extraction schema built; 95% deadline target **not measured** (B3, B6). |
| RQ-05 Ranked pipeline | Complete | `rank.test.ts`; fixtures with known correct orderings. |
| RQ-06 Corrections and newer mail | Complete | Provenance tests; the "newer email wins" demo (D36). |
| RQ-07 | Complete | *(fill from RTM v4)* |
| RQ-08 | Partial | *(fill from RTM v4)* |
| RQ-09 | Partial | *(fill from RTM v4)* |
| RQ-10 Openings | Complete | 5 route, 6 pipeline, 6 screen tests (D43). |

Supporting numbers, each with where it came from:
- **705 automated tests passing** (+5 todo) across shared, server and client.
- **Performance:** pipeline 8.0 ms per email; edit round-trip 11.2 ms *(state the
  machine and method in one clause)*.
- **Accessibility:** 36 pass, 4 partial, 1 not tested (`docs/accessibility-audit.md`).

### 3.3 Requirements not met, stated plainly (~150 words)
- **The accuracy figures are not measured.** The classifier has been designed and wired for
  Claude Haiku 4.5, escalating to Sonnet below 0.6 confidence, but no API credit was bought
  (B3, about US$15 to 20). In the demo the three live emails are classified by a scripted
  classifier that still passes through the real confidence gate and pipeline.
- **The held-out set is not frozen.** Jordan exported ~120 emails; labelling is pending (B6).
- **Gmail OAuth (RQ-01)** was deferred in favour of a demo inbox.
- Say *why* each happened (cost, time, privacy approvals) and *what was done instead*
  (everything up to the model call is built and tested, so measurement is one step away).

### 3.4 User feedback (~100 words)
- **Students tried it** and said it was intuitive and did what it set out to do: make it
  easier to manage and track current graduate applications. Tutors said they liked the
  presentation.
- Be honest about the method: informal, no structured instrument, *N = [fill in]*
  students. Don't present it as a usability study. One quote, if the team has it in
  writing, with permission.

### 3.5 Limitations (~80 words)
- Confidence is the model's self-rating and has not been calibrated.
- The 80 authored fixtures shaped the prompt, so they cannot measure it.
- Local deployment only; one demo inbox.

### 3.6 Future work (~70 words)
- Buy credit, freeze the held-out set, measure (T8.3, T7.3, T2.8).
- A calibration check of confidence against correctness.
- Gmail OAuth and hosted deployment (D6).
- A structured usability test.

**Rubric target:** every claim in this section is either verified (test, demo, audit) or
openly marked unmeasured. Met and unmet requirements are both discussed.

---

## 5. Section 4: Methodology (750 words, 15 marks)

**Job:** design rationale with diagrams; tools; steps someone else could replicate; how the
data was collected and processed (the Data Science part).

### 4.1 Architecture (~150 words + Figure 4.1)
- TypeScript monorepo: `shared` (Zod schemas), `server` (Express 5, Drizzle ORM, SQLite now
  and Postgres-ready, D1, D2), `client` (React 19, Vite, React Router 7).
- **Ports and adapters (D12):** the classifier and the mailbox are interfaces, each with a
  fake, a scripted and a live implementation. This is what let the whole system be built and
  tested without API credit (D4).
- **Figure 4.1:** architecture diagram, three packages, the two ports, the database.

### 4.2 The classification pipeline (~200 words + Figure 4.2)
- **Pre-filter:** drops the student's own mail, calendar notifications and bounces before any
  model call.
- **One structured-output call (D19)** returns `isApplication`, company, role, stage,
  deadline, next action, confidence and (for non-applications) openings. The question the
  prompt is built around: has this student already applied, or is this email inviting them to?
- **Code gates after the model:** withdrawn, missing company or role, or an ambiguous match
  (D26) all go to review regardless of confidence. Below the student's threshold (default
  0.75, D28) also goes to review.
- **Matching and the stage engine:** one job per company and role; six stages (D10).
- **Field provenance (D13, D36):** each field remembers whether the AI or the student set it;
  a correction holds against older email, and a newer email wins.
- **Figure 4.2:** flowchart from email to dashboard, review queue or Openings.
- **Why this design over the proposal's:** one call is cheaper and simpler than two stages,
  and the schema forces a parseable answer.

### 4.3 Data collection and processing (~250 words + Table 4.1)
This is the core of the Data Science stream. Cover:
- **Tuning set:** 80 authored fixtures, 55 applications across all six stages and 25 not
  (15 hard negatives such as job alerts and "someone viewed your application"), 28 with a
  deadline (D17). Re-dated to the presentation period (D42).
- **Held-out set (D32):** ~200 real emails from the members' **own** inboxes, about half
  applications and half hard negatives. Enrichment is declared (a natural sample is ~98%
  negatives). Frozen with a SHA-256 hash **before any model sees it**. About 25 labelled by
  two people to report agreement.
- **Labelling (D34, `docs/labelling-guide.md`):** labels follow the prompt's rules: from the
  email alone, deadline conventions, company as named.
- **Privacy and retention (D5):** only message id and metadata are kept, never body or
  subject; real email content never enters git; nobody reads another member's inbox.
- **Evaluation (D33):** accuracy, precision and recall separately, each with a **Wilson 95%
  interval**; one or two sentences on why (small n, proportion near 1).
- **Table 4.1:** tuning versus held-out (size, source, purpose, status).

### 4.4 Tools and replicable steps (~150 words)
- Git and GitHub; Vitest; npm workspaces; Drizzle migrations; Figma (Will's design, D41).
- Steps to run: clone, `npm.cmd install`, add `.env` *(names of variables only)*, then
  `npm.cmd run demo`. Point to the README / Mac guide.
- How quality was kept: tests on every change, the decision record (D1 to D43), the
  changelog, the harness as a CI gate (D14).

**Rubric target:** a reader could rebuild the system and repeat the evaluation from this
section; every design choice has a reason and a rejected alternative.

---

## 6. Section 5: Sample code (120 words + 50 to 100 lines, 5 marks)

**Recommended:** `packages/server/src/domain/ranking/rank.ts`, lines 38 to 113
(`daysUntil`, `score`, `compareRanked`, `rankJobs`), about 75 lines, plus its call in
`packages/server/src/routes/jobs.ts` around line 132. It addresses **RQ-05 (Complete)**,
already has full inline docs, is pure (no I/O) and has its own tests.

Commentary to write:
- Which requirement it serves and how the ordering maps to the brief: urgency bucket, then
  stage, then staleness, then company A to Z.
- The timezone point: calendar days in the student's timezone, not elapsed time (defect C2).
- Why the fourth key exists: the same pipeline always renders in the same order.

**Data-science alternative:** `wilsonInterval` and `confusionMatrix` in
`packages/server/src/harness/metrics.ts`, which serve the RQ-03 verification. Stronger for
the stream, but the requirement is Partial, so the code shows *how it would be measured*
rather than a delivered result. Pick one; don't use both.

---

## 7. Section 6: Critique (650 words, 15 marks)

**Job:** how the project was actually carried out compared with the plan; deviations and why;
project management, schedule, communication, workload, working with the supervisor.

### 6.1 Compared with the proposal (~250 words, Table 6.1)

| Proposal (Semester 1) | Final | Why (decision) |
|---|---|---|
| React, Node/Express, Python/FastAPI, MySQL, AWS EC2 | TypeScript end to end; SQLite now, Postgres-ready; local only | One language for one codebase; no hosting cost (D1, D2, D6) |
| Two-stage classify then extract, keyword pre-filter, truncation | One structured-output call; pre-filter kept | Cheaper, simpler, guaranteed schema (D19) |
| Seven stages | Six | Fewer stages that can be read from email (D10) |
| 19 requirements (R01 to R19) | 9, then 10 in the RTM | Merged and made testable; RQ-10 Openings added (D43) |
| R12 and R13: 95% classification and 95% deadline detection (R18 said 85%, which contradicted R12) | RQ-03 95%; RQ-04 deadlines 95% (RTM v3 had lowered deadlines to 80%; v4 restored 95%) | Inconsistency resolved; figures reported as point estimates with intervals (D33) |
| Gmail OAuth with AES-256 encrypted tokens (R01, R19, WBS 2) | Deferred; demo inbox over IMAP | Time and verification; demo still live (D35 to D37) |
| R14: browser access with no local install; R16: HTTPS (AWS EC2) | Runs locally | No hosting (D6); R14 and R16 not met as written |
| Gmail search-query scan of 3 months, historyId sync, 1,500-token truncation | Initial scan of the demo inbox; message-id deduplication; pre-filter | Followed the change of ingestion (D23, D36) |
| GitHub pushes only after unanimous team approval | All pushes from one account | See §6.4 (workload) |
| Model measured | Not measured | No API credit (B3) |
| (not planned) | Review queue, corrections with provenance, demo accounts, Will's restyle, Openings | Added for trust and the demo (D9, D13, D40, D41, D43) |

### 6.2 Project management and schedule (~150 words)
- Plan: hybrid agile, six two-week sprints, Trello, stand-ups, 288 hours.
- What happened: **regular meetings with minutes, plus ad hoc work between them**. Be
  honest that work came in bursts. The commit history shows three clusters: 16 to 18 August,
  28 to 29 September, and 17 to 20 October before the demo.
- What helped: the decision record and task list kept the plan current when it changed.
- The proposal's risk register already named misclassification (R02) and proposed a
  confidence-threshold mechanism: say that this is what became the review queue (D9, D28).
- The proposal's Gantt planned user testing after Sprint 6; what happened instead was
  informal student trials (§3.4).
- What we would do differently: start labelling earlier (D17 said week 3); buy the API credit
  at the start.

### 6.3 Communication and the supervisor (~100 words)
- Meeting cadence, minutes, how decisions were recorded. Meetings are cited **as
  reference**, not as a record of fact.
- Supervisor / TA check-ins and what changed because of them (e.g. the 6 October meeting
  led to the RQ-03 and RQ-04 rewording and the deadline target).

### 6.4 Workload (~150 words)
State plainly:
- Work was allocated in meetings and recorded in the minutes; each member did the work they
  were allocated.
- **All 46 commits come from one GitHub account (jpso0002).** Say why: code was integrated
  and pushed from one machine. Commit authorship therefore does not show who did the work.
  The minutes and the Google Doc edit history do.
- A short table of each member's contributions, taken from the minutes *(team to fill in,
  e.g. Will: Figma design, RQ-05/06; Athan: RQ-01/02, ...; Jordan: ...)*.
- One sentence on what this taught the team about version control (each member should
  commit from their own account).

**Rubric target:** honest about what went wrong and specific about why, with a lesson for
each.

---

## 8. Section 7: Conclusion (200 words, 5 marks)

- Restate the aim and the answer: a working, tested, ranked tracker that keeps the student in
  control, with every component up to the model call verified.
- The one open question: measured accuracy, and exactly what is needed to answer it (credit,
  frozen held-out set, one harness run).
- What the team would build next (one line from §3.6).
- No new material.

---

## 9. GenAI acknowledgement (~130 words, Part B format)

Monash's format: *"I used [tool] to [how used] and [number of iterations/drafts]. I modified
the outputs in [ways]."* One entry per tool, with the URL and why it was chosen. Fill in the
counts honestly; don't estimate if the history can be checked.

| Tool (URL) | Used for | Why chosen | Iterations | How output was changed | Where it appears |
|---|---|---|---|---|---|
| Claude Code (claude.com/claude-code) | Writing and testing code, docs, decision record; this report plan | Works in the repository, runs tests | *[n sessions]* | *[e.g. reviewed every diff; rejected or rewrote ...]* | Codebase; this plan |
| Claude Design | Presentation slides | Matches the deck's design | *[n]* | *[...]* | Final demo deck (not the report) |
| claude.ai | *[drafting / research?]* | | *[n]* | | |
| Figma (Will) | UI design | | *[n]* | | Appendix B screenshots |
| *[any others]* | | | | | |

Also say, in one sentence, that the report's prose was written by the team in the
edit-logged Doc, with AI used for structure and checking (if that is what happened).

---

## 10. Authorship Statement (mandatory, 50% penalty if missing)

Template; fill in once §0.3 is decided:

> **Authorship Statement.** This report was written by [names] in an edit-logged Google Doc.
> Sections were written as follows: Introduction [initials]; Background [initials]; Outcomes
> [initials]; Methodology [initials]; Sample code [initials]; Critique [initials]; Conclusion
> [initials]; References [initials]. All members reviewed the full report. Generative AI use
> is acknowledged in [section].

---

## 11. Appendices

| Appendix | Contents | Source |
|---|---|---|
| A | RTM v4 (after the §0.2 fixes) | `GradTracker_RTM_v4.xlsx` |
| B | Screenshots: B1 dashboard, B2 application detail with a corrected field, B3 Review queue, B4 Openings, B5 Settings threshold slider, B6 sign-up / connect flow, B7 Refresh toast | Demo build, sample mailbox |
| C | Sample code listing (§6) | `rank.ts` or `metrics.ts` |
| D | Test summary (705 passing) and accessibility audit summary | `npm.cmd test` output; `docs/accessibility-audit.md` |
| E | Evaluation protocol and labelling guide summary | D32 to D34; `docs/labelling-guide.md` |
| F | Meeting minutes index (dates, attendees, allocations) | Minutes folder (§0.4) |

---

## 12. Who writes what (agreed 2 November 2026)

| Member | Sections |
|---|---|
| Jordan | 1 Introduction · 3.2 Requirements met and not met · 4.2 steps 1–3 · 4.3 Data collection and processing · Appendices A, D, E |
| Athan | 3.1 What was delivered · 4.1 Architecture · 5 Sample code · 6.1–6.4 Critique · 7 Conclusion · Appendices B, C, F |
| Will | 2 Background · 3.3 User feedback · 3.4 Limitations and future work · 4.2 steps 4–5 · 4.4 Tools and replication · 8 References · Appendix G |
| Everyone | Own line in 6.4 · own entry in 9 · final read-through |

Written into the Google Doc's Authorship Statement.

Semester 1 split for reference: Jordan did the intro, scope, schedule, stack, architecture,
RTM and Gantt; Will did the lit review, the LLM algorithm, data collection and refs; Athan
did the organisation, management process, conclusion, risk register and WBS.

---

## 13. References (IEEE)

- Carry over [1] to [15] from Semester 1. Re-check every URL and access date.
- Add, for §2 and §4.3: E. B. Wilson (1927), *J. Amer. Statist. Assoc.* 22(158), 209–212;
  L. D. Brown, T. T. Cai, A. DasGupta (2001), *Statist. Sci.* 16(2), 101–133.
- Add: W3C, *WCAG 2.2* (2023), for the accessibility audit.
- Add: Anthropic documentation on structured outputs and the models used *(verify the
  current URL before citing)*.
- Add at least one new LLM-extraction or human-in-the-loop paper from 2025 to 2026 *(the
  team finds and reads it; don't cite unread sources)*.
