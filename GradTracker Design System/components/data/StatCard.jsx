import React from "react";
import { Card } from "../core/Card.jsx";
import { Icon } from "../core/Icon.jsx";

export function StatCard({ label, value, delta, deltaTone = "neutral", icon, style }) {
  const tone = deltaTone === "up" ? "var(--stage-offer-fg)" : deltaTone === "down" ? "var(--stage-rejected-fg)" : "var(--text-muted)";
  return (
    <Card padding="cell" elevation={0} style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0, ...style }}>
      <span style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-muted)", fontSize: "var(--micro-cap-size)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
        {icon ? <Icon name={icon} size={13} /> : null}{label}
      </span>
      <span style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontSize: "var(--display-md-size)", lineHeight: "var(--display-md-lh)", letterSpacing: "var(--display-md-ls)", fontWeight: "var(--weight-thin)", color: "var(--text-heading)", fontFeatureSettings: "var(--feature-numeric)", fontVariantNumeric: "tabular-nums" }}>{value}</span>
        {delta ? <span style={{ fontSize: "var(--caption-size)", letterSpacing: "var(--caption-ls)", color: tone, fontFeatureSettings: "var(--feature-numeric)" }}>{delta}</span> : null}
      </span>
    </Card>
  );
}
