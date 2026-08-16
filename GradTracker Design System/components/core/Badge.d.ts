import * as React from "react";
export interface BadgeProps {
  children?: React.ReactNode;
  /** ai = the pale-indigo "extracted by GradTracker" marker. */
  tone?: "neutral" | "indigo" | "ai" | "jade" | "ruby" | "amber";
  /** 10px all-caps eyebrow (default) vs 11px sentence case. */
  uppercase?: boolean;
  style?: React.CSSProperties;
}
export declare function Badge(props: BadgeProps): JSX.Element;
