import * as React from "react";
export interface TabItem { id: string; label: string; count?: number }
export interface TabsProps {
  tabs?: TabItem[];
  activeId?: string;
  onSelect?: (id: string) => void;
  style?: React.CSSProperties;
}
export declare function Tabs(props: TabsProps): JSX.Element;
