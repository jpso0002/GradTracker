// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { App } from "../App";
import { ThemeProvider } from "../theme/theme";
import { api, NetworkError } from "../api/client";
import { connectivity } from "../connectivity";

/**
 * T5.10 / decision D29. Calendar and Archive were sidebar entries leading to
 * placeholder pages. The deadline pill on every row already shows what is due
 * and overdue — what a calendar was for — and Archive only duplicated the
 * pipeline's Archived tab. Both are gone, along with their placeholder routes.
 */

beforeEach(() => {
  vi.spyOn(api, "listReview").mockResolvedValue({ items: [] });
  // The pipeline's own request is irrelevant here; leave it pending.
  vi.spyOn(api, "listJobs").mockImplementation(() => new Promise(() => {}));
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  connectivity.reset();
});

function renderAt(path: string) {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe("sidebar (T5.10)", () => {
  it("offers neither Calendar nor Archive, and no empty 'Coming soon' heading", () => {
    renderAt("/pipeline");
    const nav = screen.getByRole("navigation");
    expect(within(nav).queryByText("Calendar")).toBeNull();
    expect(within(nav).queryByText("Archive")).toBeNull();
    expect(within(nav).queryByText("Coming soon")).toBeNull();
  });

  it("keeps every destination that still exists", () => {
    // The positive control — an empty sidebar would pass the test above.
    renderAt("/pipeline");
    const nav = screen.getByRole("navigation");
    for (const label of ["Applications", "Needs review", "Settings", "Documentation"]) {
      expect(within(nav).getByText(label)).toBeDefined();
    }
  });

  it.each(["/calendar", "/archive"])("%s no longer resolves to its placeholder page", (path) => {
    renderAt(path);
    expect(screen.getAllByText("Not found").length).toBeGreaterThan(0);
    expect(screen.queryByText(/No design exists for this yet/)).toBeNull();
    expect(screen.queryByText(/are on the Archived tab of your pipeline/)).toBeNull();
  });
});

describe("offline (T5.7, app-flow.md §7)", () => {
  const kpmg = {
    id: "j1",
    company: "KPMG",
    role: "Vacationer Program",
    stage: "assessment" as const,
    deadlineAt: null,
    nextAction: "Complete online assessment",
    senderDomain: "smartrecruiters.com",
    confidence: 0.93,
    status: "active" as const,
    firstSeenAt: "2026-08-01T00:00:00.000Z",
    lastEventAt: "2026-08-14T00:00:00.000Z",
    daysLeft: null,
    followUpRequired: false,
    pendingReviewId: null,
    provenance: [],
  };
  const loaded = {
    jobs: [kpmg],
    stats: { liveApplications: 1, dueThisWeek: 0, needsReview: 0, emailsRead: 40 },
  };

  it("keeps the pipeline readable while offline, under a banner that says so", async () => {
    vi.spyOn(api, "listJobs")
      .mockResolvedValueOnce(loaded)
      .mockRejectedValueOnce(new NetworkError(new TypeError("Failed to fetch")));
    renderAt("/pipeline");
    await screen.findByText("KPMG");

    await userEvent.click(screen.getByRole("button", { name: "Refresh" }));

    expect(await screen.findByText(/You're offline/)).toBeDefined();
    // What was loaded stays on screen — the student can still read it.
    expect(screen.getByText("KPMG")).toBeDefined();
  });

  it("Try again re-reads what failed, and the banner goes once it succeeds", async () => {
    const listJobs = vi
      .spyOn(api, "listJobs")
      .mockResolvedValueOnce(loaded)
      .mockRejectedValueOnce(new NetworkError(new TypeError("Failed to fetch")))
      .mockResolvedValue(loaded);
    renderAt("/pipeline");
    await screen.findByText("KPMG");
    await userEvent.click(screen.getByRole("button", { name: "Refresh" }));
    await screen.findByText(/You're offline/);

    await userEvent.click(screen.getByRole("button", { name: "Try again" }));

    await waitFor(() => expect(screen.queryByText(/You're offline/)).toBeNull());
    expect(listJobs).toHaveBeenCalledTimes(3);
  });
});

describe("the review queue in the shell (T6.3)", () => {
  it("keeps the sidebar count in step with the queue", async () => {
    const pending = {
      eventId: "11111111-1111-4111-8111-111111111111",
      receivedAt: "2026-08-15T00:00:00.000Z",
      senderDomain: "boutique-consult.com.au",
      company: "Boutique Consulting",
      role: "Graduate Analyst",
      stage: "applied" as const,
      deadlineAt: null,
      nextAction: null,
      confidence: 0.62,
      suggestedJob: null,
    };
    // One read for the queue, one for the sidebar; after a confirm, empty.
    vi.spyOn(api, "listReview")
      .mockResolvedValueOnce({ items: [pending] })
      .mockResolvedValueOnce({ items: [pending] })
      .mockResolvedValue({ items: [] });
    vi.spyOn(api, "confirmReview").mockResolvedValue({ jobId: "j1", matched: false });
    renderAt("/review");
    const nav = screen.getByRole("navigation");

    // The count sits in its own span, so the name reads "Needs review1".
    expect(await within(nav).findByRole("button", { name: /^Needs review\s*1$/ })).toBeDefined();
    await userEvent.click(await screen.findByRole("button", { name: "Confirm" }));

    await waitFor(() => expect(within(nav).getByRole("button", { name: /^Needs review\s*0$/ })).toBeDefined());
  });
});
