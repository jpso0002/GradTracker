// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor, cleanup, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { ListJobsResponse, SyncResult } from "@gradtracker/shared";
import { PipelineView } from "./PipelineView";
import { ToastHost } from "../shell/ToastHost";
import { api, ApiError } from "../api/client";
import { syncSummary } from "../syncSummary";

/**
 * Refresh in the presentation demo (D36): it reads new mail, says what it did,
 * and reloads. Outside the demo it reloads quietly, as it always did.
 */

const EMPTY: ListJobsResponse = {
  jobs: [],
  stats: { liveApplications: 0, dueThisWeek: 0, needsReview: 0, emailsRead: 612 },
};

const BOTH: SyncResult = {
  emailsRead: 2,
  newApplications: 0,
  updatedApplications: 1,
  stageChanges: 1,
  needsReview: 1,
  ignored: 0,
};

beforeEach(() => {
  vi.spyOn(api, "listReview").mockResolvedValue({ items: [] });
  vi.spyOn(api, "listJobs").mockResolvedValue(EMPTY);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderPipeline(onReviewChanged = vi.fn()) {
  render(
    <ToastHost>
      <MemoryRouter initialEntries={["/pipeline"]}>
        <Routes>
          <Route path="/pipeline" element={<PipelineView onReviewChanged={onReviewChanged} />} />
        </Routes>
      </MemoryRouter>
    </ToastHost>,
  );
  return onReviewChanged;
}

describe("syncSummary", () => {
  it("says what arrived, in counts", () => {
    expect(syncSummary(BOTH)).toBe("2 new emails — 1 application updated, 1 to review");
    expect(syncSummary({ ...BOTH, emailsRead: 1, updatedApplications: 0, needsReview: 0, newApplications: 1 })).toBe(
      "1 new email — 1 new application",
    );
    expect(syncSummary({ ...BOTH, emailsRead: 0 })).toBe("No new emails");
  });
});

describe("Refresh (D36)", () => {
  it("reads new mail, says what happened, and reloads the dashboard and the sidebar count", async () => {
    const sync = vi.spyOn(api, "sync").mockResolvedValue(BOTH);
    const onReviewChanged = renderPipeline();
    await waitFor(() => expect(api.listJobs).toHaveBeenCalledTimes(1));

    await userEvent.click(screen.getByRole("button", { name: "Sync inbox" }));

    expect(sync).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("2 new emails — 1 application updated, 1 to review")).toBeDefined();
    await waitFor(() => expect(api.listJobs).toHaveBeenCalledTimes(2));
    expect(onReviewChanged).toHaveBeenCalled();
  });

  it("reloads quietly where there is no inbox to read", async () => {
    vi.spyOn(api, "sync").mockRejectedValue(new ApiError(501, "Live sync is not available here."));
    renderPipeline();
    await waitFor(() => expect(api.listJobs).toHaveBeenCalledTimes(1));

    await userEvent.click(screen.getByRole("button", { name: "Sync inbox" }));

    await waitFor(() => expect(api.listJobs).toHaveBeenCalledTimes(2));
    expect(screen.queryByText(/not available/)).toBeNull();
  });

  it("shows why the demo inbox could not be read", async () => {
    vi.spyOn(api, "sync").mockRejectedValue(new ApiError(502, "Could not sign in to the demo inbox."));
    renderPipeline();

    await userEvent.click(await screen.findByRole("button", { name: "Sync inbox" }));

    expect(await screen.findByText("Could not sign in to the demo inbox.")).toBeDefined();
  });

  it("runs the backup emails on Ctrl+Alt+R, and not on a bare R", async () => {
    const backup = vi.spyOn(api, "syncBackup").mockResolvedValue(BOTH);
    renderPipeline();
    await waitFor(() => expect(api.listJobs).toHaveBeenCalledTimes(1));

    fireEvent.keyDown(window, { key: "r", code: "KeyR" });
    expect(backup).not.toHaveBeenCalled();

    fireEvent.keyDown(window, { key: "r", code: "KeyR", ctrlKey: true, altKey: true });
    expect(backup).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("2 new emails — 1 application updated, 1 to review")).toBeDefined();
  });
});
