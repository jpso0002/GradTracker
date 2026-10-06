import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { AppShell } from "./shell/AppShell";
import { ToastHost } from "./shell/ToastHost";
import { PipelineView } from "./views/PipelineView";
import { ReviewView } from "./views/ReviewView";
import { SettingsView } from "./views/SettingsView";
import { DocsView } from "./views/DocsView";
import { ConnectView } from "./views/ConnectView";
import { BlankView } from "./views/BlankView";
import { api } from "./api/client";
import { useAsync } from "./hooks/useAsync";
import { isSignedIn } from "./session";

/**
 * Routes per app-flow.md §1.1.
 *
 * `/pipeline/:jobId` is a route rather than component state so a student can
 * bookmark one application, and so browser-back closes the panel instead of
 * leaving the pipeline.
 *
 * `/connect` is the **simulated** sign-in for the presentation (D35): the app
 * opens there until the walkthrough is done in this tab, then on the
 * dashboard. It sits outside the shell, as a signed-out screen would. Real
 * sign-in (T4.1–T4.3) stays deferred — nothing here authenticates anyone.
 */
export function App() {
  const review = useAsync(() => api.listReview(), []);

  return (
    <ToastHost>
      <Routes>
        <Route path="/" element={<Start />} />
        <Route path="/connect" element={<Connect />} />

        <Route
          element={
            <AppShell reviewCount={review.data?.items.length}>
              <Outlet />
            </AppShell>
          }
        >
          <Route path="/pipeline" element={<PipelineView />} />
          <Route path="/pipeline/:jobId" element={<PipelineView />} />
          {/* The queue tells the shell when it changes, so the sidebar count
              follows what the student has handled. */}
          <Route path="/review" element={<ReviewView onChanged={review.reload} />} />
          <Route path="/settings" element={<SettingsView />} />
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

// Each reads the session when its route renders, not when App last rendered:
// App does not re-render on navigation, so a decision made there goes stale —
// after Sign out, /connect would still send the student to the dashboard.

/** Where the app opens: the walkthrough until it is done in this tab. */
function Start() {
  return <Navigate to={isSignedIn() ? "/pipeline" : "/connect"} replace />;
}

/** The walkthrough, once; after that, the dashboard. */
function Connect() {
  return isSignedIn() ? <Navigate to="/pipeline" replace /> : <ConnectView />;
}
