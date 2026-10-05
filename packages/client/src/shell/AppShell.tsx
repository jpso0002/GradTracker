import { useMemo, type ReactNode } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { SidebarNav, IconButton, Icon, type SidebarNavItem } from "../ds";
import { useTheme } from "../theme/theme";
import { useBreakpoint } from "../hooks/useBreakpoint";
import { OfflineBanner } from "./OfflineBanner";

/**
 * The app shell: navigation, then whatever the route renders.
 *
 * Calendar and Archive were listed here until 28 September (decision D29). The
 * deadline pill on every row already shows what is due and overdue — which is
 * what a calendar was for — and Archive only duplicated the pipeline's
 * Archived tab. A sidebar entry should lead somewhere the product has built.
 *
 * The navigation changes shape with the width (design.md §11, T5.8): the
 * 240px sidebar from 1024px up, a 56px icon rail on a tablet, a bottom tab bar
 * on a phone. Every destination stays in all three — nothing reachable on a
 * desktop is hidden on a phone.
 */

const NAV: SidebarNavItem[] = [
  { section: "Pipeline" },
  { id: "/pipeline", label: "Applications", icon: "layers" },
  { id: "/review", label: "Needs review", icon: "sparkles" },
  { section: "Account" },
  { id: "/settings", label: "Settings", icon: "settings" },
  { id: "/docs", label: "Documentation", icon: "book-open" },
];

interface Destination {
  path: string;
  label: string;
  /** What a phone's tab bar has room for. */
  short: string;
  icon: string;
}

const DESTINATIONS: Destination[] = [
  { path: "/pipeline", label: "Applications", short: "Applications", icon: "layers" },
  { path: "/review", label: "Needs review", short: "Review", icon: "sparkles" },
  { path: "/settings", label: "Settings", short: "Settings", icon: "settings" },
  { path: "/docs", label: "Documentation", short: "Docs", icon: "book-open" },
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
  const breakpoint = useBreakpoint();

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

  const main = (
    <main
      style={{
        flex: 1,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        // Room for the fixed tab bar, so it never covers the last row.
        ...(breakpoint === "mobile" ? { paddingBottom: "calc(var(--touch-min) + var(--space-xl))" } : {}),
      }}
    >
      <OfflineBanner />
      {children}
    </main>
  );

  if (breakpoint === "mobile") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--surface-page)" }}>
        {main}
        <TabBar reviewCount={reviewCount} />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--surface-page)" }}>
      {breakpoint === "tablet" ? (
        <IconRail reviewCount={reviewCount} />
      ) : (
        <SidebarNav
          items={items}
          activeId={activeId ?? "/pipeline"}
          onSelect={(id) => navigate(id)}
          footer={<ShellFooter />}
        />
      )}
      {main}
    </div>
  );
}

/** "Needs review, 4" — the count is part of the name, not just a number drawn
 *  beside it. */
function spokenLabel(destination: Destination, reviewCount: number | undefined): string {
  return destination.path === "/review" && reviewCount !== undefined
    ? `${destination.label}, ${reviewCount}`
    : destination.label;
}

/** Tablet: the sidebar collapsed to its icons, each named and tooltipped. */
function IconRail({ reviewCount }: { reviewCount: number | undefined }) {
  const { theme, toggle } = useTheme();
  return (
    <nav
      aria-label="Main"
      style={{
        width: "calc(var(--touch-min) + var(--space-md))",
        flex: "0 0 auto",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "var(--space-xs)",
        padding: "var(--space-lg) 0",
        background: "var(--surface-sunken)",
        borderRight: "1px solid var(--border-hairline)",
      }}
    >
      {DESTINATIONS.map((destination) => (
        <NavLink
          key={destination.path}
          to={destination.path}
          aria-label={spokenLabel(destination, reviewCount)}
          title={destination.label}
          style={({ isActive }) => ({
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "var(--touch-min)",
            minHeight: "var(--touch-min)",
            borderRadius: "var(--radius-sm)",
            background: isActive ? "var(--surface-card)" : "transparent",
            boxShadow: isActive ? "var(--shadow-1)" : "none",
            color: isActive ? "var(--accent-primary)" : "var(--text-nav)",
            textDecoration: "none",
          })}
        >
          <Icon name={destination.icon} size={20} />
          {destination.path === "/review" && reviewCount ? (
            <span
              aria-hidden="true"
              style={{
                position: "absolute",
                top: 2,
                right: 2,
                fontSize: "var(--micro-size)",
                color: "var(--text-heading)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {reviewCount}
            </span>
          ) : null}
        </NavLink>
      ))}
      <div style={{ marginTop: "auto" }}>
        <IconButton
          icon={theme === "dark" ? "sun" : "moon"}
          label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          onClick={toggle}
          style={{ minWidth: "var(--touch-min)", minHeight: "var(--touch-min)" }}
        />
      </div>
    </nav>
  );
}

/** Phone: a bottom tab bar. The theme lives in Settings here. */
function TabBar({ reviewCount }: { reviewCount: number | undefined }) {
  return (
    <nav
      aria-label="Main"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 20,
        display: "flex",
        background: "var(--surface-card)",
        borderTop: "1px solid var(--border-hairline)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {DESTINATIONS.map((destination) => (
        <NavLink
          key={destination.path}
          to={destination.path}
          aria-label={spokenLabel(destination, reviewCount)}
          style={({ isActive }) => ({
            flex: 1,
            minWidth: 0,
            minHeight: "var(--touch-min)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "var(--space-xxs)",
            padding: "var(--space-xs) 0",
            // The active tab is marked by the bar above it and by its weight
            // — accent-coloured small text is 3.18:1 on a dark card.
            boxShadow: isActive ? "inset 0 2px 0 var(--accent-primary)" : "none",
            color: isActive ? "var(--text-heading)" : "var(--text-nav)",
            fontWeight: isActive ? "var(--weight-regular)" : "var(--weight-thin)",
            fontSize: "var(--micro-size)",
            textDecoration: "none",
          })}
        >
          <Icon name={destination.icon} size={20} />
          <span>
            {destination.short}
            {destination.path === "/review" && reviewCount ? ` ${reviewCount}` : ""}
          </span>
        </NavLink>
      ))}
    </nav>
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
          // The sidebar's own text colour: muted text is 4.49:1 on its
          // sunken surface, just short of AA (T6.5).
          color: "var(--text-nav)",
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
