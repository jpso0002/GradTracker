// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor, cleanup, within, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { Job, JobDetailResponse, ListJobsResponse } from "@gradtracker/shared";
import { PipelineView } from "./PipelineView";
import { DetailPanel } from "./DetailPanel";
import { ToastHost } from "../shell/ToastHost";
import { api, ApiError } from "../api/client";

/**
 * Two rules are worth testing at this level, because both are easy to break by
 * accident and neither is visible in a typecheck:
 *
 *   1. The client never re-sorts the pipeline. Order is the server's opinion.
 *   2. A field shows a confidence meter or an "Edited" tag — never both,
 *      never neither.
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

function listResponse(jobs: Job[]): ListJobsResponse {
  return {
    jobs,
    stats: { liveApplications: jobs.length, dueThisWeek: 1, needsReview: 0, emailsRead: 612 },
  };
}

beforeEach(() => {
  vi.spyOn(api, "listReview").mockResolvedValue({ items: [] });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderPipeline() {
  return render(
    <ToastHost>
      <MemoryRouter initialEntries={["/pipeline"]}>
        <Routes>
          <Route path="/pipeline" element={<PipelineView />} />
        </Routes>
      </MemoryRouter>
    </ToastHost>,
  );
}

describe("PipelineView", () => {
  it("renders the server's order verbatim — it does not sort", async () => {
    // Deliberately NOT alphabetical and NOT deadline-ordered. If the client
    // sorts by anything, this order changes.
    const order = ["Zip Co", "Atlassian", "KPMG", "Canva"];
    vi.spyOn(api, "listJobs").mockResolvedValue(
      listResponse(order.map((company, i) => job({ id: `j${i}`, company }))),
    );

    renderPipeline();

    await waitFor(() => expect(screen.getByText("Zip Co")).toBeDefined());
    const rendered = order.map((company) => screen.getByText(company));
    const positions = rendered.map((el) =>
      Array.prototype.indexOf.call(el.ownerDocument.body.querySelectorAll("*"), el),
    );
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it("filtering re-filters without re-sorting", async () => {
    const listJobs = vi.spyOn(api, "listJobs").mockResolvedValue(
      listResponse([job({ id: "a", company: "Zip Co" }), job({ id: "b", company: "Atlassian" })]),
    );

    renderPipeline();
    await waitFor(() => expect(screen.getByText("Zip Co")).toBeDefined());

    await userEvent.click(screen.getByRole("button", { name: "Assessment pending" }));

    // The filter is sent to the server, which re-ranks. The client does not
    // reorder what it already has.
    await waitFor(() =>
      expect(listJobs).toHaveBeenCalledWith(
        expect.objectContaining({ stages: ["assessment"] }),
      ),
    );
  });

  it("shows a dash rather than a zero while the counts are unknown", async () => {
    vi.spyOn(api, "listJobs").mockImplementation(() => new Promise(() => {}));
    renderPipeline();
    // "0 live applications" is a claim; "not loaded yet" is not.
    await waitFor(() => expect(screen.getAllByText("—").length).toBeGreaterThan(0));
  });

  it("distinguishes an empty pipeline from a too-narrow filter", async () => {
    vi.spyOn(api, "listJobs").mockResolvedValue(listResponse([]));
    renderPipeline();

    await waitFor(() => expect(screen.getByText("No applications yet")).toBeDefined());

    await userEvent.click(screen.getByRole("button", { name: "Offer received" }));
    await waitFor(() =>
      expect(screen.getByText("No applications match these filters")).toBeDefined(),
    );
  });
});

describe("DetailPanel — the AI-vs-human contract (design.md §7)", () => {
  function renderPanel(detail: JobDetailResponse) {
    vi.spyOn(api, "getJob").mockResolvedValue(detail);
    return render(
      <ToastHost>
        <MemoryRouter>
          <DetailPanel jobId="j1" onClose={() => {}} onChanged={() => {}} />
        </MemoryRouter>
      </ToastHost>,
    );
  }

  it("shows a confidence meter for an AI-extracted field", async () => {
    renderPanel({
      job: job({
        provenance: [
          { field: "next_action", source: "ai", confidence: 0.93, updatedAt: "2026-08-14T00:00:00.000Z" },
        ],
      }),
      timeline: [],
    });

    const field = await screen.findByText("Next action");
    expect(within(field.parentElement!).queryByText("Edited")).toBeNull();
    expect(field.parentElement!.querySelector("[title]")).not.toBeNull();
  });

  it("shows an Edited tag instead of a meter once a human has corrected it", async () => {
    renderPanel({
      job: job({
        provenance: [
          { field: "next_action", source: "human", confidence: null, updatedAt: "2026-08-14T00:00:00.000Z" },
        ],
      }),
      timeline: [],
    });

    const field = await screen.findByText("Next action");
    expect(within(field.parentElement!).getByText("Edited")).toBeDefined();
  });

  it("shows neither when the field has no value at all", async () => {
    // A withdrawn application keeps its old `next_action` provenance row. A
    // 94% meter beside "Nothing outstanding" reads as "94% sure there is
    // nothing to do" — a claim the product never made.
    renderPanel({
      job: job({
        nextAction: null,
        stage: "withdrawn",
        provenance: [
          { field: "next_action", source: "ai", confidence: 0.94, updatedAt: "2026-08-14T00:00:00.000Z" },
        ],
      }),
      timeline: [],
    });

    const field = await screen.findByText("Next action");
    expect(within(field.parentElement!).queryByText("Edited")).toBeNull();
    expect(field.parentElement!.querySelector("[title]")).toBeNull();
    expect(screen.getByText("Nothing outstanding")).toBeDefined();
  });

  it("links a timeline entry to Gmail rather than showing content it does not store", async () => {
    renderPanel({
      job: job(),
      timeline: [
        {
          id: "e1",
          gmailMessageId: "msg-1",
          gmailThreadId: "t1",
          receivedAt: "2026-08-14T00:00:00.000Z",
          senderDomain: "smartrecruiters.com",
          detectedCompany: "KPMG",
          detectedRole: "Vacationer Program",
          detectedStage: "assessment",
          detectedDeadlineAt: null,
          detectedNextAction: null,
          confidence: 0.93,
          reviewStatus: "auto_accepted",
        },
      ],
    });

    const link = await screen.findByRole("link", { name: /Open in Gmail/ });
    expect(link.getAttribute("href")).toContain("rfc822msgid");
    expect(link.getAttribute("href")).toContain("msg-1");
  });
});

// ── T6.1 / D27 — panel edit mode ─────────────────────────────────────────────

describe("DetailPanel — edit mode (T6.1, D27)", () => {
  const detail = (over: Partial<Job> = {}): JobDetailResponse => ({ job: job(over), timeline: [] });

  /** Each response answers one read, in order: the panel opening, the stale
   *  check on Save, and the re-read after it. The last one repeats. */
  function renderEditable(...responses: JobDetailResponse[]) {
    const getJob = vi.spyOn(api, "getJob");
    for (const response of responses) getJob.mockResolvedValueOnce(response);
    getJob.mockResolvedValue(responses[responses.length - 1]!);
    const onChanged = vi.fn();
    render(
      <ToastHost>
        <MemoryRouter>
          <DetailPanel jobId="j1" onClose={() => {}} onChanged={onChanged} />
        </MemoryRouter>
      </ToastHost>,
    );
    return { getJob, onChanged };
  }

  const startEditing = async () => userEvent.click(await screen.findByRole("button", { name: "Edit" }));
  const field = (name: RegExp) => screen.getByRole("textbox", { name }) as HTMLInputElement;
  const save = () => userEvent.click(screen.getByRole("button", { name: "Save" }));

  it("makes all five fields editable in the panel, and saves only the ones changed", async () => {
    renderEditable(detail());
    const updateJob = vi.spyOn(api, "updateJob").mockResolvedValue({ job: job(), corrected: [] });
    await startEditing();

    expect(field(/^Company/).value).toBe("KPMG");
    expect(field(/^Role/).value).toBe("Vacationer Program");
    expect(field(/^Next action/).value).toBe("Complete online assessment");
    expect(screen.getByRole("combobox", { name: /^Stage/ })).toBeDefined();
    expect(screen.getByLabelText(/^Deadline/)).toBeDefined();

    await userEvent.clear(field(/^Company/));
    await userEvent.type(field(/^Company/), "KPMG Australia");
    await userEvent.selectOptions(screen.getByRole("combobox", { name: /^Stage/ }), "interview");
    await save();

    // Two fields changed, two fields sent. Sending all five would mark every
    // one Edited and lock it against the classifier for good.
    await waitFor(() => expect(updateJob).toHaveBeenCalledTimes(1));
    expect(updateJob).toHaveBeenCalledWith("j1", { company: "KPMG Australia", stage: "interview" });
  });

  it("sends nothing at all when Save is pressed with nothing changed", async () => {
    renderEditable(detail());
    const updateJob = vi.spyOn(api, "updateJob");
    await startEditing();

    // Typed and put back is not a change either.
    await userEvent.type(field(/^Role/), "x{Backspace}");
    await save();

    expect(await screen.findByRole("button", { name: "Edit" })).toBeDefined();
    expect(updateJob).not.toHaveBeenCalled();
    expect(screen.queryByText("Edited")).toBeNull();
  });

  it("returns to reading after a save, says so, and refreshes the list behind it", async () => {
    const saved = detail({
      nextAction: "Email Priya about the test link",
      provenance: [{ field: "next_action", source: "human", confidence: null, updatedAt: "2026-08-15T00:00:00.000Z" }],
    });
    const { onChanged } = renderEditable(detail(), detail(), saved);
    vi.spyOn(api, "updateJob").mockResolvedValue({ job: saved.job, corrected: ["next_action"] });
    await startEditing();

    await userEvent.clear(field(/^Next action/));
    await userEvent.type(field(/^Next action/), "Email Priya about the test link");
    await save();

    expect(await screen.findByText("Application updated")).toBeDefined();
    expect(await screen.findByText("Email Priya about the test link")).toBeDefined();
    expect(screen.getByText("Edited")).toBeDefined();
    expect(onChanged).toHaveBeenCalled();
    // Focus goes back to where editing started.
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "Edit" })));
  });

  it("keeps the student's typing when the server refuses it, with the reason beneath the field", async () => {
    renderEditable(detail());
    vi.spyOn(api, "updateJob").mockRejectedValue(
      new ApiError(400, "Company must be 160 characters or fewer.", "company"),
    );
    await startEditing();

    await userEvent.clear(field(/^Company/));
    await userEvent.type(field(/^Company/), "KPMG Australia Pty Ltd");
    await save();

    expect(await screen.findByText("Company must be 160 characters or fewer.")).toBeDefined();
    expect(field(/^Company/).value).toBe("KPMG Australia Pty Ltd");
    expect(field(/^Company/).getAttribute("aria-invalid")).toBe("true");
    expect(document.activeElement).toBe(field(/^Company/));
    // Still editing: nothing the student typed has gone anywhere.
    expect(screen.getByRole("button", { name: "Save" })).toBeDefined();
  });

  it("warns before overwriting a value an ingest changed while the panel was open", async () => {
    // Opened with a 20 August deadline. While the student typed their own, an
    // email moved it to 22 August.
    renderEditable(
      detail({ deadlineAt: "2026-08-20T04:00:00.000Z" }),
      detail({ deadlineAt: "2026-08-22T04:00:00.000Z" }),
    );
    const updateJob = vi.spyOn(api, "updateJob").mockResolvedValue({ job: job(), corrected: ["deadline_at"] });
    await startEditing();

    fireEvent.change(screen.getByLabelText(/^Deadline/), { target: { value: "2026-08-25T09:00" } });
    await save();

    const warning = await screen.findByRole("alert");
    expect(warning.textContent).toMatch(/changed while you were editing/);
    expect(warning.textContent).toContain("Deadline");
    expect(updateJob).not.toHaveBeenCalled();

    await userEvent.click(within(warning).getByRole("button", { name: "Save anyway" }));
    await waitFor(() =>
      expect(updateJob).toHaveBeenCalledWith("j1", { deadlineAt: new Date("2026-08-25T09:00").toISOString() }),
    );
  });

  it("Keep editing shows the new value and keeps the student's own", async () => {
    renderEditable(
      detail({ deadlineAt: "2026-08-20T04:00:00.000Z" }),
      detail({ deadlineAt: "2026-08-22T04:00:00.000Z" }),
    );
    const updateJob = vi.spyOn(api, "updateJob").mockResolvedValue({ job: job(), corrected: ["deadline_at"] });
    await startEditing();

    fireEvent.change(screen.getByLabelText(/^Deadline/), { target: { value: "2026-08-25T09:00" } });
    await save();
    await userEvent.click(within(await screen.findByRole("alert")).getByRole("button", { name: "Keep editing" }));

    expect(screen.queryByRole("alert")).toBeNull();
    expect((screen.getByLabelText(/^Deadline/) as HTMLInputElement).value).toBe("2026-08-25T09:00");
    expect(updateJob).not.toHaveBeenCalled();

    // Having seen the change, saving again does not ask a second time.
    await save();
    await waitFor(() => expect(updateJob).toHaveBeenCalledTimes(1));
  });

  it("does not warn about a field the student left alone", async () => {
    // The ingest moved the stage; the student changed only the company. Save
    // sends only the company, so nothing the student has not seen is replaced.
    renderEditable(detail({ stage: "assessment" }), detail({ stage: "interview" }));
    const updateJob = vi.spyOn(api, "updateJob").mockResolvedValue({ job: job(), corrected: ["company"] });
    await startEditing();

    await userEvent.clear(field(/^Company/));
    await userEvent.type(field(/^Company/), "KPMG Australia");
    await save();

    await waitFor(() => expect(updateJob).toHaveBeenCalledWith("j1", { company: "KPMG Australia" }));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("Cancel and Escape discard the edits and change nothing", async () => {
    renderEditable(detail());
    const updateJob = vi.spyOn(api, "updateJob");

    await startEditing();
    await userEvent.type(field(/^Role/), " (Audit)");
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByText("Vacationer Program")).toBeDefined();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Edit" }));

    await startEditing();
    expect(field(/^Role/).value).toBe("Vacationer Program");
    await userEvent.type(field(/^Role/), " (Audit)");
    await userEvent.keyboard("{Escape}");
    expect(screen.getByText("Vacationer Program")).toBeDefined();

    expect(updateJob).not.toHaveBeenCalled();
  });
});

// ── T6.6 — the "Review required" marker ──────────────────────────────────────

describe("Review required marker (T6.6)", () => {
  const QUESTION = "8f14e45f-ceea-467a-9575-6d1d9a2f1a01";

  it("marks exactly the rows with an open question, in words, linking to that question", async () => {
    vi.spyOn(api, "listJobs").mockResolvedValue(
      listResponse([
        job({ id: "a", company: "Macquarie", pendingReviewId: QUESTION }),
        job({ id: "b", company: "KPMG" }),
      ]),
    );
    renderPipeline();

    const marker = await screen.findByRole("link", { name: /^Review required/ });
    expect(screen.getAllByRole("link", { name: /^Review required/ })).toHaveLength(1);
    expect(marker.getAttribute("href")).toBe(`/review#review-${QUESTION}`);
    expect(marker.closest("[role=listitem]")?.textContent).toContain("Macquarie");
  });

  it("disappears once the question is resolved", async () => {
    vi.spyOn(api, "listJobs")
      .mockResolvedValueOnce(listResponse([job({ id: "a", company: "Macquarie", pendingReviewId: QUESTION })]))
      .mockResolvedValue(listResponse([job({ id: "a", company: "Macquarie" })]));
    renderPipeline();

    await screen.findByRole("link", { name: /^Review required/ });
    await userEvent.click(screen.getByRole("button", { name: "Refresh" }));

    await waitFor(() => expect(screen.queryByRole("link", { name: /^Review required/ })).toBeNull());
    expect(screen.getByText("Macquarie")).toBeDefined();
  });
});

// ── T5.11 / D30 — search that keeps rank order ──────────────────────────────

describe("search (T5.11, D30)", () => {
  // Server order: deliberately neither alphabetical nor grouped by match.
  const ranked = [
    job({ id: "1", company: "Zip Co", role: "Graduate Engineer" }),
    job({ id: "2", company: "Atlassian", role: "Graduate Analyst" }),
    job({ id: "3", company: "KPMG", role: "Vacationer Program" }),
    job({ id: "4", company: "Canva", role: "Data Analyst" }),
    job({ id: "5", company: "Zeller", role: "Software Engineer" }),
  ];
  const shown = () =>
    screen
      .getAllByRole("listitem")
      .map((row) => ranked.find((j) => row.textContent?.includes(j.company))?.company);
  const searchBox = () => screen.getByRole("textbox", { name: /^Search applications/ }) as HTMLInputElement;

  it("narrows by company or role and keeps the server's order; clearing restores the list", async () => {
    vi.spyOn(api, "listJobs").mockResolvedValue(listResponse(ranked));
    renderPipeline();
    await screen.findByText("Zip Co");

    await userEvent.type(searchBox(), "ANALYST");
    expect(shown()).toEqual(["Atlassian", "Canva"]);

    await userEvent.clear(searchBox());
    await userEvent.type(searchBox(), "z");
    expect(shown()).toEqual(["Zip Co", "Zeller"]);

    await userEvent.clear(searchBox());
    expect(shown()).toEqual(["Zip Co", "Atlassian", "KPMG", "Canva", "Zeller"]);
  });

  it("says so when nothing matches, and offers to clear the search", async () => {
    vi.spyOn(api, "listJobs").mockResolvedValue(listResponse(ranked));
    renderPipeline();
    await screen.findByText("Zip Co");

    await userEvent.type(searchBox(), "deloitte");
    expect(screen.getByText(/No applications match/)).toBeDefined();

    await userEvent.click(screen.getByRole("button", { name: "Clear search" }));
    expect(shown()).toEqual(["Zip Co", "Atlassian", "KPMG", "Canva", "Zeller"]);
    expect(searchBox().value).toBe("");
  });

  it("/ moves focus to the search box, as its hint says", async () => {
    vi.spyOn(api, "listJobs").mockResolvedValue(listResponse(ranked));
    renderPipeline();
    await screen.findByText("Zip Co");

    await userEvent.keyboard("/");
    expect(document.activeElement).toBe(searchBox());
    expect(searchBox().value).toBe("");
  });
});
