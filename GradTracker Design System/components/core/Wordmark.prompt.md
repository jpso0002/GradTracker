The GradTracker logo — a navy mortarboard cap over an indigo funnel, with the name set in Grad 300 / Tracker 500.

```jsx
<Wordmark size={20} />                    {/* mark + name, app chrome */}
<Wordmark size={34} />                    {/* marketing */}
<Wordmark size={20} tone="inverse" />     {/* navy / indigo surfaces */}
<Wordmark size={20} variant="wordmark" /> {/* name only */}
<LogoMark size={28} title="GradTracker" />{/* glyph only — favicon, avatar, tight chrome */}
```

Static files: `assets/logo/logo.svg` (full colour), `logo-lockup.svg`, `logo-mono-ink.svg`, `logo-reversed.svg` (for dark/indigo), `logo-currentcolor.svg` (inherits `color`). Never redraw, re-proportion, or recolour the mark beyond these variants; the cap is ink, the funnel is indigo.
