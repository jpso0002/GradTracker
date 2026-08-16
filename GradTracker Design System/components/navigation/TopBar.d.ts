import * as React from "react";
export interface TopBarProps {
  title?: string;
  /** One line of context, e.g. "Synced 4 minutes ago · 23 live". */
  subtitle?: string;
  /** Right-aligned actions: search, filters, primary button. */
  children?: React.ReactNode;
  sticky?: boolean;
  style?: React.CSSProperties;
}
export declare function TopBar(props: TopBarProps): JSX.Element;
