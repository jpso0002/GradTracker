import * as React from "react";
export interface IconButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "style"> {
  /** Lucide icon name. */
  icon: string;
  /** Required accessible label — also used as the tooltip title. */
  label: string;
  size?: "sm" | "md" | "lg";
  variant?: "ghost" | "outlined";
  shape?: "round" | "square";
  active?: boolean;
  disabled?: boolean;
  style?: React.CSSProperties;
}
export declare function IconButton(props: IconButtonProps): JSX.Element;
