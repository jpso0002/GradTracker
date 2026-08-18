import * as React from "react";
export interface ToastProps {
  children?: React.ReactNode;
  tone?: "info" | "success" | "warning" | "error";
  /** Usually a ghost Button, e.g. "Undo". */
  action?: React.ReactNode;
  onDismiss?: () => void;
  style?: React.CSSProperties;
}
export declare function Toast(props: ToastProps): JSX.Element;
