import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./shell/AppShell";
import { ToastHost } from "./shell/ToastHost";
import { PipelineView } from "./views/PipelineView";
import { ReviewView } from "./views/ReviewView";
import { SettingsView } from "./views/SettingsView";
import { BlankView } from "./views/BlankView";
import { api } from "./api/client";
import { useAsync } from "./hooks/useAsync";

/**
 * Routes per app-flow.md §1.1.
 *
 * `/pipeline/:jobId` is a route rather than component state so a student can
 * bookmark one application, and so browser-back closes the panel instead of
 * leaving the pipeline.
 *
 * `/connect` is absent: T4.1–T4.3 (OAuth) are deferred on the demo track and
 * there is nothing to connect to. A Connect screen that cannot connect would
 * be a lie about what the demo does — see T5.4 in tasks.md.
 */
export function App() {
  const review = useAsync(() => api.listReview(), []);

  return (
    <ToastHost>
      <AppShell reviewCount={review.data?.items.length}>
        <Routes>
          <Route path="/" element={<Navigate to="/pipeline" replace />} />
          <Route path="/pipeline" element={<PipelineView />} />
          <Route path="/pipeline/:jobId" element={<PipelineView />} />
          {/* The queue tells the shell when it changes, so the sidebar count
              follows what the student has handled. */}
          <Route path="/review" element={<ReviewView onChanged={review.reload} />} />
          <Route path="/settings" element={<SettingsView />} />
          <Route
            path="/docs"
            element={
              <BlankView
                title="Documentation"
                icon="book-open"
                description="The Documentation Center arrives with T5.9."
              />
            }
          />
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
        </Routes>
      </AppShell>
    </ToastHost>
  );
}
