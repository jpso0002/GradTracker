import React from "react";
import { Icon } from "../core/Icon.jsx";

export function SearchField({ value, onChange, placeholder = "Search applications", shortcut = "/", width, style }) {
  const [focus, setFocus] = React.useState(false);
  return (
    <span style={{
      display: "flex", alignItems: "center", gap: 8, width: width || 280, boxSizing: "border-box",
      padding: "7px 10px", borderRadius: "var(--radius-sm)",
      background: focus ? "var(--surface-card)" : "var(--surface-sunken)",
      border: "1px solid " + (focus ? "var(--accent-primary)" : "var(--border-hairline)"),
      transition: "var(--transition-control)", ...style,
    }}>
      <span style={{ color: "var(--text-muted)", display: "flex" }}><Icon name="search" size={15} /></span>
      <input
        value={value} onChange={onChange} placeholder={placeholder}
        onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
        style={{ all: "unset", flex: 1, minWidth: 0, fontFamily: "var(--font-core)", fontSize: "var(--body-tabular-size)", fontWeight: "var(--weight-thin)", color: "var(--text-body)" }}
      />
      {shortcut && !focus ? (
        <kbd style={{
          fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)",
          border: "1px solid var(--border-hairline)", borderRadius: "var(--radius-xs)",
          padding: "1px 5px", background: "var(--surface-card)",
        }}>{shortcut}</kbd>
      ) : null}
    </span>
  );
}
