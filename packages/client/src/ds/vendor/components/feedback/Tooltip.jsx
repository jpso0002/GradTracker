import React from "react";

export function Tooltip({ label, children, placement = "top", style }) {
  const [show, setShow] = React.useState(false);
  const pos = placement === "bottom"
    ? { top: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)" }
    : { bottom: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)" };
  return (
    <span
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}
      style={{ position: "relative", display: "inline-flex", ...style }}
    >
      {children}
      {show ? (
        <span role="tooltip" style={{
          position: "absolute", zIndex: 40, ...pos, whiteSpace: "nowrap", pointerEvents: "none",
          padding: "5px 8px", borderRadius: "var(--radius-xs)",
          background: "var(--indigo-900)", color: "#fff",
          fontSize: "var(--micro-size)", lineHeight: 1.3, boxShadow: "var(--shadow-2)",
        }}>{label}</span>
      ) : null}
    </span>
  );
}
