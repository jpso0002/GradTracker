# GradTracker — Accessibility Audit *(WCAG 2.1 AA)*

**Audited 5 October 2026 (T6.5)**, against every Level A and AA success criterion of WCAG
2.1, as RQ-09 requires. **Evidence** names the automated test or the browser check behind each
verdict; where nothing checks it, the entry says so.

**Companion docs:** [design.md §10](design.md) (the obligations) · [tasks.md](tasks.md) (T6.5)

---

## 1. Summary

| | Count |
|---|---|
| **Pass** | 36 |
| **Partial** | 4 — 1.4.3, 1.4.11, 2.4.5, 3.3.4 |
| **Not tested** | 1 — 1.4.12 |
| **Not applicable** | 9 — time-based media (five), audio, input purpose, motion actuation, language of parts |
| **All Level A and AA criteria** | 50 |

**What does not pass is almost all in the design system's tokens**, not in GradTracker's
code. The design system is supplied and is not edited here, so its failures are recorded,
pinned in `contrast.test.ts`, and left for the team to change at the source. Each is listed
with the change that would fix it (§3).

**The done-when of T6.5** — the primary journey completes by keyboard alone with no trap, and
every stage and deadline signal survives the removal of colour — is met, and tested
(`a11y.test.tsx`).

---

## 2. Criteria

### Perceivable

| Criterion | Verdict | Evidence |
|---|---|---|
| 1.1.1 Non-text content | Pass | Icons are `aria-hidden`; every icon-only control is named; confidence meters have `role="meter"` and a text alternative ("AI confidence 93 percent"). `a11y.test.tsx` |
| 1.2.1–1.2.5 Time-based media | N/A | No audio or video |
| 1.3.1 Info and relationships | Pass | One `<h1>` per view; the pipeline is a list of items; fields are a `dl` whose values are described by their provenance (`aria-describedby`); the same-or-new question is a `fieldset` with a `legend`; form fields are labelled; documentation tables are tables. `a11y.test.tsx`, `docs.test.tsx` |
| 1.3.2 Meaningful sequence | Pass | DOM order is visual order at every width |
| 1.3.3 Sensory characteristics | Pass | No instruction depends on shape, position or colour |
| 1.3.4 Orientation | Pass | The layout follows the width, not the orientation (T5.8) |
| 1.3.5 Identify input purpose | N/A | No field collects personal data about the user |
| 1.4.1 Use of colour | Pass | A stage badge always carries its label, a deadline pill its date; urgency is spoken in each row's name ("3 days overdue"); human values carry the word "Edited". `a11y.test.tsx` |
| 1.4.2 Audio control | N/A | No audio |
| 1.4.3 Contrast (minimum) | **Partial** | All text GradTracker colours itself passes 4.5:1 in both themes. Five design-system pairs do not (§3, items 1–4). `contrast.test.ts` |
| 1.4.4 Resize text | Pass | 200% zoom on a 1280px window is a 640px viewport: the phone layout, with every function present. Browser, 375px and 320px |
| 1.4.5 Images of text | Pass | None |
| 1.4.10 Reflow | Pass | No horizontal scroll at 320px on any view; wide documentation tables and diagrams scroll within themselves, as the criterion allows. Browser, 5 October |
| 1.4.11 Non-text contrast | **Partial** | The active-tab underline and confidence fill pass 3:1. The focus ring (≈1.6:1 light, ≈1.8:1 dark) and input borders (1.69–1.82:1) do not (§3, items 5–6). `contrast.test.ts` |
| 1.4.12 Text spacing | Not tested | Nothing sets a fixed height on text, but no check overrides the spacing properties to prove it |
| 1.4.13 Content on hover or focus | Pass | The only hover content is the browser's own `title` tooltip; the design system's `Tooltip` is unused |

### Operable

| Criterion | Verdict | Evidence |
|---|---|---|
| 2.1.1 Keyboard | Pass | Pipeline rows are buttons (Enter or Space); the panel takes focus when it opens; edit mode, the review queue, settings, search and the documentation are all keyboard-operable. The whole primary journey is tested by keyboard alone. `a11y.test.tsx` |
| 2.1.2 No keyboard trap | Pass | Over the list (below 1280px) the panel is a modal dialog that holds focus — and Escape always closes it, returning focus to the row it came from. `a11y.test.tsx`, `responsive.test.tsx` |
| 2.1.4 Character key shortcuts | Pass | "/" moves to search; Settings → Keyboard turns it off, for speech input. *Failed until 5 October.* `views.test.tsx`, `settings.test.tsx` |
| 2.2.1 Timing adjustable | Pass | No time limits. Toasts are status messages, also announced, and require no action |
| 2.2.2 Pause, stop, hide | Pass | Nothing moves for more than five seconds |
| 2.3.1 Three flashes | Pass | Nothing flashes |
| 2.4.1 Bypass blocks | Pass | `nav` and `main` landmarks and an `<h1>` per view. A visible skip link would further help sighted keyboard users |
| 2.4.2 Page titled | Pass | "Applications · GradTracker", and so on per view. `a11y.test.tsx` |
| 2.4.3 Focus order | Pass | Focus moves into the panel when it opens, back to the row when it closes, and to the next card after a review |
| 2.4.4 Link purpose | Pass | "Review required: an email may belong to KPMG — Vacationer Program"; "Open in Gmail · smartrecruiters.com" |
| 2.4.5 Multiple ways | **Partial** | The review queue is reachable from the navigation, the row markers and the empty states; Settings and Documentation only from the navigation |
| 2.4.6 Headings and labels | Pass | Headings and labels say what follows |
| 2.4.7 Focus visible | Pass | The design system's sidebar items, tabs and chips set inline styles that hid the focus ring; `app.css` restores it, and the switch's ring is drawn on its track. *Failed until 5 October.* Browser, keyboard |
| 2.5.1 Pointer gestures | Pass | Single taps and clicks only |
| 2.5.2 Pointer cancellation | Pass | Actions fire on release |
| 2.5.3 Label in name | Pass | Every accessible name begins with, or contains, the visible label |
| 2.5.4 Motion actuation | N/A | No motion input |

### Understandable

| Criterion | Verdict | Evidence |
|---|---|---|
| 3.1.1 Language of page | Pass | `<html lang="en">` |
| 3.1.2 Language of parts | N/A | One language |
| 3.2.1 On focus | Pass | Focus never changes context |
| 3.2.2 On input | Pass | The threshold slider saves a setting; it does not change context |
| 3.2.3 Consistent navigation | Pass | One navigation, in one order, at every width |
| 3.2.4 Consistent identification | Pass | One name per function throughout |
| 3.3.1 Error identification | Pass | A refused field names itself, beneath it and to assistive technology (`role="alert"`: "Company: Company cannot be empty.") |
| 3.3.2 Labels or instructions | Pass | Every field is labelled; the deadline says "Leave empty if there is none" |
| 3.3.3 Error suggestion | Pass | Messages say how to fix the error |
| 3.3.4 Error prevention | **Partial** | Edits are checked (the stale-edit warning) and reversible. **Dismissing a review item ("Not an application") is neither confirmed nor reversible** (§3, item 7) |

### Robust

| Criterion | Verdict | Evidence |
|---|---|---|
| 4.1.1 Parsing | Pass | React output; no interactive control nests another |
| 4.1.2 Name, role, value | Pass | Rows (`button`, `aria-current`), chips (`aria-pressed`), meters (`meter`), the panel (`dialog`, `aria-modal`, below 1280px), switches (native checkboxes). The design system's tabs have no `tabpanel` association or arrow-key movement; they work with Tab and Enter |
| 4.1.3 Status messages | Pass | Toasts and the offline banner are polite live regions; validation errors are alerts |

---

## 3. Open findings — for the team

All but item 7 are design-system tokens. The rule is to change the design system at its
source and re-sync, never to edit the vendored copy; each fix flips a pinned check in
`contrast.test.ts`, which then asks for its entry to be removed.

| # | Finding | Where | Suggested fix |
|---|---|---|---|
| 1 | `--text-muted` is 4.49 / 4.42 / 4.21:1 on the sunken, hover and selected surfaces (light) | Sidebar section headings; a hovered or selected row's role text | Darken `--ink-500` slightly — to around `#5f6f86` — so it clears 4.5:1 on all three |
| 2 | `--ruby-deep` error text is 2.23:1 on a dark card | The design system's `Input` error text | A dark-theme value for `--ruby-deep`, around `#ff7aa3` |
| 3 | A hovered primary button is 3.94:1 (dark) | `Button` primary, hover state | A darker `--accent-primary-hover` in the dark theme |
| 4 | The `Badge` "ai" and "indigo" tones are 1.07 and 2.00:1 (dark) | `Badge` — **no longer used by GradTracker**; the "Review required" marker moved to `Tag` | Dark-theme values for `--indigo-600` / `--indigo-700` |
| 5 | The focus ring is ≈1.6:1 (light) and ≈1.8:1 (dark) against a card | Every focusable control | An opaque 2px ring in `--accent-primary` |
| 6 | Input and select borders are 1.69–1.82:1 | `Input`, `Select`, `SearchField` | `--border-input` at 3:1 or more |
| 7 | "Not an application" dismisses at once, and a dismissed email never returns | Review queue (T6.3) | A confirmation step, or an Undo in the toast backed by an un-dismiss route |
