import * as React from "react";
export interface SearchFieldProps {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  /** Keyboard hint rendered as a <kbd> chip; "" hides it. */
  shortcut?: string;
  width?: number | string;
  style?: React.CSSProperties;
}
export declare function SearchField(props: SearchFieldProps): JSX.Element;
