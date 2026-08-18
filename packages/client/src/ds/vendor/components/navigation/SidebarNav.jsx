import React from "react";
import { Icon } from "../core/Icon.jsx";
import { Wordmark } from "../core/Wordmark.jsx";

export function SidebarNav({ items = [], activeId, onSelect, footer, header = true, style }) {
  return (
    <nav style={{
      width: "var(--sidebar-w)", flex: "0 0 auto", boxSizing: "border-box",
      display: "flex", flexDirection: "column", gap: "var(--space-xl)",
      padding: "var(--space-lg)", background: "var(--surface-sunken)",
      borderRight: "1px solid var(--border-hairline)", ...style,
    }}>
      {header ? <div style={{ padding: "6px 8px" }}><Wordmark size={19} /></div> : null}
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {items.map((it) => {
          if (it.section) return <div key={it.section} style={{ padding: "14px 8px 6px", fontSize: "var(--micro-cap-size)", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)" }}>{it.section}</div>;
          const active = it.id === activeId;
          return <SidebarItem key={it.id} item={it} active={active} onSelect={onSelect} />;
        })}
      </div>
      <div style={{ marginTop: "auto" }}>{footer}</div>
    </nav>
  );
}

function SidebarItem({ item, active, onSelect }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      type="button" onClick={() => onSelect && onSelect(item.id)}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        all: "unset", boxSizing: "border-box", display: "flex", alignItems: "center", gap: 10,
        padding: "8px 8px", borderRadius: "var(--radius-sm)", cursor: "pointer",
        background: active ? "var(--surface-card)" : hover ? "var(--surface-hover)" : "transparent",
        boxShadow: active ? "var(--shadow-1)" : "none",
        color: active ? "var(--text-heading)" : "var(--text-nav)",
        fontFamily: "var(--font-core)", fontSize: "var(--body-tabular-size)",
        fontWeight: active ? "var(--weight-regular)" : "var(--weight-thin)",
        letterSpacing: "var(--body-tabular-ls)", transition: "var(--transition-control)",
      }}
    >
      {item.icon ? <span style={{ display: "flex", color: active ? "var(--accent-primary)" : "var(--text-muted)" }}><Icon name={item.icon} size={16} /></span> : null}
      <span style={{ flex: 1 }}>{item.label}</span>
      {item.count != null ? (
        <span style={{ fontSize: "var(--micro-size)", color: "var(--text-muted)", fontFeatureSettings: "var(--feature-numeric)", fontVariantNumeric: "tabular-nums" }}>{item.count}</span>
      ) : null}
    </button>
  );
}
