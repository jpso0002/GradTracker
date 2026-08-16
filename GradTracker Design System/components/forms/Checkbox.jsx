import React from "react";
import { Icon } from "../core/Icon.jsx";

export function Checkbox({ checked, onChange, label, description, disabled, style }) {
  return (
    <label style={{ display: "flex", alignItems: description ? "flex-start" : "center", gap: 10, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1, ...style }}>
      <input type="checkbox" checked={!!checked} disabled={disabled} onChange={(e) => onChange && onChange(e.target.checked, e)} style={{ position: "absolute", opacity: 0, width: 0, height: 0 }} />
      <span style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        width: 18, height: 18, flex: "0 0 auto", marginTop: description ? 1 : 0,
        borderRadius: "var(--radius-xs)", color: "#fff",
        background: checked ? "var(--accent-primary)" : "var(--surface-card)",
        border: "1px solid " + (checked ? "var(--accent-primary)" : "var(--border-input)"),
        transition: "var(--transition-control)",
      }}>{checked ? <Icon name="check" size={12} strokeWidth={2.5} /> : null}</span>
      <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {label ? <span style={{ fontSize: "var(--body-md-size)", color: "var(--text-body)" }}>{label}</span> : null}
        {description ? <span style={{ fontSize: "var(--caption-size)", letterSpacing: "var(--caption-ls)", color: "var(--text-muted)" }}>{description}</span> : null}
      </span>
    </label>
  );
}
