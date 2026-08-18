import * as React from "react";
export interface DialogProps {
  open?: boolean;
  title?: string;
  /** One-line explanation under the title. */
  description?: string;
  children?: React.ReactNode;
  /** Right-aligned action row — quiet cancel, then primary. */
  footer?: React.ReactNode;
  width?: number;
  onClose?: () => void;
  style?: React.CSSProperties;
}
export declare function Dialog(props: DialogProps): JSX.Element | null;
