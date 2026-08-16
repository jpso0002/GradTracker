# assets/

- **`logo/`** — the supplied GradTracker mark: a navy mortarboard cap over an indigo funnel (the pipeline).
  - `logo.svg` — full colour, 32×32 (ink cap #0d253d, indigo funnel #533afd).
  - `logo-reversed.svg` — for navy / indigo surfaces (light cap, lifted indigo funnel).
  - `logo-mono-ink.svg` — single-colour ink.
  - `logo-currentcolor.svg` — inherits CSS `color`; use inside buttons and icon slots.
  - `logo-lockup.svg` — mark + "GradTracker" horizontal lockup, 190×32.
  In React use `<Wordmark>` / `<LogoMark>` (`components/core/Wordmark.jsx`) so the mark picks up theme colours. Minimum mark size 16px. Never redraw or re-proportion it.
- **No icon binaries.** Icons come from Lucide over CDN (see ICONOGRAPHY in `readme.md`).
- **No fonts.** Inter and JetBrains Mono load from Google Fonts; Sohne licence files would go here alongside a rewritten `tokens/fonts.css`.
