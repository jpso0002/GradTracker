import React from "react";
import { Icon } from "../core/Icon.jsx";

export function EmptyState({ icon = "inbox", title, description, action, compact, style }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center",
      gap: "var(--space-md)", padding: compact ? "var(--space-xxl) var(--space-xl)" : "var(--space-huge) var(--space-xl)", ...style,
    }}>
      <span style={{
        display: "flex", alignItems: "center", justifyContent: "center", width: 44, height: 44,
        borderRadius: "var(--radius-pill)", background: "var(--accent-primary-wash)", color: "var(--accent-primary)",
      }}><Icon name={icon} size={22} /></span>
      {title ? <span style={{ fontSize: "var(--heading-sm-size)", color: "var(--text-heading)" }}>{title}</span> : null}
      {description ? <span style={{ fontSize: "var(--body-md-size)", color: "var(--text-muted)", maxWidth: 380 }}>{description}</span> : null}
      {action}
    </div>
  );
}
