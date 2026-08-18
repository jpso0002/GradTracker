import React from "react";
import { Icon } from "../core/Icon.jsx";

export function Input({ label, hint, error, iconLeft, value, onChange, placeholder, type = "text", disabled, numeric, id, style, ...rest }) {
  const [focus, setFocus] = React.useState(false);
  const fid = id || React.useId();
  const border = error ? "var(--ruby)" : focus ? "var(--accent-primary)" : "var(--border-input)";
  return (
    <label htmlFor={fid} style={{ display: "flex", flexDirection: "column", gap: 6, ...style }}>
      {label ? <span style={{ fontSize: "var(--caption-size)", letterSpacing: "var(--caption-ls)", color: "var(--text-secondary)", fontWeight: "var(--weight-regular)" }}>{label}</span> : null}
      <span style={{
        display: "flex", alignItems: "center", gap: 8, padding: "8px 12px",
        background: disabled ? "var(--surface-sunken)" : "var(--surface-card)",
        border: "1px solid " + border, borderRadius: "var(--radius-sm)",
        boxShadow: focus ? "var(--focus-ring)" : "none", transition: "var(--transition-control)",
        minHeight: "var(--control-h-lg)", boxSizing: "border-box",
      }}>
        {iconLeft ? <span style={{ color: "var(--text-muted)", display: "flex" }}><Icon name={iconLeft} size={15} /></span> : null}
        <input
          id={fid} type={type} value={value} onChange={onChange} placeholder={placeholder} disabled={disabled}
          onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
          style={{
            all: "unset", flex: 1, minWidth: 0, fontFamily: "var(--font-core)",
            fontSize: "var(--body-md-size)", fontWeight: "var(--weight-thin)", color: "var(--text-body)",
            fontFeatureSettings: numeric ? "var(--feature-numeric)" : "var(--feature-core)",
            fontVariantNumeric: numeric ? "tabular-nums" : undefined,
          }}
          {...rest}
        />
      </span>
      {error || hint ? (
        <span style={{ fontSize: "var(--micro-size)", color: error ? "var(--ruby-deep)" : "var(--text-muted)" }}>{error || hint}</span>
      ) : null}
    </label>
  );
}
