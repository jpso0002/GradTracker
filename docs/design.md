# GradTracker — Design Guidelines

**Brand and UX standards.** The visual system already exists as code in
`GradTracker Design System/`. This document is not a second design system — it records how
that system is applied to GradTracker's product surfaces, and it specifies the things the
supplied system deliberately leaves open: AI-vs-human visual language, responsive
behaviour, and accessibility requirements.

**Companion docs:** [masterplan.md](masterplan.md) · [implementation.md](implementation.md)
· [app-flow.md](app-flow.md)

---

## 1. The governing rule

> **The design system is consumed, never re-implemented and never edited.**

`GradTracker Design System/` is a supplied dependency. Every visual in the product is
composed from its components and its tokens. Three consequences:

1. **No hardcoded colours, sizes, radii, or durations.** Every value comes from a CSS custom
   property. A hex code in application code is a defect.
2. **No new component that duplicates an existing one.** If a Button variant is missing, the
   answer is a conversation, not a local `<button>`.
3. **Stage colour is reachable only through `StageBadge`.** It is defined as the single
   source of truth for stage colour, and bypassing it fragments the one visual signal the
   whole product depends on.

The client keeps a thin `src/ds/` re-export layer so imports are stable if the system's
path changes. That layer adds nothing.

---

## 2. Brand foundation

**Tone target:** a well-made productivity tool a student actually wants to open — closer to
Linear or Height than to a university portal or a job board. Confident, modern,
professional, never corporate.

**Two colours carry the brand.** Indigo `--indigo-500 #533afd` for CTAs, links, active state
and AI affordances — **one filled indigo per band or panel, and never a body-text colour**.
Deep navy ink `--ink-900 #0d253d` for all text and inverted surfaces. Never pure black.

**Accents are not decoration.** Ruby, magenta, lemon and jade appear as stage colours and
gradient-mesh stops only. They are never button fills.

**No imagery.** No photography, no illustration, no texture, no grain. The brand's imagery
is its own UI. Company logos are never scraped — an avatar is the company initial in a 22px
hairline square.

**No emoji.** Not in the UI, not in empty states, not in copy. Status is carried by stage
pills.

---

## 3. Tokens

Values are canonical in `GradTracker Design System/tokens/`. Reproduced here for reference;
if the two ever disagree, the token files win.

### 3.1 Surfaces and text — light

| Token | Value | Use |
|---|---|---|
| `--surface-page` | `#ffffff` | Page background |
| `--surface-sunken` | `#f6f9fc` | Recessed bands, the app's sunken content area |
| `--surface-card` | `#ffffff` | Cards, panels, table background |
| `--surface-hover` | `#f4f7fb` | Row and ghost-control hover |
| `--surface-selected` | `--indigo-050 #f1f0ff` | Selected row |
| `--surface-cream` | `#f5e9d4` | Warm interlude — **at most once per page** |
| `--text-body` / `--text-heading` | `--ink-900 #0d253d` | All primary text |
| `--text-secondary` | `--ink-700 #273951` | Supporting text |
| `--text-muted` | `--ink-500 #64748d` | Captions, metadata, icons at rest |
| `--border-hairline` | `#e3e8ee` | Table rules, card borders |
| `--accent-primary` | `--indigo-500 #533afd` | CTA, link, active, AI affordance |
| `--focus-ring` | `0 0 0 3px rgba(83,58,253,.28)` | Focus, all interactive elements |

### 3.2 Dark theme

A full navy shell, **not an inverted grey**. Applied with `data-theme="dark"` on any
ancestor; the whole system re-resolves. Page `--navy-1000 #0a1524` → cards
`--navy-900 #132539`. Indigo lifts to `#6a53ff` so it survives on dark. Stage fills become
deep tints with light text.

### 3.3 The six stage colours

Each stage is a `bg` / `fg` / `dot` triple, AA-contrast in both themes, defined in
`tokens/stages.css` and reachable only through `StageBadge`.

| Stage | Light bg / fg | Semantics |
|---|---|---|
| `applied` | `#eef2f7` / `#3f5675` — steel | Submitted, awaiting response |
| `assessment` | `#fdf2e0` / `#8a5a1f` — amber | Action required by the student |
| `interview` | `#ebe9ff` / `#3d2fc4` — indigo | Progressing, high value |
| `offer` | `#e2f4ef` / `#0b6b58` — jade | Success |
| `rejected` | `#fdeaf1` / `#ab0f46` — ruby | Terminal, unsuccessful |
| `withdrawn` | `#f2f4f7` / `#5c6b80` — grey | Terminal, student-initiated |

The mapping is intentional: amber is the only stage that means *you must do something*, and
it is the only warm colour in the set.

### 3.4 Type

One family — Inter (standing in for Sohne, per the design system's substitution note),
weights 300 / 400 / 500.

**The signature is weight 300 with negative tracking.** Display runs 56px/-1.4px down to
20px/-0.2px. **Never bump display above 300** — the editorial air is the brand.

| Tier | Size / line / tracking | Weight | Use |
|---|---|---|---|
| `display-xxl` | 56 / 1.03 / -1.4px | 300 | Marketing only |
| `display-lg` | 32 / 1.1 / -0.64px | 300 | Stat values, view titles |
| `heading-md` | 20 / 1.4 / -0.2px | 300 | Panel headings |
| `body-md` | 15 / 1.4 / 0 | 300 | Default body |
| `body-tabular` | 14 / 1.4 / -0.42px | 300 | Table cells |
| `caption` | 13 / 1.4 / -0.39px | 400 | Metadata, helper text |
| `micro-cap` | 10 / 1.15 / 0.1px | 500 | All-caps eyebrows, 1–3 words only |

**`ss01` is on globally. `tnum` goes on every date, count, salary and percentage** — via
`.gt-num`, or `numeric` on `Input`. This is the quiet data-product signal and it is not
optional: a pipeline whose dates jitter between rows reads as amateur.

Weight 400 for buttons and captions. Weight 500 only for the wordmark, active nav, and
eyebrows.

### 3.5 Spacing, shape, depth, motion

**Spacing** — 8px base with 2/4/12 sub-steps. App views 32px section padding. Cards 24px
(product) / 16px (list cells).

**Shape** — radii 4 / 6 / 8 / 12 / 16 and pill. **Buttons are always pill**, minimum
8px 16px — never rounded rectangles. Inputs 6px. Cards 12px.

**Depth** — flat by default. `--shadow-1` for a card lift, `--shadow-2` for floating panels,
`--shadow-3` for modals only. **Product surfaces never get the gradient mesh** — it is a
marketing device.

**Motion** — 120ms control states, 180ms surfaces, 260ms meters and switch travel, all on
`cubic-bezier(.2,.8,.2,1)`. Fades and colour tints only. **No bounce, no scale-in, no
parallax.** `prefers-reduced-motion` zeroes every duration, already handled in
`tokens/motion.css`.

### 3.6 Interaction states

| State | Treatment |
|---|---|
| Hover | A tint — `--surface-hover` for rows and ghost controls, `--indigo-600` for filled buttons |
| Press | Darker still — `--indigo-700`. **Never a scale or shrink.** |
| Focus | `--focus-ring`, no outline |
| Selected | `--surface-selected` plus an indigo left edge, only where a table already has a leading column |
| Disabled | 45% opacity, no colour change |
| Link | Indigo, underline on hover only |

---

## 4. Component inventory

Namespace `window.GradTrackerDesignSystem_*`; each ships `.jsx`, `.d.ts`, `.prompt.md`, and
a specimen card.

| Group | Components |
|---|---|
| core | Button · IconButton · Card · Badge · Tag · Icon · Wordmark · LogoMark |
| forms | Input · Select · Checkbox · Switch · SearchField |
| data | **StageBadge · DeadlinePill · StatCard · ConfidenceMeter · ApplicationRow** |
| navigation | SidebarNav · TopBar · Tabs |
| feedback | Dialog · Toast · Tooltip · EmptyState |
| brand | GradientMesh |

The five data components are the product. Everything else is chrome.

---

## 5. The four product-specific components

These exist because GradTracker's problem demands them. Their rules are binding.

### 5.1 `StageBadge`

```ts
stage: 'applied'|'assessment'|'interview'|'offer'|'rejected'|'withdrawn'
size?: 'sm'|'md'   showDot?: boolean   label?: string
```

The single source of stage colour. **Never read a stage token directly**; never colour
anything else with a stage colour. `label` overrides text while keeping the colour — use it
sparingly.

### 5.2 `DeadlinePill`

```ts
daysLeft?: number   // ≤2 → ruby, 3–7 → amber, otherwise muted and chrome-less
```

**The caller passes `daysLeft`, never a colour.** Urgency is the component's judgement, so
it cannot disagree between two places in the UI. `daysLeft` is computed at render time
against today — this is [P3](masterplan.md) made concrete, and it is why "Deadline
Approaching" is not a stored stage.

Deadline text is tabular: `"23 May · 23:59"`.

### 5.3 `ConfidenceMeter`

```ts
value?: number      // 0–1 or 0–100
showValue?: boolean
label?: string      // tooltip prefix, default "AI confidence"
```

Shown on **AI-sourced fields only**. It disappears the moment a field becomes human-verified
— a confidence score on a value a human typed is meaningless and actively misleading.

### 5.4 `ApplicationRow`

```ts
company, role, stage, nextAction, deadline, daysLeft, source, selected, onClick
```

One application in the ranked table. `source` is the provenance string surfaced as the
chevron tooltip — "Detected from a Greenhouse email".

Rows are separated by **a single bottom hairline, never by card gaps**.

---

## 6. Layout

App chrome is fixed:

| Element | Size |
|---|---|
| Sidebar | 240px (`--sidebar-w`) |
| Top bar | 56px (`--topbar-h`) |
| Detail panel | 380px |
| App section padding | 32px (`--section-pad-app`) |
| Control height | 36px, 40px large, 44px minimum touch target |

```
┌──────────┬──────────────────────────────────────┬─────────────┐
│          │  TopBar 56px                         │             │
│ Sidebar  ├──────────────────────────────────────┤ DetailPanel │
│  240px   │  Stat strip                          │    380px    │
│          │  Tabs · filter chips                 │             │
│          │  ─────────────────────────────────── │  (on row    │
│          │  ApplicationRow  ← hairline separated│   select)   │
│          │  ApplicationRow                      │             │
└──────────┴──────────────────────────────────────┴─────────────┘
```

---

## 7. AI vs human — the product's most important visual contract

The design system supplies the parts; this is the specification for how GradTracker
assembles them. It implements [SM-7](masterplan.md) and [P1](masterplan.md), and it is the
single most consequential piece of UI in the product.

### 7.1 The three states of a field

| State | Treatment |
|---|---|
| **AI-extracted, confident** | Value in normal body type. `ConfidenceMeter` beside it. Hovering shows "How sure the model is about this email". |
| **AI-extracted, low confidence** | Same, plus the row is diverted to Needs review and never enters the pipeline as fact. |
| **Human-verified** | Value in normal body type. **`ConfidenceMeter` removed.** A `Tag` reading **"Edited"** in place of it. |

### 7.2 The rules

1. **The distinction is persistent, never a hover state.** "Visually distinguishable at a
   glance" (SM-7) means visible while scanning, without interaction.
2. **The tag is the presence signal, the meter is the absence signal.** A field either shows
   a confidence meter (AI) or an Edited tag (human). Never both, never neither.
3. **The distinction is carried by a tag with text, not by colour alone.** A colour-only
   distinction fails colour-blind users and fails §10.
4. **Every extracted field is editable.** `company`, `role`, `stage`, `deadline`,
   `nextAction`. No exceptions — an uneditable extracted field violates P1.
5. **Editing is inline, in place, without leaving the dashboard** (workflow 6). No modal, no
   separate edit screen.

### 7.3 Edit interaction

Click a field → it becomes an `Input` (or `Select` for stage) in place, pre-filled and
focused with the text selected. `Enter` or blur saves; `Escape` cancels. On save the field
returns to display type, the meter is replaced by the Edited tag, and a `Toast` confirms.
On validation failure the input keeps focus and shows the error beneath — **the entered
value is never discarded**.

Optimistic update, with rollback and an error toast on failure.

### 7.4 Describing the model honestly

Per [P5](masterplan.md), the AI is described by what it did:

- "Detected from a Greenhouse email" — not "AI-powered detection"
- "Needs review" — not "Low confidence"
- "How sure the model is about this email" — not a bare percentage
- "These emails look like applications. Confirm what GradTracker read, or dismiss the ones
  that aren't."

`sparkles` is the icon for AI scan and needs-review, coloured `--accent-primary` when it
marks something the model did.

---

## 8. Iconography

**Lucide**, loaded from CDN and rendered through `Icon`. 24px viewBox, **1.75px stroke**,
round caps, `currentColor`.

Sizes: 13–14px in dense cells and captions · 16px default and in buttons · 20px sidebar and
top bar · 22–24px inside the pale-indigo disc of an empty state.

Colour: `--text-muted` at rest · `--accent-primary` when active or marking something the
model did · the stage's own `fg` inside stage contexts.

**Recurring glyphs:** `sparkles` (AI scan / needs review) · `layers` (pipeline) ·
`mail` / `mail-search` / `mail-check` (Gmail) · `calendar-clock` / `calendar-check`
(deadlines, interviews) · `archive` · `settings` · `chevron-right` (row affordance) ·
`check` · `x` · `alarm-clock` · `trending-down` · `lock` (permissions).

**Never:** hand-rolled SVG paths, emoji as icons, unicode dingbats, PNG icons, or two icon
sets in one screen. If a glyph is missing from Lucide, ask before drawing.

**The logo mark is not an icon.** Never inline in lists, buttons, or as a bullet. Once per
surface, in chrome or footer, 16px minimum.

---

## 9. Content and voice

Copy is written the way a good tool talks: **short, concrete, second person, no
cheerleading.**

| Rule | Detail |
|---|---|
| Person | "You" for the student, "GradTracker" for the product. Never "we" in the UI, never "I". |
| Casing | **Sentence case everywhere** — buttons, headings, table headers ("Next action", not "Next Action"). All-caps only in the 10px eyebrow tier, 1–3 words. |
| Buttons | 1–3 words: "Scan inbox", "Add to pipeline", "Not an application" |
| Next actions | Imperative and specific: "Confirm Thursday 14:00 slot", "Finish numerical test", "Book assessment centre". **Never "Action required".** |
| Numbers | Facts, not decoration. "Synced 4 minutes ago · 23 live", "612 emails read". Every number real, tabular, load-bearing. No vanity stats. |
| Punctuation | Middot for metadata ("London · Hybrid"). Em dashes sparingly. **No trailing periods on labels, badges, or single-clause captions**; full stops in real sentences. |
| Emoji | Never. |
| Blank means blank | Where a design doesn't exist (Calendar, Archive), say so rather than filling space. |

---

## 10. Accessibility

Target: **WCAG 2.1 AA**. Beyond what the design system already guarantees, these are
GradTracker's obligations.

### 10.1 Colour is never the only signal

The most important rule in this section, because the product's central signal is a coloured
pill.

- `StageBadge` always carries **its text label**; the dot is reinforcement, never the
  message. Never render a dot-only stage indicator.
- `DeadlinePill` always carries **the date text**; urgency colour is reinforcement.
- AI vs human is carried by **the "Edited" tag and the meter's presence**, not by a colour
  difference.

All stage `bg`/`fg` pairs are AA in both themes, verified in `tokens/stages.css`.

### 10.2 Keyboard

- Every interactive element reachable by `Tab` in visual order.
- Pipeline rows are real buttons: `Enter` or `Space` opens the detail panel.
- Editable fields: `Enter` opens the editor, `Enter` saves, `Escape` cancels and restores
  focus to the field.
- `Dialog` traps focus, closes on `Escape`, restores focus to its trigger.
- **No keyboard trap anywhere**, including inline editors.

### 10.3 Screen readers

- Stat strip values carry accessible labels: `aria-label="23 live applications"`.
- `ConfidenceMeter` is `role="meter"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`
  and a text alternative: "AI confidence 52 percent".
- Fields announce provenance: `aria-describedby` pointing at the Edited tag or the meter.
- Sync progress and toasts use `aria-live="polite"`; validation errors `aria-live="assertive"`.
- Icon-only controls carry `aria-label`. Decorative icons are `aria-hidden`.
- Each view sets a document title and an `<h1>`.

### 10.4 Motion and visual

- `prefers-reduced-motion` zeroes all durations (already in the tokens). **No animation may
  bypass this** by using inline transitions.
- Focus is always visible — `--focus-ring` with no outline. Never `outline: none` without a
  replacement.
- Body text minimum 13px (`--caption-size`). Never smaller except the 10px all-caps eyebrow,
  which is never load-bearing content.
- Text respects browser zoom to 200% without loss of function.

---

## 11. Responsive behaviour

**The supplied system specifies fixed desktop chrome and does not define breakpoints. This
section is GradTracker's own addition.**

The primary user checks between classes, so a phone-hostile dashboard fails the actual use
case even though the criterion only says "standard web browser".

| Breakpoint | Layout |
|---|---|
| **≥1280px — desktop** | Full chrome: 240px sidebar, 380px detail panel inline beside the table. The reference layout. |
| **1024–1279px — small desktop** | Sidebar persists. Detail panel becomes an overlay from the right with a scrim, rather than displacing the table. |
| **768–1023px — tablet** | Sidebar collapses to a 56px icon rail with tooltips. Detail panel is a full-height right overlay. Stat strip wraps to two rows. |
| **<768px — mobile** | Sidebar becomes a bottom tab bar (Pipeline · Review · Settings). The table becomes stacked cards: company and role on line one, `StageBadge` and `DeadlinePill` on line two, next action on line three. Detail panel is a full-screen sheet with a back control. |

**Rules that hold at every width:**

- Ranking never changes. The most urgent item is first on every device — that is SM-4, and
  it is not a desktop-only promise.
- Touch targets ≥44px (`--touch-min`) below 1024px.
- Inline editing works on touch: tap to edit, on-screen keyboard, explicit save and cancel
  buttons below 768px where blur-to-save is unreliable.
- Nothing is hidden on mobile that is actionable on desktop. Density may drop; capability
  may not.

---

## 12. Do and don't

| Do | Don't |
|---|---|
| Use tokens for every value | Hardcode a hex, a px radius, or a duration |
| Colour stages through `StageBadge` | Read `--stage-*` tokens directly |
| Pass `daysLeft` to `DeadlinePill` | Pass it a colour or a pre-computed urgency |
| Put `tnum` on every number | Let dates jitter between rows |
| Keep display type at weight 300 | Bold a heading to make it "stronger" |
| Pill buttons, always | Rounded-rectangle buttons |
| Tint on hover, darken on press | Scale, shrink, or bounce anything |
| Sentence case | Title Case On Buttons |
| Say "Detected from a Greenhouse email" | Say "AI-powered" or "smart" |
| Show an empty state that admits the gap | Fill space with placeholder content |
| One filled indigo per panel | Indigo body text, or three indigo buttons in a row |
| Remove the meter when a field is human-verified | Show a confidence score on a value a human typed |
