import * as React from "react";
export interface StatCardProps {
  /** All-caps micro eyebrow, e.g. "LIVE APPLICATIONS". */
  label: string;
  /** Rendered in tabular display type. */
  value: React.ReactNode;
  /** Short change string, e.g. "+3 this week". */
  delta?: string;
  deltaTone?: "up" | "down" | "neutral";
  /** Lucide icon name shown beside the label. */
  icon?: string;
  style?: React.CSSProperties;
}
export declare function StatCard(props: StatCardProps): JSX.Element;
