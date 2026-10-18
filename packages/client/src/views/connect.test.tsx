// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup, act, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import type { Job, ListJobsResponse, MeResponse, ReviewItem } from "@gradtracker/shared";
import { App } from "../App";
import { ThemeProvider } from "../theme/theme";
import { api, ApiError } from "../api/client";
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
  // The seeded mailbox: no demo inbox to read (D37).
  vi.spyOn(api, "demoScan").mockResolvedValue({
    emailsRead: 612, newApplications: 25, updatedApplications: 0, stageChanges: 0, needsReview: 4, ignored: 0,
    source: "sample", inbox: null, notice: null,
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
  window.sessionStorage.clear();
});

/** The account step done, as the mock sign-up leaves it (D39). */
function withAccount() {
  window.sessionStorage.setItem("gradtracker.demoProfile", JSON.stringify({ name: "Sam Nguyen", email: "sam@student.monash.edu" }));
}

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
  it("opens on a mock Create your account screen that says it is simulated (D39)", async () => {
    renderAt("/");

    expect(await screen.findByRole("heading", { level: 1, name: "Create your account" })).toBeDefined();
    expect(screen.getByText(/no account is created/i)).toBeDefined();
    expect(screen.queryByRole("navigation")).toBeNull();
  });

  it("won't create an account with a missing name, a bad email or a short password", async () => {
    renderAt("/");
    await userEvent.click(await screen.findByRole("button", { name: "Create account" }));

    expect(screen.getByText("Enter your name")).toBeDefined();
    expect(screen.getByText(/Enter an email address/)).toBeDefined();
    expect(screen.getByText("Use at least 8 characters")).toBeDefined();
    expect(screen.getByRole("heading", { level: 1, name: "Create your account" })).toBeDefined();
  });

  it("creating the account greets the student and asks to connect Gmail, keeping no password", async () => {
    renderAt("/");
    await userEvent.type(await screen.findByLabelText("Full name"), "Jordan Psomas");
    await userEvent.type(screen.getByLabelText("Email"), "jordan@student.monash.edu");
    await userEvent.type(screen.getByLabelText("Password"), "correct-horse");
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByRole("heading", { level: 1, name: "Welcome, Jordan. Connect your Gmail" })).toBeDefined();
    expect(screen.getByText(/Account created for jordan@student.monash.edu/)).toBeDefined();
    expect(JSON.stringify({ ...window.sessionStorage })).not.toContain("correct-horse");
  });

  it("the Connect step says what is and is not accessed — and that it is simulated", async () => {
    withAccount();
    renderAt("/");

    expect(await screen.findByRole("heading", { level: 1, name: "Welcome, Sam. Connect your Gmail" })).toBeDefined();
    expect(screen.getByText("Reads your Gmail, read-only")).toBeDefined();
    expect(screen.getByText("Never stores your password")).toBeDefined();
    expect(screen.getByText("Never keeps email content")).toBeDefined();
    expect(screen.getByText(/simulated/i)).toBeDefined();
    expect(screen.getByRole("button", { name: "Continue with Google" })).toBeDefined();
    // Outside the app: no navigation until signed in.
    expect(screen.queryByRole("navigation")).toBeNull();
  });

  it("asks only for read-only access, as the sample account — and Cancel goes back", async () => {
    withAccount();
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

  it("connects the demo inbox, whatever email the account was made with (D39)", async () => {
    vi.spyOn(api, "me").mockResolvedValue({ ...me, mailbox: "gradtrackerdemo@gmail.com" });
    withAccount();
    renderAt("/connect");
    await userEvent.click(await screen.findByRole("button", { name: "Continue with Google" }));

    const consent = await screen.findByRole("region", { name: /Sign in with Google/ });
    expect(within(consent).getByText("Sam Nguyen")).toBeDefined();
    expect(await within(consent).findByText("gradtrackerdemo@gmail.com")).toBeDefined();
  });

  it("Allow scans the sample mailbox, counting its own numbers, then opens the dashboard", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    withAccount();
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

    expect(await screen.findByRole("heading", { level: 1, name: "Create your account" })).toBeDefined();
    expect(window.sessionStorage.getItem("gradtracker.demoSignedIn")).toBeNull();
  });

  it("Reset demo puts the sample mailbox back and returns to the start (D36)", async () => {
    window.sessionStorage.setItem("gradtracker.demoSignedIn", "1");
    const reset = vi.spyOn(api, "resetDemo").mockResolvedValue({ ok: true });
    renderAt("/settings");

    await userEvent.click(await screen.findByRole("button", { name: "Reset demo" }));

    expect(reset).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole("heading", { level: 1, name: "Create your account" })).toBeDefined();
    expect(window.sessionStorage.getItem("gradtracker.demoSignedIn")).toBeNull();
  });

  it("Reset demo outside the presentation demo says so and stays put", async () => {
    window.sessionStorage.setItem("gradtracker.demoSignedIn", "1");
    vi.spyOn(api, "resetDemo").mockRejectedValue(new ApiError(404, "Not found."));
    renderAt("/settings");

    await userEvent.click(await screen.findByRole("button", { name: "Reset demo" }));

    expect(await screen.findByText(/only in the presentation demo/)).toBeDefined();
    expect(window.sessionStorage.getItem("gradtracker.demoSignedIn")).toBe("1");
  });
});

describe("the scan reading the demo inbox (D37)", () => {
  it("updates the sidebar's Needs review count once the scan has filled the dashboard", async () => {
    // Before the scan the dashboard is empty; the scan finds four to review.
    let scanned = false;
    vi.spyOn(api, "listReview").mockImplementation(async () => ({ items: scanned ? review : [] }));
    vi.spyOn(api, "demoScan").mockImplementation(async () => {
      scanned = true;
      return {
        emailsRead: 80, newApplications: 20, updatedApplications: 31, stageChanges: 20, needsReview: 4, ignored: 25,
        source: "inbox" as const, inbox: "gradtrackerdemo@gmail.com", notice: null,
      };
    });
    await allowAndScan();
    await screen.findByText(/of 80/);
    await act(async () => {
      vi.advanceTimersByTime(SCAN_MS + 1000);
    });

    const nav = await screen.findByRole("navigation");
    await waitFor(() => expect(within(nav).getByRole("button", { name: /^Needs reviews*4$/ })).toBeDefined());
  });

  async function allowAndScan() {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    withAccount();
    renderAt("/connect");
    await user.click(await screen.findByRole("button", { name: "Continue with Google" }));
    await user.click(await screen.findByRole("button", { name: "Allow" }));
  }

  afterEach(() => vi.useRealTimers());

  it("names the inbox it reads, counts its emails, and says no model is called", async () => {
    vi.spyOn(api, "demoScan").mockResolvedValue({
      emailsRead: 80, newApplications: 20, updatedApplications: 31, stageChanges: 20, needsReview: 4, ignored: 25,
      source: "inbox", inbox: "gradtrackerdemo@gmail.com", notice: null,
    });
    await allowAndScan();

    expect(await screen.findByText(/Reading gradtrackerdemo@gmail.com, the demo inbox/)).toBeDefined();
    expect(screen.getByText(/no model is called/)).toBeDefined();
    await act(async () => {
      vi.advanceTimersByTime(SCAN_MS + 1000);
    });
    expect(await screen.findByRole("heading", { level: 1, name: "Applications" })).toBeDefined();
  });

  it("says why when it fell back to the sample mailbox", async () => {
    vi.spyOn(api, "demoScan").mockResolvedValue({
      emailsRead: 612, newApplications: 25, updatedApplications: 0, stageChanges: 0, needsReview: 4, ignored: 0,
      source: "sample", inbox: null, notice: "Could not sign in to the demo inbox. Showing the sample mailbox instead.",
    });
    await allowAndScan();
    // The counts appear once the scan has answered; only then does it run.
    expect(await screen.findByText(/of 612/)).toBeDefined();
    await act(async () => {
      vi.advanceTimersByTime(SCAN_MS + 1000);
    });
    expect(await screen.findByText(/Showing the sample mailbox instead/)).toBeDefined();
  });
});
