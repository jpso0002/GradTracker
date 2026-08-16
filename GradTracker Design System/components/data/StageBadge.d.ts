import * as React from "react";
export type Stage = "applied" | "assessment" | "interview" | "offer" | "rejected" | "withdrawn";
/**
 * The six-stage pipeline status pill — the single source of truth for stage colour.
 */
export interface StageBadgeProps {
  stage?: Stage;
  size?: "sm" | "md";
  /** Leading dot in the stage's saturated colour. */
  showDot?: boolean;
  /** Override the default label text (keeps the stage colour). */
  label?: string;
  style?: React.CSSProperties;
}
export declare function StageBadge(props: StageBadgeProps): JSX.Element;
export declare const STAGES: Record<Stage, { label: string; key: string }>;
