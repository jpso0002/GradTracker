import React from "react";
import { Icon } from "../core/Icon.jsx";
import { IconButton } from "../core/IconButton.jsx";

const TONES = {
  info: { icon: "info", color: "var(--accent-primary)" },
  success: { icon: "check-circle-2", color: "var(--stage-offer-fg)" },
  warning: { icon: "alert-triangle", color: "var(--stage-assessment-fg)" },
  error: { icon: "alert-circle", color: "var(--stage-rejected-fg)" },
};

export function Toast({ children, tone = "info", action, onDismiss, style }) {
  const t = TONES[tone] || TONES.info;
  return (
    <div role="status" style={{
      display: "inline-flex", alignItems: "center", gap: "var(--space-md)",
      padding: "10px 12px 10px 14px", borderRadius: "var(--radius-md)",
      background: "var(--surface-card)", border: "1px solid var(--border-hairline)",
      boxShadow: "var(--shadow-2)", color: "var(--text-body)",
      fontSize: "var(--body-tabular-size)", letterSpacing: "var(--body-tabular-ls)", ...style,
    }}>
      <span style={{ color: t.color, display: "flex" }}><Icon name={t.icon} size={16} /></span>
      <span style={{ flex: 1 }}>{children}</span>
      {action}
      {onDismiss ? <IconButton icon="x" label="Dismiss" size="sm" onClick={onDismiss} /> : null}
    </div>
  );
}
