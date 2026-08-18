import * as React from "react";
export interface SidebarNavItem {
  id?: string;
  label?: string;
  /** Lucide icon name. */
  icon?: string;
  /** Tabular count on the right edge. */
  count?: number;
  /** Renders an all-caps group heading instead of a link. */
  section?: string;
}
export interface SidebarNavProps {
  items?: SidebarNavItem[];
  activeId?: string;
  onSelect?: (id: string) => void;
  /** Pinned to the bottom — account row, inbox-sync status, upgrade card. */
  footer?: React.ReactNode;
  /** Show the wordmark at the top. */
  header?: boolean;
  style?: React.CSSProperties;
}
export declare function SidebarNav(props: SidebarNavProps): JSX.Element;
