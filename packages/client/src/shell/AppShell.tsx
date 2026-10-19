import type { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Icon, Wordmark } from "../ui";
import { useTheme } from "../theme/theme";
import { api } from "../api/client";
import { useAsync } from "../hooks/useAsync";
import { OfflineBanner } from "./OfflineBanner";

/**
 * The app shell, in Will's design (D41): the sidebar, then whatever the route
 * renders.
 *
 * Pipeline, Needs review and Settings; the Light/Dark switch and the signed-in
 * account at the foot. Below 900px the sidebar narrows to its icons (Will's
 * breakpoint), every destination still in it and still named for assistive
 * technology. The Documentation page left the sidebar with the restyle; its
 * route is still there.
 */

interface Destination {
  path: string;
  label: string;
  icon: string;
}

const WORKSPACE: Destination[] = [
  { path: "/pipeline", label: "Applications", icon: "briefcase" },
  { path: "/review", label: "Needs review", icon: "inbox" },
];

const ACCOUNT: Destination[] = [{ path: "/settings", label: "Settings", icon: "settings" }];

export interface AppShellProps {
  children: ReactNode;
  /** Badge count on "Needs review". Omitted while it is still loading — a
   *  count of 0 and a count not yet known are different claims. */
  reviewCount?: number | undefined;
}

export function AppShell({ children, reviewCount }: AppShellProps) {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--surface-page)" }}>
      <Sidebar reviewCount={reviewCount} />
      <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <OfflineBanner />
        {children}
      </main>
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

function NavItem({ destination, reviewCount }: { destination: Destination; reviewCount: number | undefined }) {
  const count = destination.path === "/review" ? reviewCount : undefined;
  return (
    <NavLink
      to={destination.path}
      aria-label={spokenLabel(destination, reviewCount)}
      title={destination.label}
      className={({ isActive }) => `gt-nav-item${isActive ? " active" : ""}`}
    >
      <Icon name={destination.icon} size={18} />
      <span className="gt-nav-text">{destination.label}</span>
      {count ? (
        <>
          <span className="gt-nav-count" aria-hidden="true">
            {count}
          </span>
          <span className="gt-nav-dot" aria-hidden="true" />
        </>
      ) : null}
    </NavLink>
  );
}

function Sidebar({ reviewCount }: { reviewCount: number | undefined }) {
  return (
    <aside className="gt-sidebar">
      <div className="gt-logo">
        {/* The name where there is room for it; the mark alone in the narrow
            sidebar, where the name would be cut off. */}
        <span className="gt-logo-full">
          <Wordmark size={18} />
        </span>
        <span className="gt-logo-mark">
          <Wordmark size={18} variant="mark" />
        </span>
      </div>
      <nav aria-label="Main">
        <p className="gt-nav-label">Workspace</p>
        {WORKSPACE.map((d) => (
          <NavItem key={d.path} destination={d} reviewCount={reviewCount} />
        ))}
        <p className="gt-nav-label second">Account</p>
        {ACCOUNT.map((d) => (
          <NavItem key={d.path} destination={d} reviewCount={reviewCount} />
        ))}
      </nav>
      <div className="gt-sidebar-bottom">
        <ThemeSwitch />
        <Profile />
      </div>
    </aside>
  );
}

function ThemeSwitch() {
  const { theme, set } = useTheme();
  return (
    <div className="gt-theme-switch" role="group" aria-label="Theme">
      <button type="button" aria-pressed={theme === "light"} onClick={() => set("light")} title="Light theme">
        <Icon name="sun" size={15} />
        <span className="gt-theme-label">Light</span>
      </button>
      <button type="button" aria-pressed={theme === "dark"} onClick={() => set("dark")} title="Dark theme">
        <Icon name="moon" size={15} />
        <span className="gt-theme-label">Dark</span>
      </button>
    </div>
  );
}

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return ((words[0]?.[0] ?? "") + (words[1]?.[0] ?? "")).toUpperCase() || "?";
}

/** The signed-in account (D40), with sign-out. Without demo accounts — the dev
 *  server's single local user — there is nobody to show. */
function Profile() {
  const navigate = useNavigate();
  const session = useAsync(() => api.session(), []);
  const user = session.data?.user;
  if (!user) return null;

  const signOut = async () => {
    try {
      await api.signOut();
    } finally {
      navigate("/signin", { replace: true });
    }
  };

  return (
    <div className="gt-profile">
      <span className="gt-avatar" aria-hidden="true">
        {initials(user.name)}
      </span>
      <span className="gt-profile-text">
        <strong>{user.name}</strong>
        <span>{user.email}</span>
      </span>
      <button type="button" className="gt-icon-button" aria-label="Sign out" title="Sign out" onClick={() => void signOut()}>
        <Icon name="log-out" size={16} />
      </button>
    </div>
  );
}
