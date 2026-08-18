import React from "react";
import { Icon } from "./Icon.jsx";

const SIZES = {
  sm: { padding: "6px 14px", fontSize: "var(--button-sm-size)", minHeight: 30, gap: 6, icon: 14 },
  md: { padding: "8px 16px", fontSize: "var(--button-md-size)", minHeight: 36, gap: 8, icon: 16 },
  lg: { padding: "11px 20px", fontSize: "var(--button-md-size)", minHeight: 44, gap: 8, icon: 16 },
};

function skin(variant, hover, press) {
  if (variant === "primary")
    return { background: press ? "var(--accent-primary-press)" : hover ? "var(--accent-primary-hover)" : "var(--accent-primary)", color: "var(--text-on-primary)", border: "1px solid transparent" };
  if (variant === "secondary")
    return { background: press ? "var(--accent-primary-wash)" : hover ? "var(--accent-primary-wash)" : "var(--surface-card)", color: "var(--accent-primary)", border: "1px solid var(--accent-primary)" };
  if (variant === "onDark")
    return { background: press ? "#0f1132" : hover ? "#262a68" : "var(--indigo-900)", color: "#ffffff", border: "1px solid transparent" };
  if (variant === "quiet")
    return { background: press ? "var(--surface-selected)" : hover ? "var(--surface-hover)" : "transparent", color: "var(--text-secondary)", border: "1px solid var(--border-hairline)" };
  return { background: hover ? "var(--surface-hover)" : "transparent", color: "var(--text-secondary)", border: "1px solid transparent" };
}

export function Button({ children, variant = "primary", size = "md", iconLeft, iconRight, disabled, fullWidth, type = "button", onClick, style, ...rest }) {
  const [hover, setHover] = React.useState(false);
  const [press, setPress] = React.useState(false);
  const s = SIZES[size] || SIZES.md;
  const look = skin(variant, hover && !disabled, press && !disabled);
  return (
    <button
      type={type} disabled={disabled} onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => { setHover(false); setPress(false); }}
      onMouseDown={() => setPress(true)} onMouseUp={() => setPress(false)}
      style={{
        display: fullWidth ? "flex" : "inline-flex", width: fullWidth ? "100%" : undefined,
        alignItems: "center", justifyContent: "center", gap: s.gap,
        padding: s.padding, minHeight: s.minHeight, borderRadius: "var(--radius-pill)",
        fontFamily: "var(--font-core)", fontSize: s.fontSize, fontWeight: "var(--weight-regular)",
        lineHeight: 1, letterSpacing: 0, fontFeatureSettings: "var(--feature-core)",
        cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.45 : 1,
        transition: "var(--transition-control)", ...look, ...style,
      }}
      {...rest}
    >
      {iconLeft ? <Icon name={iconLeft} size={s.icon} /> : null}
      {children}
      {iconRight ? <Icon name={iconRight} size={s.icon} /> : null}
    </button>
  );
}
