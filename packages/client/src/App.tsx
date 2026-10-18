import { useEffect, useRef } from "react";
import { Navigate, Outlet, Route, Routes, useLocation, useNavigate, useOutletContext } from "react-router-dom";
import { AppShell } from "./shell/AppShell";
import { ToastHost } from "./shell/ToastHost";
import { PipelineView } from "./views/PipelineView";
import { ReviewView } from "./views/ReviewView";
import { SettingsView } from "./views/SettingsView";
import { DocsView } from "./views/DocsView";
import { ConnectView } from "./views/ConnectView";
import { SignInView, SignUpView, nextPath } from "./views/AccountViews";
import { BlankView } from "./views/BlankView";
import { api, onUnauthorized } from "./api/client";
import { useAsync } from "./hooks/useAsync";

/**
 * Routes per app-flow.md §1.1.
 *
 * `/pipeline/:jobId` is a route rather than component state so a student can
 * bookmark one application, and so browser-back closes the panel instead of
 * leaving the pipeline.
 *
 * The presentation demo has its own accounts (D40): `/signup` and `/signin`
 * sit outside the shell, as signed-out screens do, and `/connect` is the demo
 * inbox's account's first sign-in. The server answers nothing without a
 * session; when it says so, the app goes to Sign in.
 */
export function App() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const where = useRef(pathname);
  where.current = pathname;

  // Signed out mid-use — the session ended, or another tab signed out. Not
  // from the signed-out screens themselves, which expect to be signed out.
  useEffect(() => {
    onUnauthorized(() => {
      if (!/^\/(signin|signup)$/.test(where.current)) navigate("/signin", { replace: true });
    });
    return () => onUnauthorized(null);
  }, [navigate]);

  return (
    <ToastHost>
      <Routes>
        <Route path="/" element={<Start />} />
        <Route path="/signup" element={<SignUpView />} />
        <Route path="/signin" element={<SignInView />} />
        <Route path="/connect" element={<Connect />} />

        <Route element={<Shell />}>
          <Route path="/pipeline" element={<PipelineRoute />} />
          <Route path="/pipeline/:jobId" element={<PipelineRoute />} />
          {/* The queue tells the shell when it changes, so the sidebar count
              follows what the student has handled. */}
          <Route path="/review" element={<ReviewRoute />} />
          <Route path="/settings" element={<SettingsRoute />} />
          <Route path="/docs" element={<Navigate to="/docs/architecture" replace />} />
          <Route path="/docs/:page" element={<DocsView />} />
          <Route
            path="*"
            element={
              <BlankView
                title="Not found"
                icon="triangle-alert"
                description="No such page."
              />
            }
          />
        </Route>
      </Routes>
    </ToastHost>
  );
}

// ── The shell, and the sidebar's review count ───────────────────────────────

interface ShellContext {
  reloadReviewCount: () => void;
}

/**
 * The signed-in layout. It owns the sidebar's Needs review count, read when
 * the student enters the app — after signing in, or after the scan has filled
 * the dashboard — rather than once when the page first loaded, which was on
 * the sign-in screen, before there was anything to count.
 */
function Shell() {
  const review = useAsync(() => api.listReview(), []);
  const context: ShellContext = { reloadReviewCount: review.reload };
  return (
    <AppShell reviewCount={review.data?.items.length}>
      <Outlet context={context} />
    </AppShell>
  );
}

const useShell = () => useOutletContext<ShellContext>();

function PipelineRoute() {
  return <PipelineView onReviewChanged={useShell().reloadReviewCount} />;
}

function ReviewRoute() {
  return <ReviewView onChanged={useShell().reloadReviewCount} />;
}

function SettingsRoute() {
  return <SettingsView onReset={useShell().reloadReviewCount} />;
}

// ── Signed-out routes ───────────────────────────────────────────────────────

function Loading() {
  return <main aria-busy="true" style={{ minHeight: "100vh", background: "var(--surface-page)" }} />;
}

/** Where the app opens: Create your account for a newcomer; otherwise where
 *  the signed-in account belongs. */
function Start() {
  const session = useAsync(() => api.session(), []);
  if (session.error) return <Navigate to="/signin" replace />;
  if (!session.data) return <Loading />;
  return <Navigate to={session.data.user ? nextPath(session.data) : "/signup"} replace />;
}

/** The demo inbox's first scan — only for its own account, and only once. */
function Connect() {
  const session = useAsync(() => api.session(), []);
  if (session.error) return <Navigate to="/signin" replace />;
  if (!session.data) return <Loading />;
  if (!session.data.user) return <Navigate to="/signin" replace />;
  if (!session.data.canConnectInbox) return <Navigate to="/pipeline" replace />;
  return <ConnectView session={session.data} />;
}
