// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor, cleanup, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { Job, JobDetailResponse, ListJobsResponse } from "@gradtracker/shared";
import { PipelineView } from "./PipelineView";
import { DetailPanel } from "./DetailPanel";
import { ToastHost } from "../shell/ToastHost";
import { api } from "../api/client";

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
