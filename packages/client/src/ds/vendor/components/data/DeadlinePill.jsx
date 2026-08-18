import React from "react";
import { Icon } from "../core/Icon.jsx";

export function DeadlinePill({ children, daysLeft, icon = "calendar-clock", style }) {
  const urgent = typeof daysLeft === "number" && daysLeft <= 2;
  const soon = typeof daysLeft === "number" && daysLeft > 2 && daysLeft <= 7;
  const color = urgent ? "var(--stage-rejected-fg)" : soon ? "var(--stage-assessment-fg)" : "var(--text-muted)";
  const bg = urgent ? "var(--stage-rejected-bg)" : soon ? "var(--stage-assessment-bg)" : "transparent";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6, padding: bg === "transparent" ? 0 : "3px 8px",
      borderRadius: "var(--radius-pill)", background: bg, color,
      fontSize: "var(--body-tabular-size)", letterSpacing: "var(--body-tabular-ls)",
      fontFeatureSettings: "var(--feature-numeric)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", ...style,
    }}>
      <Icon name={icon} size={14} />
      {children}
    </span>
  );
}
