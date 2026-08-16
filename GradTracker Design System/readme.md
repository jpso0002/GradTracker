# GradTracker Design System

GradTracker is an AI-powered recruitment dashboard for university students applying to internships and graduate roles. It connects to a student's Gmail, uses an LLM to decide which emails are job applications, and extracts the **company, role, stage, deadline, and next action** from each one — turning an inbox of 20+ overlapping applications into a single ranked pipeline.

The product has two surfaces: the **app** (the pipeline dashboard students open daily) and the **marketing site** (how they find it, plus pricing for university careers services).

**Tone target:** a well-made productivity tool a student actually wants to open — closer to Linear or Height than to a university portal or a job board. Confident, modern, professional, never corporate.

## Sources given

| Source | What it is | Notes |
|---|---|---|
| `uploads/DESIGN-stripe.md` | A design-language analysis of a financial-infrastructure brand ("Stripi"): navy ink, electric-indigo primary, gradient-mesh hero, Sohne 300 with negative tracking, pill buttons, tabular figures. | Supplied as the visual reference for this system. Every foundation here derives from it; the pipeline-specific pieces (six stage colours, confidence meters, dark app shell) are GradTracker's own extension. |
| Company description + tone notes | In-brief prose (above). | No codebase, Figma file, screenshots, decks, logo, or font binaries were provided. |

**Nothing was reconstructed from memory.** Where the reference is silent (semantic/status colours, dark theme, app chrome) the system defines new values and says so.

### Substitutions to confirm
1. **Fonts.** The reference specifies Sohne (proprietary, Klim Type Foundry). No binaries were supplied, so the system loads **Inter** 300/400/500/600 from Google Fonts — the reference's own recommended open-source analogue — plus **JetBrains Mono** for `<kbd>` chips and ids. Send us the Sohne web licence files and only `tokens/fonts.css` changes.
2. **Icons.** No icon assets were supplied. The system uses **Lucide** (24px grid, 1.75px stroke) from CDN via the `Icon` component. Nothing is hand-drawn.
3. **Logo.** Supplied by the user and stored verbatim in `assets/logo/` (full-colour, reversed, mono-ink, currentColor, and horizontal lockup). The mark is a navy mortarboard cap over an indigo funnel — the pipeline. `Wordmark` renders the lockup; `LogoMark` the glyph alone. Never redraw or re-proportion it.
4. **Gradient mesh.** The reference's hero mesh is an organic SVG blob composition. Without the asset, `--mesh-marketing` is a five-stop CSS radial-gradient approximation used by `GradientMesh`.

## Content fundamentals

Copy is written the way a good tool talks: **short, concrete, second person, no cheerleading.**

- **Person.** "You" for the student, "GradTracker" for the product. Never "we" in the UI (only in marketing legal/company copy), never "I".
- **Casing.** Sentence case everywhere — buttons, headings, table headers ("Next action", not "Next Action"). All-caps only in the 10px eyebrow tier (`--micro-cap`), and only for labels of 1–3 words.
- **Length.** Buttons 1–3 words ("Scan inbox", "Add to pipeline", "Not an application"). Empty-state descriptions one sentence. Next-action strings are imperative and specific: "Confirm Thursday 14:00 slot", "Finish numerical test", "Book assessment centre" — never "Action required".
- **Numbers are facts, not decoration.** "Synced 4 minutes ago · 23 live", "612 emails read", "Confidence 52%". Every number is real, tabular, and load-bearing; there are no vanity stats.
- **Honesty about the model.** The AI is described by what it did, never as magic: "Detected from a Greenhouse email", "Needs review", "How sure the model is about this email". When confidence is low the product **asks** — "These emails look like applications. Confirm what GradTracker read, or dismiss the ones that aren't."
- **Marketing voice** is the same voice with more air: one claim per band, spoken plainly. "Twenty applications, one ranked list of what's due next." "Free while you're a student." No exclamation marks, no "supercharge", no "effortlessly".
- **Punctuation.** Middot separators for metadata ("London · Hybrid"). Em dashes sparingly. No trailing periods on labels, badges, or single-clause captions; full stops in real sentences.
- **Emoji: never.** Not in UI, not in marketing, not in empty states. Status is carried by the stage pills.
- **Blank means blank.** Where a design doesn't exist yet (Calendar, Archive) the product says so rather than filling space.

## Visual foundations

**Colour.** Two roles carry the brand: **indigo** `--indigo-500 #533afd` for CTAs, links, active state and AI affordances (one filled indigo per band or panel — never a body-text colour), and **deep navy ink** `--ink-900 #0d253d` for all text and for inverted surfaces. Surfaces are white `--surface-page`, a cool tinted band `--surface-sunken #f6f9fc`, and one warm interlude `--surface-cream #f5e9d4` used at most once per page. Ruby, magenta, lemon and jade are accents and mesh stops only. The **six stage colours** are the system's own addition: steel (applied), amber (assessment pending), indigo (interview scheduled), jade (offer received), ruby (rejected), grey (withdrawn) — each a bg/fg/dot triple in `tokens/stages.css`, AA-contrast in both themes, and reachable only through `StageBadge`.

**Dark theme.** A full navy shell (`--navy-1000` page → `--navy-900` cards), not an inverted grey. Indigo lifts to `#6a53ff` so it survives on dark; stage fills become deep tints with light text. Toggle with `data-theme="dark"` on any ancestor.

**Type.** One family (Inter, standing in for Sohne). The signature is **weight 300 with negative tracking**: 56px/-1.4px down to 20px/-0.2px. Never bump display above 300 — the editorial air is the brand. Body is 15px/1.4 at 300; 16px for marketing leads. Weight 400 for buttons and captions, 500 only for the wordmark, active nav, and eyebrows. **`ss01` is on globally**; **`tnum` on every date, count, salary, and percentage** (`.gt-num`, or `numeric` on `Input`) — the quiet data-product signal.

**Spacing & layout.** 8px base with 2/4/12 sub-steps. Marketing sections 96px tall in padding; app views 32px. Cards 32px (marketing) / 24px (product) / 16px (list cells). App chrome is fixed: 240px sidebar, 56px top bar, 380px detail panel, 1200px marketing container. Table rows are separated by a single bottom hairline, never by card gaps.

**Shape.** Radii 4 / 6 / 8 / 12 / 16 and pill. **Buttons are always pill** at 8px 16px minimum — never rounded rectangles. Inputs 6px. Cards 12px; product-mockup chrome 16px.

**Depth.** Flat by default. `--shadow-1` (rgba(0,55,112,.08) 0 1px 3px) for a card lift, `--shadow-2` for floating panels and product composites, `--shadow-3` for modals only. The real depth medium is the **gradient mesh** — cream → sherbet → lavender → indigo → pink washed across the upper third of every marketing page, masked to fade out at 55%. Product surfaces never get the mesh.

**Backgrounds & imagery.** No photography, no illustration, no texture, no grain. The brand's imagery *is* its own UI: composited product mockups (pipeline table + extraction panel) inside 16px-radius containers with elevation 2. Company logos are never scraped — avatars are the initial in a 22px hairline square.

**Transparency & blur.** Almost never: the modal scrim (`--scrim` navy at 44%) with a 2px backdrop blur, and the mesh's own mask. No frosted panels, no glass cards.

**Motion.** Fast and unshowy — 120ms for control states, 180ms for surfaces, 260ms for meters and switch travel, all on `cubic-bezier(.2,.8,.2,1)`. Fades and colour tints only; no bounce, no scale-in, no parallax. `prefers-reduced-motion` zeroes every duration.

**States.** Hover = a tint (`--surface-hover` for rows and ghost controls, `--indigo-600` for filled buttons). Press = darker still (`--indigo-700`) — **never a scale or shrink**. Focus = `--focus-ring` (3px indigo at 28%) with no outline. Selected rows take `--surface-selected` plus an indigo-tinted left edge only where a table already has a leading column. Disabled = 45% opacity, no colour change. Links are indigo, underline on hover only.

## Iconography

- **Set:** Lucide, loaded from CDN (`unpkg.com/lucide@0.470.0`) and rendered through `Icon`. 24px viewBox, **1.75px stroke**, round caps and joins, `currentColor` fill from the parent.
- **Sizes:** 13–14px in dense table cells and captions · 16px default and inside buttons · 20px sidebar/top-bar · 22–24px inside the pale-indigo disc of an empty state.
- **Never:** hand-rolled SVG paths, emoji as icons, unicode dingbats, PNG icons, or two icon sets in one screen. If a glyph is missing from Lucide, ask before drawing.
- **Icon colour** is `--text-muted` at rest, `--accent-primary` when active or when marking something the model did, and the stage's own `fg` inside stage contexts.
- **Recurring glyphs:** `sparkles` (AI scan / needs review), `layers` (pipeline), `mail`/`mail-search`/`mail-check` (Gmail), `calendar-clock`/`calendar-check` (deadlines, interviews), `archive`, `settings`, `chevron-right` (row affordance), `check`, `x`, `alarm-clock`, `trending-down`, `lock` (permissions).
- No icon font and no sprite sheet exists; `assets/` holds the logo set only — no icon binaries were supplied.
- **The logo mark is not an icon.** Never use it inline in lists, buttons, or as a bullet; it appears once per surface, in chrome or the footer, at 16px minimum.

## Intentional additions

The brief provided no component inventory, so the set is authored from the brand's needs. Beyond the standard primitives, four exist because GradTracker's problem demands them:

- **StageBadge** — the six-stage pill; the single source of stage colour.
- **ConfidenceMeter** — shows how sure the extraction was; keeps the AI honest.
- **DeadlinePill** — tabular date chip whose urgency colour comes from `daysLeft`, not the caller.
- **GradientMesh** — the reference's signature hero backdrop as a component.
- **Icon** — a wrapper over Lucide so no one hand-draws a glyph.
- **Wordmark / LogoMark** — the supplied mark and its horizontal lockup, theme-aware.

## Index

**Root**
- `styles.css` — the only file consumers link; `@import`s everything below.
- `readme.md` (this file) · `SKILL.md` (portable Agent Skill wrapper) · `thumbnail.html` (homepage tile).

**`tokens/`** — `fonts.css` (Google Fonts import) · `colors.css` (base + light/dark semantics) · `stages.css` (six stages, both themes) · `typography.css` · `spacing.css` · `radius.css` · `elevation.css` (shadows + mesh) · `motion.css` · `base.css` (element resets, `.gt-num`, link colours).

**`components/`** (namespace `window.GradTrackerDesignSystem_*`)
- `core/` — Button · IconButton · Card · Badge · Tag · Icon · Wordmark · LogoMark
- `forms/` — Input · Select · Checkbox · Switch · SearchField
- `data/` — StageBadge · DeadlinePill · StatCard · ConfidenceMeter · ApplicationRow
- `navigation/` — SidebarNav · TopBar · Tabs
- `feedback/` — Dialog · Toast · Tooltip · EmptyState
- `brand/` — GradientMesh

Each directory holds `<Name>.jsx`, `<Name>.d.ts` (props + adherence contract), `<Name>.prompt.md` (what & when), and one `*.card.html` specimen.

**`ui_kits/`**
- `app/` — click-through product recreation: Connect → Pipeline → Detail panel → Needs review → Settings, with light/dark toggle. See `ui_kits/app/README.md`.
- `marketing/` — the landing page: mesh hero, product composite, feature bands, pricing, footer. See `ui_kits/marketing/README.md`.

**`templates/`** — starting folders consuming projects copy:
- `app-shell/AppShell.dc.html` — the product shell (sidebar, pipeline, detail panel, review, settings, dark mode).
- `marketing-page/MarketingPage.dc.html` — the landing page (mesh hero, composite, feature bands, pricing, footer).
Each loads the system via its own `ds-base.js`; the screen source is a generated copy of the matching `ui_kits/` files.

**`guidelines/`** — 22 specimen cards (Colors, Type, Spacing, Brand) rendered in the Design System tab.

**`assets/logo/`** — the supplied mark in five variants; see `assets/README.md`.
