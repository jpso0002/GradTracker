import * as React from "react";
export interface SelectOption { value: string; label: string }
export interface SelectProps {
  label?: string;
  value?: string;
  onChange?: (value: string, e: React.ChangeEvent<HTMLSelectElement>) => void;
  /** Plain strings or {value,label} pairs. */
  options?: Array<string | SelectOption>;
  hint?: string;
  disabled?: boolean;
  id?: string;
  style?: React.CSSProperties;
}
export declare function Select(props: SelectProps): JSX.Element;
