import * as React from "react";
export interface EmptyStateProps {
  /** Lucide icon name inside a pale-indigo disc. */
  icon?: string;
  title?: string;
  description?: string;
  /** A single Button — the one thing to do next. */
  action?: React.ReactNode;
  /** Tighter vertical padding for in-panel emptiness. */
  compact?: boolean;
  style?: React.CSSProperties;
}
export declare function EmptyState(props: EmptyStateProps): JSX.Element;
