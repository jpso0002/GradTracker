import React from "react";
import { Icon } from "./Icon.jsx";

const BOX = { sm: 28, md: 32, lg: 36 };

export function IconButton({ icon, label, size = "md", variant = "ghost", shape = "round", active, disabled, onClick, style, ...rest }) {
  const [hover, setHover] = React.useState(false);
  const [press, setPress] = React.useState(false);
  const box = BOX[size] || BOX.md;
  const bg = active ? "var(--surface-selected)" : press ? "var(--surface-selected)" : hover ? "var(--surface-hover)" : variant === "outlined" ? "var(--surface-card)" : "transparent";
  return (
    <button
      type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => { setHover(false); setPress(false); }}
      onMouseDown={() => setPress(true)} onMouseUp={() => setPress(false)}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: box, height: box, borderRadius: shape === "round" ? "var(--radius-pill)" : "var(--radius-sm)",
        background: bg, color: active ? "var(--accent-primary)" : "var(--text-muted)",
        border: variant === "outlined" ? "1px solid var(--border-hairline)" : "1px solid transparent",
        cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.45 : 1,
        transition: "var(--transition-control)", ...style,
      }}
      {...rest}
    >
      <Icon name={icon} size={size === "sm" ? 14 : 16} />
    </button>
  );
}
