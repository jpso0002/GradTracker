import { useMemo, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { SidebarNav, IconButton, Icon, type SidebarNavItem } from "../ds";
import { useTheme } from "../theme/theme";

/**
 * The app shell: 240px sidebar, then whatever the route renders.
 *
 * Calendar and Archive were listed here until 28 September (decision D29). The
 * deadline pill on every row already shows what is due and overdue — which is
 * what a calendar was for — and Archive only duplicated the pipeline's
 * Archived tab. A sidebar entry should lead somewhere the product has built.
 */

const NAV: SidebarNavItem[] = [
  { section: "Pipeline" },
  { id: "/pipeline", label: "Applications", icon: "layers" },
  { id: "/review", label: "Needs review", icon: "sparkles" },
  { section: "Account" },
  { id: "/settings", label: "Settings", icon: "settings" },
  { id: "/docs", label: "Documentation", icon: "book-open" },
];

export interface AppShellProps {
  children: ReactNode;
  /** Badge count on "Needs review". Omitted while it is still loading — a
   *  count of 0 and a count not yet known are different claims. */
  reviewCount?: number | undefined;
}

export function AppShell({ children, reviewCount }: AppShellProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const items = useMemo<SidebarNavItem[]>(
    () =>
      NAV.map((item) =>
        item.id === "/review" && reviewCount !== undefined
          ? { ...item, count: reviewCount }
          : item,
      ),
    [reviewCount],
  );

  // `/pipeline/:jobId` must keep Applications lit — the detail panel is an
  // overlay on the pipeline, not a separate place.
  const activeId = NAV.map((i) => i.id).find(
    (id) => id !== undefined && (pathname === id || pathname.startsWith(`${id}/`)),
  );

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--surface-page)" }}>
      <SidebarNav
        items={items}
        activeId={activeId ?? "/pipeline"}
        onSelect={(id) => navigate(id)}
        footer={<ShellFooter />}
      />
      <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        {children}
      </main>
    </div>
  );
}

function ShellFooter() {
  const { theme, toggle } = useTheme();
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "var(--space-sm)",
        padding: "8px",
      }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontSize: "var(--caption-size)",
          color: "var(--text-muted)",
        }}
      >
        <Icon name="mail-check" size={14} />
        Demo mode
      </span>
      <IconButton
        icon={theme === "dark" ? "sun" : "moon"}
        label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
        onClick={toggle}
      />
    </div>
  );
}
