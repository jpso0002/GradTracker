import * as React from "react";
export interface IconProps {
  /** Lucide icon name, kebab or pascal case: "chevron-down" | "ChevronDown". */
  name: string;
  /** Pixel box. 14 in dense tables, 16 default, 20 in nav, 24 in empty states. */
  size?: number;
  /** Lucide stroke weight. Keep 1.75; 1.5 only on 24px+ display glyphs. */
  strokeWidth?: number;
  color?: string;
  /** Accessible label. Omit for decorative icons (renders aria-hidden). */
  title?: string;
  style?: React.CSSProperties;
  className?: string;
}
export declare function Icon(props: IconProps): JSX.Element;
