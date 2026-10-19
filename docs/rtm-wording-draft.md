# RTM wording — draft for the team

*17 October 2026. Proposed changes to RQ-02, RQ-03, RQ-04 and RQ-06 in
`GradTracker_RTM_v3`, from the 6 October meeting and D36. Nothing here is in the RTM until
the team agrees and pastes it in.*

---

## RQ-03 — the 95% target and the confidence slider

**The concern raised:** the RTM asks for "at least 95% accuracy", but the app has a slider
setting how confident the model must be. A marker could read these as contradicting each
other.

**Why they don't:** they measure different things.

| | 95% accuracy | The review threshold (slider) |
|---|---|---|
| What it is | How often the classifier is right | How sure the model must be before an email enters the dashboard without asking |
| Measured when | Once, offline, on a held-out labelled dataset | Applied to every email as it arrives |
| Who sets it | The requirement | The student (default 0.75) |

The threshold is how the product behaves when the model *might* be wrong. It is the
safety net for the remaining 5%, not a replacement for the target. Making the accuracy
"set by the user" would remove the only measurable quality bar on the classifier.

**Current wording:**
> The system shall determine, for each ingested email, whether it relates to a job
> application, achieving at least 95% accuracy on a held-out labelled dataset, with
> precision and recall reported separately.

**Proposed wording:**
> The system shall determine, for each ingested email, whether it relates to a job
> application, and attach a confidence score to each determination. Measured on a held-out
> labelled dataset it was not tuned against, the classifier shall achieve at least 95%
> accuracy, with precision and recall reported separately. In use, a determination below
> the user's confidence threshold shall be presented to the user for confirmation rather
> than asserted as fact (RQ-06).

**Proposed status note:**
> Pipeline, prompt (v2) and accuracy harness built and tested; no model has been measured
> (API access not purchased). In the presentation, classification of the live emails is
> scripted, and they pass through the real confidence gate and pipeline (D36).

---

## RQ-04 — the 80% deadline figure

**The concern raised:** if an email states a deadline, the system should always find it,
so why 80% and not 100%?

**Why not 100%:** it is a measured rate, not a promise per email. With 28 deadline-bearing
emails, a single miss fails a 100% target. And even 28 out of 28 would not show the true
rate is 100%: the 95% confidence interval would be roughly 88–100%. A target the
measurement can never confirm can't be verified.

**Options:**

| | Wording | Trade-off |
|---|---|---|
| **A** *(recommended)* | ≥ 90% | Stricter, closer to the expectation raised in the meeting, still testable |
| B | Keep ≥ 80% | As specified; easiest to meet, hardest to defend as "good enough" |
| C | 100% | Fails on one miss; can never be confirmed |

**Proposed wording (option A):**
> For each email identified as job-application-related, the system shall extract company,
> role, application stage, deadline and required next action; assign the application to one
> of the defined stages; and, of emails stating a deadline explicitly, surface the correct
> deadline date from at least 90%, measured on the held-out dataset with a stated confidence
> interval. An interview time, an employer's promised reply time or another applicant
> pool's closing date is not a deadline.

---

## RQ-06 — corrections and newer mail

**The change (D36):** a student's correction holds until a newer email about that
application says otherwise. The current wording says corrections persist "across subsequent
updates", which the new rule contradicts.

**Current wording (excerpt):**
> Corrections shall be visually distinguishable from AI-generated values and shall persist
> across subsequent updates.

**Proposed wording (excerpt):**
> Corrections shall be visually distinguishable from AI-generated values and shall persist
> across subsequent updates, except where an email about that application, received after
> the correction, states a new value for the corrected field.

**Proposed verification:**
> User test: a participant corrects a field and confirms the correction survives an update
> carrying older or unrelated mail; then an email received after the correction updates
> that field and the field returns to an AI value. Inspection confirming low-confidence
> extractions appear for confirmation and do not enter the main pipeline.

**How to demonstrate it on the day:** edit a field on one application (not Deloitte), then
press Refresh for the Deloitte email. The edited field stays, and Deloitte changes.

---

## RQ-02 — status note only

The note says the on-demand refresh endpoint "is not yet implemented and deliberately refuses
the request". **Proposed:**
> Ingestion and duplicate protection built, and exercised against a real inbox sample of 32
> emails. On-demand refresh is implemented for the presentation's demo inbox over IMAP
> (read-only; only mail received since the demo started), through the same pipeline; the
> production Gmail API sync (T7.2, T3.8) remains deferred.
