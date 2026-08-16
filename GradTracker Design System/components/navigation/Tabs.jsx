import React from "react";

export function Tabs({ tabs = [], activeId, onSelect, style }) {
  return (
    <div role="tablist" style={{ display: "flex", alignItems: "center", gap: "var(--space-xl)", borderBottom: "1px solid var(--border-hairline)", ...style }}>
      {tabs.map((t) => {
        const active = t.id === activeId;
        return (
          <button
            key={t.id} role="tab" aria-selected={active} onClick={() => onSelect && onSelect(t.id)}
            style={{
              all: "unset", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6,
              padding: "10px 0", marginBottom: -1,
              borderBottom: "2px solid " + (active ? "var(--accent-primary)" : "transparent"),
              color: active ? "var(--text-heading)" : "var(--text-muted)",
              fontFamily: "var(--font-core)", fontSize: "var(--body-tabular-size)",
              letterSpacing: "var(--body-tabular-ls)", transition: "var(--transition-control)",
            }}
          >
            {t.label}
            {t.count != null ? <span style={{ fontSize: "var(--micro-size)", color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>{t.count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
