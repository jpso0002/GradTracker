Renders a Lucide glyph; the only sanctioned way to draw an icon in GradTracker (never hand-roll SVG paths).

```jsx
<Icon name="mail-check" size={16} />
<Icon name="calendar-clock" size={20} title="Deadline" />
```

Sizes: 14 dense table cells · 16 default/buttons · 20 sidebar + top bar · 24 empty states. Stroke stays 1.75. Colour inherits `currentColor`, so set colour on the parent.
