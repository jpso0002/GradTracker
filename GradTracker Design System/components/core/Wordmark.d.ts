import * as React from "react";
export interface WordmarkProps {
  /** Type size in px: 18–20 in app chrome, 28–40 in marketing. The mark scales with it (1.45x). */
  size?: number;
  /** "inverse" for navy / indigo surfaces. */
  tone?: "auto" | "inverse";
  /** "lockup" = mark + name (default), "wordmark" = name only, "mark" = glyph only. */
  variant?: "lockup" | "wordmark" | "mark";
  /** Legacy indigo period after the name. Off by default now that the mark carries the accent. */
  showDot?: boolean;
  style?: React.CSSProperties;
}
export declare function Wordmark(props: WordmarkProps): JSX.Element;

export interface LogoMarkProps {
  /** Rendered square size in px. Minimum legible size is 16. */
  size?: number;
  tone?: "auto" | "inverse";
  /** Accessible name; omit for decorative use. */
  title?: string;
  style?: React.CSSProperties;
}
export declare function LogoMark(props: LogoMarkProps): JSX.Element;
