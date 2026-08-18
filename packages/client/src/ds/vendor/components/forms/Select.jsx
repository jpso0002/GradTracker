import React from "react";
import { Icon } from "../core/Icon.jsx";

export function Select({ label, value, onChange, options = [], hint, disabled, id, style }) {
  const [focus, setFocus] = React.useState(false);
  const fid = id || React.useId();
  return (
    <label htmlFor={fid} style={{ display: "flex", flexDirection: "column", gap: 6, ...style }}>
      {label ? <span style={{ fontSize: "var(--caption-size)", letterSpacing: "var(--caption-ls)", color: "var(--text-secondary)" }}>{label}</span> : null}
      <span style={{
        position: "relative", display: "flex", alignItems: "center",
        background: disabled ? "var(--surface-sunken)" : "var(--surface-card)",
        border: "1px solid " + (focus ? "var(--accent-primary)" : "var(--border-input)"),
        borderRadius: "var(--radius-sm)", minHeight: "var(--control-h-lg)", boxSizing: "border-box",
        boxShadow: focus ? "var(--focus-ring)" : "none", transition: "var(--transition-control)",
      }}>
        <select
          id={fid} value={value} disabled={disabled}
          onChange={(e) => onChange && onChange(e.target.value, e)}
          onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
          style={{
            all: "unset", flex: 1, padding: "8px 32px 8px 12px", cursor: "pointer",
            fontFamily: "var(--font-core)", fontSize: "var(--body-md-size)", fontWeight: "var(--weight-thin)", color: "var(--text-body)",
          }}
        >
          {options.map((o) => {
            const val = typeof o === "string" ? o : o.value;
            const lbl = typeof o === "string" ? o : o.label;
            return <option key={val} value={val}>{lbl}</option>;
          })}
        </select>
        <span style={{ position: "absolute", right: 10, color: "var(--text-muted)", pointerEvents: "none", display: "flex" }}><Icon name="chevron-down" size={15} /></span>
      </span>
      {hint ? <span style={{ fontSize: "var(--micro-size)", color: "var(--text-muted)" }}>{hint}</span> : null}
    </label>
  );
}
