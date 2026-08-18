import React from "react";

const TONES = {
  neutral: { background: "var(--surface-sunken)", color: "var(--text-muted)", border: "var(--border-hairline)" },
  indigo: { background: "var(--accent-primary-wash)", color: "var(--indigo-600)", border: "transparent" },
  ai: { background: "var(--accent-primary-subdued)", color: "var(--indigo-700)", border: "transparent" },
  jade: { background: "var(--stage-offer-bg)", color: "var(--stage-offer-fg)", border: "transparent" },
  ruby: { background: "var(--stage-rejected-bg)", color: "var(--stage-rejected-fg)", border: "transparent" },
  amber: { background: "var(--stage-assessment-bg)", color: "var(--stage-assessment-fg)", border: "transparent" },
};

export function Badge({ children, tone = "neutral", uppercase = true, style }) {
  const t = TONES[tone] || TONES.neutral;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "4px 8px", borderRadius: "var(--radius-pill)",
      background: t.background, color: t.color, border: "1px solid " + t.border,
      fontFamily: "var(--font-core)", fontSize: uppercase ? "var(--micro-cap-size)" : "var(--micro-size)",
      lineHeight: "var(--micro-cap-lh)", letterSpacing: uppercase ? "0.06em" : 0,
      textTransform: uppercase ? "uppercase" : "none", fontWeight: "var(--weight-medium)",
      whiteSpace: "nowrap", ...style,
    }}>{children}</span>
  );
}
