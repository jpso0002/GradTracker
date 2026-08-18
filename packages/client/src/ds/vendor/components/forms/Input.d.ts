import * as React from "react";
export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "style"> {
  label?: string;
  /** Helper text under the field; hidden while `error` is set. */
  hint?: string;
  /** Error message — also turns the border ruby. */
  error?: string;
  /** Lucide icon name rendered inside the field. */
  iconLeft?: string;
  /** Tabular figures — set for dates, salaries, counts. */
  numeric?: boolean;
  style?: React.CSSProperties;
}
export declare function Input(props: InputProps): JSX.Element;
