// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor, cleanup, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { Job, ListJobsResponse } from "@gradtracker/shared";
import { App } from "../App";
import { ThemeProvider } from "../theme/theme";
import { PipelineView } from "./PipelineView";
import { ToastHost } from "../shell/ToastHost";
import { api } from "../api/client";
import { connectivity } from "../connectivity";

/**
 * T5.8 — responsive behaviour (design.md §11). The done-when: the pipeline is
 * usable at 375px, with 44px touch targets and **identical ranking** — SM-4 is
 * not a desktop-only promise.
 *
 * jsdom has no layout, so the width is simulated through `matchMedia`; the
 * pixel sizes themselves are measured in a real browser.
 */

function setViewport(width: number) {
  window.matchMedia = ((query: string) => {
    const min = /min-width:\s*(\d+)px/.exec(query);
    const max = /max-width:\s*(\d+)px/.exec(query);
    const matches = (!min || width >= Number(min[1])) && (!max || width <= Number(max[1]));
    return {
      matches,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    };
  }) as unknown as typeof window.matchMedia;
}

function job(over: Partial<Job> = {}): Job {
  return {
    id: "j1",
    company: "KPMG",
    role: "Vacationer Program",
    stage: "assessment",
    deadlineAt: "2026-08-20T04:00:00.000Z",
    nextAction: "Complete online assessment",
    senderDomain: "smartrecruiters.com",
    confidence: 0.93,
    status: "active",
    firstSeenAt: "2026-08-01T00:00:00.000Z",
    lastEventAt: "2026-08-14T00:00:00.000Z",
    daysLeft: 2,
    followUpRequired: false,
    pendingReviewId: null,
    provenance: [],
    ...over,
  };
}

// Server order, deliberately neither alphabetical nor by deadline.
const RANKED = [
  job({ id: "a", company: "Zip Co", role: "Graduate Data Scientist", stage: "offer", daysLeft: -1 }),
  job({ id: "b", company: "Atlassian", role: "Graduate Engineer" }),
  job({ id: "c", company: "NAB", role: "Graduate Program", deadlineAt: null, daysLeft: null, nextAction: null }),
];
const pipeline = (jobs: Job[]): ListJobsResponse => ({
  jobs,
  stats: { liveApplications: jobs.length, dueThisWeek: 1, needsReview: 0, emailsRead: 612 },
});

const realMatchMedia = window.matchMedia;

beforeEach(() => {
  vi.spyOn(api, "listReview").mockResolvedValue({ items: [] });
  vi.spyOn(api, "listJobs").mockResolvedValue(pipeline(RANKED));
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  connectivity.reset();
  window.matchMedia = realMatchMedia;
});

function renderApp(path = "/pipeline") {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </ThemeProvider>,
  );
}

function renderPipeline(path = "/pipeline") {
  return render(
    <ToastHost>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/pipeline" element={<PipelineView />} />
          <Route path="/pipeline/:jobId" element={<PipelineView />} />
        </Routes>
      </MemoryRouter>
    </ToastHost>,
  );
}

const order = () =>
  screen
    .getAllByRole("listitem")
    .map((item) => RANKED.find((j) => item.textContent?.includes(j.company))?.company);

describe("at 375px — a phone (T5.8)", () => {
  beforeEach(() => setViewport(375));

  it("keeps every destination in the narrowed sidebar, each named (D41)", async () => {
    // Will's design narrows the sidebar to its icons below 900px — by CSS, so
    // here only the names can be checked: every link still says where it goes.
    renderApp();
    const nav = await screen.findByRole("navigation", { name: "Main" });

    for (const label of ["Applications", "Needs review", "Settings"]) {
      expect(within(nav).getByRole("link", { name: new RegExp(`^${label}`) })).toBeDefined();
    }
    expect(within(nav).getByRole("link", { name: /^Applications/ }).getAttribute("aria-current")).toBe("page");
  });

  it("shows the ranked rows in the server's order, each a named button", async () => {
    renderPipeline();
    await screen.findByText("Zip Co");

    expect(order()).toEqual(["Zip Co", "Atlassian", "NAB"]);
    const row = screen.getByRole("button", { name: /^Zip Co/ });
    expect(row.getAttribute("aria-label")).toMatch(/Offer.*1 day overdue.*next action: Complete online assessment/);
  });

  it("opens an application as a full-screen sheet with a way back", async () => {
    vi.spyOn(api, "getJob").mockResolvedValue({ job: RANKED[1]!, timeline: [] });
    renderPipeline("/pipeline/b");

    const sheet = await screen.findByRole("dialog", { name: "Application detail" });
    expect(sheet.getAttribute("aria-modal")).toBe("true");
    await userEvent.click(within(sheet).getByRole("button", { name: "Back to applications" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});

describe("between 768 and 1279px — tablet and small desktop (T5.8)", () => {
  it.each([900, 1100])("at %ipx the panel is an overlay with a scrim, holding focus until Escape", async (width) => {
    setViewport(width);
    vi.spyOn(api, "getJob").mockResolvedValue({ job: RANKED[1]!, timeline: [] });
    renderPipeline("/pipeline/b");

    const panel = await screen.findByRole("dialog", { name: "Application detail" });
    expect(panel.getAttribute("aria-modal")).toBe("true");

    // Focus stays inside: Tab from the last control comes back to the first.
    const focusable = within(panel).getAllByRole("button");
    focusable[focusable.length - 1]!.focus();
    await userEvent.tab();
    expect(panel.contains(document.activeElement)).toBe(true);

    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("closes the overlay when the scrim is clicked", async () => {
    setViewport(1100);
    vi.spyOn(api, "getJob").mockResolvedValue({ job: RANKED[1]!, timeline: [] });
    renderPipeline("/pipeline/b");
    await screen.findByRole("dialog", { name: "Application detail" });

    await userEvent.click(document.querySelector<HTMLElement>("[data-scrim]")!);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("names every item in the sidebar at tablet width", async () => {
    setViewport(900);
    renderApp();
    const nav = await screen.findByRole("navigation", { name: "Main" });

    for (const label of ["Applications", "Needs review", "Settings"]) {
      expect(within(nav).getByRole("link", { name: new RegExp(`^${label}`) })).toBeDefined();
    }
  });
});

describe("the ranking is identical at every width (SM-4)", () => {
  it.each([375, 900, 1100, 1440])("at %ipx", async (width) => {
    setViewport(width);
    renderPipeline();
    await screen.findByText("Zip Co");
    expect(order()).toEqual(["Zip Co", "Atlassian", "NAB"]);
  });
});
