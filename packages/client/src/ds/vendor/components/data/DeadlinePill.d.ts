import * as React from "react";
export interface DeadlinePillProps {
  children?: React.ReactNode;
  /** Drives urgency colour: <=2 ruby, 3–7 amber, otherwise muted and chrome-less. */
  daysLeft?: number;
  /** Lucide icon name; default "calendar-clock". */
  icon?: string;
  style?: React.CSSProperties;
}
export declare function DeadlinePill(props: DeadlinePillProps): JSX.Element;
