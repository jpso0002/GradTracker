import * as React from "react";
export interface ConfidenceMeterProps {
  /** 0–1 or 0–100; both accepted. */
  value?: number;
  showValue?: boolean;
  width?: number;
  /** Tooltip prefix; default "AI confidence". */
  label?: string;
  style?: React.CSSProperties;
}
export declare function ConfidenceMeter(props: ConfidenceMeterProps): JSX.Element;
