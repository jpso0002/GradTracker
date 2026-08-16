import React from "react";

/* The signature atmospheric backdrop: cream -> sherbet -> lavender -> indigo -> pink,
   washed across the upper third of a marketing page. CSS radial-gradient approximation
   of the reference's organic SVG mesh (no mesh asset was supplied). */
export function GradientMesh({ height = 420, dark, children, style }) {
  return (
    <div style={{ position: "relative", isolation: "isolate", ...style }}>
      <div aria-hidden="true" style={{
        position: "absolute", top: 0, left: 0, right: 0, height,
        background: dark ? "var(--mesh-marketing-dark)" : "var(--mesh-marketing)",
        filter: "blur(28px)", transform: "translateZ(0)",
        maskImage: "linear-gradient(to bottom, #000 55%, transparent 100%)",
        WebkitMaskImage: "linear-gradient(to bottom, #000 55%, transparent 100%)",
        zIndex: -1, pointerEvents: "none",
      }} />
      {children}
    </div>
  );
}
