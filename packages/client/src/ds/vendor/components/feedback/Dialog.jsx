import React from "react";
import { IconButton } from "../core/IconButton.jsx";

export function Dialog({ open = true, title, description, children, footer, width = 460, onClose, style }) {
  if (!open) return null;
  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--scrim)", padding: "var(--space-xl)",
      backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)",
    }} onClick={onClose}>
      <div
        role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}
        style={{
          width, maxWidth: "100%", boxSizing: "border-box", background: "var(--surface-card)",
          border: "1px solid var(--border-hairline)", borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-3)", padding: "var(--card-pad-compact)",
          display: "flex", flexDirection: "column", gap: "var(--space-lg)", ...style,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-lg)" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
            {title ? <span style={{ fontSize: "var(--heading-md-size)", lineHeight: 1.2, letterSpacing: "var(--heading-md-ls)", color: "var(--text-heading)" }}>{title}</span> : null}
            {description ? <span style={{ fontSize: "var(--body-md-size)", color: "var(--text-muted)" }}>{description}</span> : null}
          </div>
          {onClose ? <IconButton icon="x" label="Close" onClick={onClose} /> : null}
        </div>
        {children}
        {footer ? <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-sm)" }}>{footer}</div> : null}
      </div>
    </div>
  );
}
