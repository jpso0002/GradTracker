import React from "react";

export function ConfidenceMeter({ value = 0, showValue = true, width = 64, label = "AI confidence", style }) {
  const pct = Math.max(0, Math.min(100, Math.round(value * (value <= 1 ? 100 : 1))));
  const fill = pct >= 80 ? "var(--accent-primary)" : pct >= 55 ? "var(--stage-assessment-dot)" : "var(--text-muted)";
  return (
    <span title={label + ": " + pct + "%"} style={{ display: "inline-flex", alignItems: "center", gap: 8, ...style }}>
      <span style={{ position: "relative", width, height: 4, borderRadius: "var(--radius-pill)", background: "var(--border-hairline)", overflow: "hidden", flex: "0 0 auto" }}>
        <span style={{ position: "absolute", inset: 0, width: pct + "%", background: fill, borderRadius: "var(--radius-pill)", transition: "width var(--dur-slow) var(--ease-standard)" }} />
      </span>
      {showValue ? <span style={{ fontSize: "var(--micro-size)", color: "var(--text-muted)", fontFeatureSettings: "var(--feature-numeric)", fontVariantNumeric: "tabular-nums" }}>{pct}%</span> : null}
    </span>
  );
}
