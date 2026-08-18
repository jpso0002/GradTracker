import React from "react";

/* The GradTracker mark: a navy mortarboard cap over an indigo funnel (the pipeline).
   Source files live in assets/logo/. Never redraw or re-proportion it. */
export function LogoMark({ size = 24, tone = "auto", title, style }) {
  const cap = tone === "inverse" ? "#f4f8fc" : "var(--text-heading)";
  const funnel = tone === "inverse" ? "#6a53ff" : "var(--accent-primary)";
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} role={title ? "img" : "presentation"}
      aria-hidden={title ? undefined : true} style={{ display: "block", flex: "none", ...style }}>
      {title ? <title>{title}</title> : null}
      <path d="M16 5 30 12 16 19 2 12Z" fill={cap} />
      <path d="M7.5 15.2v5.6c0 2.6 3.8 4.7 8.5 4.7s8.5-2.1 8.5-4.7v-5.6"
        stroke={funnel} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

export function Wordmark({ size = 20, tone = "auto", variant = "lockup", showDot = false, style }) {
  const color = tone === "inverse" ? "#f4f8fc" : "var(--text-heading)";
  if (variant === "mark") return <LogoMark size={Math.round(size * 1.45)} tone={tone} title="GradTracker" style={style} />;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: Math.round(size * 0.36),
      fontFamily: "var(--font-core)", fontSize: size, lineHeight: 1,
      letterSpacing: size >= 32 ? "-0.035em" : "-0.03em",
      color, fontFeatureSettings: "var(--feature-core)", whiteSpace: "nowrap", ...style,
    }}>
      {variant === "lockup" ? <LogoMark size={Math.round(size * 1.45)} tone={tone} title="GradTracker" /> : null}
      <span>
        <span style={{ fontWeight: 300 }}>Grad</span>
        <span style={{ fontWeight: 500 }}>Tracker</span>
        {showDot ? <span style={{ color: tone === "inverse" ? "#6a53ff" : "var(--accent-primary)", fontWeight: 500 }}>.</span> : null}
      </span>
    </span>
  );
}
