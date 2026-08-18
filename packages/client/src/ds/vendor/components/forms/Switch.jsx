import React from "react";

export function Switch({ checked, onChange, label, description, disabled, style }) {
  return (
    <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1, ...style }}>
      <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {label ? <span style={{ fontSize: "var(--body-md-size)", color: "var(--text-body)" }}>{label}</span> : null}
        {description ? <span style={{ fontSize: "var(--caption-size)", letterSpacing: "var(--caption-ls)", color: "var(--text-muted)" }}>{description}</span> : null}
      </span>
      <input type="checkbox" checked={!!checked} disabled={disabled} onChange={(e) => onChange && onChange(e.target.checked, e)} style={{ position: "absolute", opacity: 0, width: 0, height: 0 }} />
      <span style={{
        position: "relative", flex: "0 0 auto", width: 36, height: 20, borderRadius: "var(--radius-pill)",
        background: checked ? "var(--accent-primary)" : "var(--border-strong)",
        transition: "background-color var(--dur-base) var(--ease-standard)",
      }}>
        <span style={{
          position: "absolute", top: 2, left: checked ? 18 : 2, width: 16, height: 16,
          borderRadius: "var(--radius-pill)", background: "#fff", boxShadow: "var(--shadow-1)",
          transition: "left var(--dur-base) var(--ease-standard)",
        }} />
      </span>
    </label>
  );
}
