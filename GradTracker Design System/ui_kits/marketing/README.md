# GradTracker marketing site — UI kit

One long landing page, assembled from the design system's components. Open `index.html`.

- `SiteHeader.jsx` — wordmark, centre nav, sign-in, filled indigo CTA (the only filled button in the band).
- `LandingHero.jsx` — the mesh hero: eyebrow badge, 56px display-xxl headline, lead paragraph, dual CTA, tabular proof line, then the product composite.
- `MockupComposite.jsx` — the "look at the actual product" composite: pipeline table + extraction panel inside a 16px-radius, elevation-2 container.
- `FeatureBands.jsx` — the sunken three-up "how it works" band, then the six-stage band with the cream interlude card.
- `PricingBand.jsx` — three tiers, the middle one inverted to deep navy (the brand's featured-tier treatment).
- `SiteFooter.jsx` — five columns, caption type, muted ink, legal row.
- `LandingPage.jsx` — composes the page and wires the Connect-Gmail dialog + success toast.

The hero mesh is a CSS radial-gradient approximation of the reference's organic SVG mesh; swap in a real mesh asset when one exists.
