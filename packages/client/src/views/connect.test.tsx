// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup, act, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import type { Job, ListJobsResponse, MeResponse, ReviewItem } from "@gradtracker/shared";
import { App } from "../App";
import { ThemeProvider } from "../theme/theme";
import { api } from "../api/client";
import { SCAN_MS } from "./ConnectView";

/**
 * The simulated sign-in for the presentation (D35): the Connect screen, a
 * stand-in for Google's consent screen asking only for read-only access, and a
 * scan of the sample mailbox — counting the demo database's own numbers — that
 * ends on the dashboard. Nothing contacts Google, and the screens say so.
 */

const me: MeResponse = {
  email: "student@student.monash.edu",
  displayName: "Sam Nguyen",
  gmailConnected: false,
  reviewThreshold: 0.75,
  timeZone: "Australia/Melbourne",
  demoMode: true,
  sync: { state: "idle", lastSyncAt: null, emailsReadTotal: 612, progress: null, lastError: null },
};

function job(id: string, company: string, status: "active" | "archived" = "active"): Job {
  return {
    id,
    company,
    role: "Graduate Program",
    stage: status === "active" ? "applied" : "rejected",
    deadlineAt: null,
    nextAction: status === "active" ? "Wait for response" : null,
    senderDomain: "example.com",
    confidence: 0.9,
    status,
    firstSeenAt: "2026-09-01T00:00:00.000Z",
    lastEventAt: "2026-09-20T00:00:00.000Z",
    daysLeft: null,
    followUpRequired: false,
    pendingReviewId: null,
    provenance: [],
  };
}

const active = Array.from({ length: 22 }, (_, i) => job(`a${i}`, `Company ${i}`));
const archived = Array.from({ length: 3 }, (_, i) => job(`z${i}`, `Closed ${i}`, "archived"));
const review = Array.from({ length: 4 }, (_, i): ReviewItem => ({
  eventId: `00000000-0000-4000-8000-00000000000${i}`,
  receivedAt: "2026-09-30T00:00:00.000Z",
  senderDomain: "example.com",
  company: `Maybe ${i}`,
  role: "Graduate",
  stage: "applied",
  deadlineAt: null,
  nextAction: null,
  confidence: 0.4,
  suggestedJob: null,
}));
const stats = { liveApplications: 22, dueThisWeek: 3, needsReview: 4, emailsRead: 612 };

beforeEach(() => {
  window.sessionStorage.clear();
  vi.spyOn(api, "me").mockResolvedValue(me);
  vi.spyOn(api, "listReview").mockResolvedValue({ items: review });
  vi.spyOn(api, "listJobs").mockImplementation(
    async (options = {}): Promise<ListJobsResponse> =>
      options.status === "archived" ? { jobs: archived, stats } : { jobs: active, stats },
  );
  vi.spyOn(api, "getSettings").mockResolvedValue({ reviewThreshold: 0.75 });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
  window.sessionStorage.clear();
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

describe("the simulated sign-in (D35)", () => {
  it("opens on the sign-in screen, saying what is and is not accessed — and that it is simulated", async () => {
    renderAt("/");

    expect(await screen.findByRole("heading", { level: 1, name: "Connect your Gmail" })).toBeDefined();
    expect(screen.getByText("Reads your Gmail, read-only")).toBeDefined();
    expect(screen.getByText("Never stores your password")).toBeDefined();
    expect(screen.getByText("Never keeps email content")).toBeDefined();
    expect(screen.getByText(/simulated/i)).toBeDefined();
    expect(screen.getByRole("button", { name: "Continue with Google" })).toBeDefined();
    // Outside the app: no navigation until signed in.
    expect(screen.queryByRole("navigation")).toBeNull();
  });

  it("asks only for read-only access, as the sample account — and Cancel goes back", async () => {
    renderAt("/connect");
    await userEvent.click(await screen.findByRole("button", { name: "Continue with Google" }));

    const consent = await screen.findByRole("region", { name: /Sign in with Google/ });
    expect(within(consent).getByText("Sam Nguyen")).toBeDefined();
    expect(within(consent).getByText("student@student.monash.edu")).toBeDefined();
    expect(within(consent).getByText(/Read your email messages and settings/)).toBeDefined();
    expect(within(consent).getByText(/cannot send, delete or change/)).toBeDefined();

    await userEvent.click(within(consent).getByRole("button", { name: "Cancel" }));
    expect(await screen.findByRole("button", { name: "Continue with Google" })).toBeDefined();
  });

  it("Allow scans the sample mailbox, counting its own numbers, then opens the dashboard", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderAt("/connect");
    await user.click(await screen.findByRole("button", { name: "Continue with Google" }));
    await user.click(await screen.findByRole("button", { name: "Allow" }));

    expect(await screen.findByRole("progressbar", { name: "Scanning your inbox" })).toBeDefined();

    await act(async () => {
      vi.advanceTimersByTime(SCAN_MS + 1000);
    });

    // The demo database's own numbers: 612 emails, 22 live + 3 archived, 4 to review.
    expect(await screen.findByText(/Inbox scanned — 25 applications found, 4 to review/)).toBeDefined();
    expect(await screen.findByRole("heading", { level: 1, name: "Applications" })).toBeDefined();
    expect(window.sessionStorage.getItem("gradtracker.demoSignedIn")).toBe("1");
  });

  it("once signed in, the app opens on the dashboard and /connect leads there", async () => {
    window.sessionStorage.setItem("gradtracker.demoSignedIn", "1");
    renderAt("/");
    expect(await screen.findByRole("heading", { level: 1, name: "Applications" })).toBeDefined();
    cleanup();

    renderAt("/connect");
    expect(await screen.findByRole("heading", { level: 1, name: "Applications" })).toBeDefined();
  });

  it("Sign out in Settings starts the walkthrough again", async () => {
    window.sessionStorage.setItem("gradtracker.demoSignedIn", "1");
    renderAt("/settings");

    await userEvent.click(await screen.findByRole("button", { name: "Sign out" }));

    expect(await screen.findByRole("heading", { level: 1, name: "Connect your Gmail" })).toBeDefined();
    expect(window.sessionStorage.getItem("gradtracker.demoSignedIn")).toBeNull();
  });
});
