import * as React from "react";
export interface CardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "style"> {
  children?: React.ReactNode;
  /** card = white/navy panel · sunken = tinted band · cream = warm interlude · inverse = deep-navy feature tier */
  surface?: "card" | "sunken" | "cream" | "inverse";
  /** regular = 32px marketing · compact = 24px product · cell = 16px list item · none */
  padding?: "none" | "compact" | "regular" | "cell";
  /** 0 flat · 1 hairline lift · 2 floating panel */
  elevation?: 0 | 1 | 2;
  radius?: "sm" | "md" | "lg" | "xl";
  border?: boolean;
  /** Raises to elevation 2 on hover and sets a pointer cursor. */
  interactive?: boolean;
  style?: React.CSSProperties;
}
export declare function Card(props: CardProps): JSX.Element;
