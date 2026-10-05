// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor, cleanup, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { Job, ListJobsResponse } from "@gradtracker/shared";
import { App } from "../App";
import { ThemeProvider } from "../theme/theme";
import { PipelineView } from "./PipelineView";
import { DetailPanel } from "./DetailPanel";
import { ReviewView } from "./ReviewView";
import { SettingsView } from "./SettingsView";
import { ToastHost } from "../shell/ToastHost";
import { api, ApiError } from "../api/client";
import { connectivity } from "../connectivity";

/**
 * T6.5 — the accessibility pass (design.md §10, WCAG 2.1 AA).
 *
 * The done-when has two halves, both here: the primary journey completes by
 * keyboard alone with no trap, and every stage and deadline signal is carried
 * in words — so it survives the removal of colour.
 */

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

const pipeline = (jobs: Job[]): ListJobsResponse => ({
  jobs,
  stats: { liveApplications: jobs.length, dueThisWeek: 1, needsReview: 0, emailsRead: 612 },
});

beforeEach(() => {
  vi.spyOn(api, "listReview").mockResolvedValue({ items: [] });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  connectivity.reset();
});

function renderPipelineRoutes() {
  return render(
    <ToastHost>
      <MemoryRouter initialEntries={["/pipeline"]}>
        <Routes>
          <Route path="/pipeline" element={<PipelineView />} />
          <Route path="/pipeline/:jobId" element={<PipelineView />} />
        </Routes>
      </MemoryRouter>
    </ToastHost>,
  );
}

describe("the primary journey, by keyboard alone (T6.5)", () => {
  it("finds the top application, corrects it, and returns — with no trap", async () => {
    const kpmg = job({ id: "a" });
    vi.spyOn(api, "listJobs").mockResolvedValue(pipeline([kpmg, job({ id: "b", company: "Canva", role: "Product Design Intern" })]));
    vi.spyOn(api, "getJob").mockResolvedValue({ job: kpmg, timeline: [] });
    const updateJob = vi.spyOn(api, "updateJob").mockResolvedValue({ job: kpmg, corrected: ["company"] });
    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={["/pipeline"]}>
          <App />
        </MemoryRouter>
      </ThemeProvider>,
    );
    const top = await screen.findByRole("button", { name: /^KPMG, Vacationer Program/ });

    // Tab from the top of the page until the most urgent row has focus.
    for (let i = 0; i < 40 && document.activeElement !== top; i += 1) await userEvent.tab();
    expect(document.activeElement).toBe(top);

    await userEvent.keyboard("{Enter}");
    const panel = await screen.findByRole("complementary", { name: "Application detail" });

    // Into the panel, to Edit, and correct the company.
    for (let i = 0; i < 10 && document.activeElement?.textContent !== "Edit"; i += 1) await userEvent.tab();
    await userEvent.keyboard("{Enter}");
    expect(document.activeElement).toBe(within(panel).getByRole("textbox", { name: /^Company/ }));
    await userEvent.keyboard(" Australia{Enter}");
    await waitFor(() => expect(updateJob).toHaveBeenCalledWith("a", { company: "KPMG Australia" }));

    // Escape closes the panel and focus returns to the row it came from.
    await waitFor(() => expect(within(panel).getByRole("button", { name: "Edit" })).toBeDefined());
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("complementary", { name: "Application detail" })).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: /^KPMG, Vacationer Program/ })));

    // No trap: Tab moves on to the next row.
    await userEvent.tab();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: /^Canva, Product Design Intern/ }));
  });
});

describe("rows are real buttons (design.md §10.2)", () => {
  it("opens an application with Space as well as Enter", async () => {
    const canva = job({ id: "b", company: "Canva", role: "Product Design Intern" });
    vi.spyOn(api, "listJobs").mockResolvedValue(pipeline([job({ id: "a" }), canva]));
    const getJob = vi.spyOn(api, "getJob").mockResolvedValue({ job: canva, timeline: [] });
    renderPipelineRoutes();

    (await screen.findByRole("button", { name: /^Canva/ })).focus();
    await userEvent.keyboard(" ");

    await waitFor(() => expect(getJob).toHaveBeenCalledWith("b"));
    expect(screen.getByRole("button", { name: /^Canva/ }).getAttribute("aria-current")).toBe("true");
  });

  it("names every stage and deadline in words, so nothing rests on colour", async () => {
    vi.spyOn(api, "listJobs").mockResolvedValue(
      pipeline([
        job({ id: "a", stage: "interview", daysLeft: -3 }),
        job({ id: "b", company: "Canva", stage: "offer", deadlineAt: null, daysLeft: null }),
      ]),
    );
    renderPipelineRoutes();

    const overdue = await screen.findByRole("button", { name: /^KPMG/ });
    expect(overdue.getAttribute("aria-label")).toMatch(/Interview scheduled/);
    expect(overdue.getAttribute("aria-label")).toMatch(/20 Aug/);
    expect(overdue.getAttribute("aria-label")).toMatch(/3 days overdue/);
    expect(screen.getByRole("button", { name: /^Canva/ }).getAttribute("aria-label")).toMatch(/Offer received.*no deadline/);
    // And on screen, as text: the stage badge reads its label.
    expect(within(overdue).getByText("Interview scheduled")).toBeDefined();
  });

  it("speaks each headline number with its meaning", async () => {
    vi.spyOn(api, "listJobs").mockResolvedValue(pipeline([job()]));
    renderPipelineRoutes();

    expect(await screen.findByText("1 live application")).toBeDefined();
    expect(screen.getByText("1 due this week")).toBeDefined();
    expect(screen.getByText("612 emails read")).toBeDefined();
  });

  it("names the search box without its keyboard hint, and declares the shortcut", async () => {
    vi.spyOn(api, "listJobs").mockResolvedValue(pipeline([job()]));
    renderPipelineRoutes();

    const search = await screen.findByRole("textbox", { name: "Search applications" });
    expect(search.getAttribute("aria-keyshortcuts")).toBe("/");
  });
});

describe("each view has a title and an <h1> (design.md §10.3)", () => {
  it.each([
    ["Applications", () => <PipelineView />],
    ["Needs review", () => <ReviewView />],
    ["Settings", () => <SettingsView />],
  ])("%s", async (title, view) => {
    vi.spyOn(api, "listJobs").mockResolvedValue(pipeline([]));
    vi.spyOn(api, "getSettings").mockResolvedValue({ reviewThreshold: 0.75 });
    render(
      <ThemeProvider>
        <ToastHost>
          <MemoryRouter>{view()}</MemoryRouter>
        </ToastHost>
      </ThemeProvider>,
    );

    expect(await screen.findByRole("heading", { level: 1, name: title })).toBeDefined();
    expect(document.title).toBe(`${title} · GradTracker`);
  });
});

describe("the detail panel (design.md §10.3)", () => {
  function renderPanel(over: Partial<Job>) {
    vi.spyOn(api, "getJob").mockResolvedValue({ job: job(over), timeline: [] });
    render(
      <ToastHost>
        <MemoryRouter>
          <DetailPanel jobId="j1" onClose={() => {}} onChanged={() => {}} />
        </MemoryRouter>
      </ToastHost>,
    );
  }

  it("gives a confidence meter the meter role and a text alternative", async () => {
    renderPanel({
      provenance: [{ field: "next_action", source: "ai", confidence: 0.93, updatedAt: "2026-08-14T00:00:00.000Z" }],
    });

    const meter = await screen.findByRole("meter", { name: "AI confidence 93 percent" });
    expect(meter.getAttribute("aria-valuenow")).toBe("93");
    expect(meter.getAttribute("aria-valuemin")).toBe("0");
    expect(meter.getAttribute("aria-valuemax")).toBe("100");
  });

  it("describes a field by its provenance", async () => {
    renderPanel({
      provenance: [{ field: "next_action", source: "human", confidence: null, updatedAt: "2026-08-14T00:00:00.000Z" }],
    });

    const value = (await screen.findByText("Complete online assessment")).closest("dd")!;
    const describedBy = value.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy!)?.textContent).toBe("Edited");
  });

  it("announces a refused field at once, by name", async () => {
    renderPanel({});
    vi.spyOn(api, "updateJob").mockRejectedValue(new ApiError(400, "Company cannot be empty.", "company"));

    await userEvent.click(await screen.findByRole("button", { name: "Edit" }));
    await userEvent.clear(screen.getByRole("textbox", { name: /^Company/ }));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect((await screen.findByRole("alert")).textContent).toBe("Company: Company cannot be empty.");
  });
});
