import * as React from "react";
import type { Stage } from "./StageBadge";
/**
 * One application in the ranked pipeline table.
 */
export interface ApplicationRowProps {
  company: string;
  role: string;
  stage?: Stage;
  /** The single next thing the student must do, sentence case, no trailing period. */
  nextAction?: string;
  /** Formatted deadline text, e.g. "14 Sep · 09:00". */
  deadline?: string;
  /** Days until the deadline — drives the pill's urgency colour. */
  daysLeft?: number;
  /** Where the row was detected from; shown as the chevron tooltip. */
  source?: string;
  selected?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  style?: React.CSSProperties;
}
export declare function ApplicationRow(props: ApplicationRowProps): JSX.Element;
