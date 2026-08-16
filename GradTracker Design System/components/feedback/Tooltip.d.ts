import * as React from "react";
export interface TooltipProps {
  /** Short, sentence-case, no period. */
  label: string;
  children?: React.ReactNode;
  placement?: "top" | "bottom";
  style?: React.CSSProperties;
}
export declare function Tooltip(props: TooltipProps): JSX.Element;
