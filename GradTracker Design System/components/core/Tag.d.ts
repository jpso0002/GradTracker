import * as React from "react";
export interface TagProps {
  children?: React.ReactNode;
  /** Lucide icon name shown at 13px before the label. */
  icon?: string;
  /** Renders a trailing ✕; omit for read-only tags. */
  onRemove?: (e: React.MouseEvent) => void;
  selected?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  style?: React.CSSProperties;
}
export declare function Tag(props: TagProps): JSX.Element;
