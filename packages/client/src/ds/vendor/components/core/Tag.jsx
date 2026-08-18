import React from "react";
import { Icon } from "./Icon.jsx";

export function Tag({ children, icon, onRemove, selected, onClick, style }) {
  const [hover, setHover] = React.useState(false);
  return (
    <span
      onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "5px 10px", borderRadius: "var(--radius-pill)",
        background: selected ? "var(--surface-selected)" : hover && onClick ? "var(--surface-hover)" : "var(--surface-card)",
        border: "1px solid " + (selected ? "var(--accent-primary)" : "var(--border-hairline)"),
        color: selected ? "var(--accent-primary)" : "var(--text-secondary)",
        fontSize: "var(--caption-size)", letterSpacing: "var(--caption-ls)",
        cursor: onClick ? "pointer" : "default", transition: "var(--transition-control)", ...style,
      }}
    >
      {icon ? <Icon name={icon} size={13} /> : null}
      {children}
      {onRemove ? (
        <span onClick={(e) => { e.stopPropagation(); onRemove(e); }} style={{ display: "inline-flex", cursor: "pointer", opacity: 0.6 }}>
          <Icon name="x" size={12} />
        </span>
      ) : null}
    </span>
  );
}
