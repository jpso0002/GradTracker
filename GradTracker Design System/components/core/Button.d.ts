import * as React from "react";
/**
 * Pill button. One filled primary per band or panel.
 */
export interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "style"> {
  children?: React.ReactNode;
  /** primary = filled indigo (one per band) · secondary = indigo outline · onDark = navy fill · quiet = hairline neutral · ghost = no chrome */
  variant?: "primary" | "secondary" | "onDark" | "quiet" | "ghost";
  size?: "sm" | "md" | "lg";
  /** Lucide icon name rendered before the label. */
  iconLeft?: string;
  /** Lucide icon name rendered after the label. */
  iconRight?: string;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: React.CSSProperties;
}
export declare function Button(props: ButtonProps): JSX.Element;
