import React from "react";

const PAD = { none: 0, compact: "var(--card-pad-compact)", regular: "var(--card-pad)", cell: "var(--space-lg)" };

const SURFACES = {
  card: { background: "var(--surface-card)", color: "var(--text-body)" },
  sunken: { background: "var(--surface-sunken)", color: "var(--text-body)" },
  cream: { background: "var(--surface-cream)", color: "var(--ink-900)" },
  inverse: { background: "var(--indigo-900)", color: "#ffffff" },
};

export function Card({ children, surface = "card", padding = "regular", elevation = 0, radius = "lg", border = true, interactive, style, onClick, ...rest }) {
  const [hover, setHover] = React.useState(false);
  const shadow = hover && interactive ? "var(--shadow-2)" : elevation === 2 ? "var(--shadow-2)" : elevation === 1 ? "var(--shadow-1)" : "none";
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        borderRadius: "var(--radius-" + radius + ")",
        padding: PAD[padding],
        border: border ? "1px solid " + (surface === "inverse" ? "rgba(255,255,255,.14)" : "var(--border-hairline)") : "none",
        boxShadow: shadow,
        cursor: interactive ? "pointer" : undefined,
        transition: "box-shadow var(--dur-base) var(--ease-standard), border-color var(--dur-fast) var(--ease-standard)",
        ...SURFACES[surface], ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}
