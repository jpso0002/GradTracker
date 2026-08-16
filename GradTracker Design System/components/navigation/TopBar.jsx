import React from "react";

export function TopBar({ title, subtitle, children, sticky = true, style }) {
  return (
    <header style={{
      position: sticky ? "sticky" : "static", top: 0, zIndex: 5, boxSizing: "border-box",
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-lg)",
      minHeight: "var(--topbar-h)", padding: "10px var(--space-xl)",
      background: "var(--surface-page)", borderBottom: "1px solid var(--border-hairline)", ...style,
    }}>
      <span style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
        {title ? <span style={{ fontSize: "var(--heading-md-size)", lineHeight: 1.2, letterSpacing: "var(--heading-md-ls)", fontWeight: "var(--weight-thin)", color: "var(--text-heading)" }}>{title}</span> : null}
        {subtitle ? <span style={{ fontSize: "var(--caption-size)", letterSpacing: "var(--caption-ls)", color: "var(--text-muted)" }}>{subtitle}</span> : null}
      </span>
      <span style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>{children}</span>
    </header>
  );
}
