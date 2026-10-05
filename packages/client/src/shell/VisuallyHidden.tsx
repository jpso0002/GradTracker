import type { CSSProperties, ReactNode } from "react";

/** On the page for assistive technology, off it for the eye. */
export const visuallyHidden: CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
  border: 0,
};

/**
 * Text for assistive technology only — a label the design has no room to show,
 * such as the search box's, whose placeholder is not a label.
 */
export function VisuallyHidden({ children }: { children: ReactNode }) {
  return <span style={visuallyHidden}>{children}</span>;
}
