// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup, act, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import type { AuthSessionResponse, DemoScanResponse, Job, ListJobsResponse, ReviewItem } from "@gradtracker/shared";
import { App } from "../App";
import { ThemeProvider } from "../theme/theme";
import { api, ApiError } from "../api/client";
import { SCAN_MS } from "./ConnectView";

/**
 * The presentation demo's accounts (D40): create a fresh account in front of
 * the room, see its empty dashboard, sign out, sign in to the demo inbox's
 * account — whose first sign-in connects Gmail and scans — and back.
 */

const INBOX = "gradtrackerdemo@gmail.com";

const signedOut: AuthSessionResponse = { user: null, canConnectInbox: false, scanned: false, inbox: INBOX };
const newcomer: AuthSessionResponse = {
  user: { email: "jordan@student.monash.edu", name: "Jordan Psomas" },
  canConnectInbox: false,
  scanned: false,
  inbox: INBOX,
};
const demoFirstTime: AuthSessionResponse = {
  user: { email: INBOX, name: "GradTracker Demo" },
  canConnectInbox: true,
  scanned: false,
  inbox: INBOX,
};
const demoScanned: AuthSessionResponse = { ...demoFirstTime, scanned: true };

function job(id: string, company: string, status: "active" | "archived" = "active"): Job {
  return {
    id,
    company,
    role: "Graduate Program",
    stage: "applied",
    deadlineAt: null,
    nextAction: null,
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
  gmailMessageId: null,
  suggestedJob: null,
}));

const scan: DemoScanResponse = {
  emailsRead: 80,
  newApplications: 20,
  updatedApplications: 31,
  stageChanges: 20,
  needsReview: 4,
  ignored: 25,
  source: "inbox",
  inbox: INBOX,
  notice: null,
};

/** The server, as far as the screens can tell: who is signed in, and what
 *  their dashboard holds — empty until the demo inbox's account scans. */
let current: AuthSessionResponse;
let scanned: boolean;

beforeEach(() => {
  current = signedOut;
  scanned = false;
  vi.spyOn(api, "session").mockImplementation(async () => current);
  vi.spyOn(api, "listJobs").mockImplementation(
    async (options = {}): Promise<ListJobsResponse> => {
      const jobs = scanned ? Array.from({ length: 20 }, (_, i) => job(`j${i}`, `Company ${i}`)) : [];
      return {
        jobs: options.status === "archived" ? [] : jobs,
        stats: { liveApplications: jobs.length, dueThisWeek: 0, needsReview: scanned ? 4 : 0, emailsRead: scanned ? 80 : 0 },
      };
    },
  );
  vi.spyOn(api, "listReview").mockImplementation(async () => ({ items: scanned ? review : [] }));
  vi.spyOn(api, "getSettings").mockResolvedValue({ reviewThreshold: 0.75 });
  vi.spyOn(api, "demoScan").mockImplementation(async () => {
    scanned = true;
    current = demoScanned;
    return scan;
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
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

const heading = (name: string | RegExp) => screen.findByRole("heading", { level: 1, name });

describe("creating an account (D40)", () => {
  it("is where a newcomer starts, outside the app", async () => {
    renderAt("/");
    expect(await heading("Create your account")).toBeDefined();
    expect(screen.queryByRole("navigation")).toBeNull();
    expect(screen.getByRole("link", { name: "Sign in" }).getAttribute("href")).toBe("/signin");
  });

  it("checks the form before asking the server", async () => {
    const signUp = vi.spyOn(api, "signUp");
    renderAt("/signup");
    await userEvent.click(await screen.findByRole("button", { name: "Create account" }));

    expect(screen.getByText("Enter your name")).toBeDefined();
    expect(screen.getByText(/Enter an email address/)).toBeDefined();
    expect(screen.getByText("Use at least 8 characters")).toBeDefined();
    expect(signUp).not.toHaveBeenCalled();
  });

  it("creates the account and opens its empty dashboard — keeping no password in the browser", async () => {
    const signUp = vi.spyOn(api, "signUp").mockImplementation(async () => (current = newcomer));
    renderAt("/signup");
    await userEvent.type(await screen.findByLabelText("Full name"), "Jordan Psomas");
    await userEvent.type(screen.getByLabelText("Email"), "jordan@student.monash.edu");
    await userEvent.type(screen.getByLabelText("Password"), "correct-horse");
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(signUp).toHaveBeenCalledWith({ name: "Jordan Psomas", email: "jordan@student.monash.edu", password: "correct-horse" });
    expect(await heading("Pipeline")).toBeDefined();
    expect(await screen.findByText(/only the demo inbox's own account can connect Gmail/)).toBeDefined();
    expect(JSON.stringify({ ...window.sessionStorage, ...window.localStorage })).not.toContain("correct-horse");
  });

  it("says when the email already has an account, on the email field", async () => {
    vi.spyOn(api, "signUp").mockRejectedValue(
      new ApiError(409, "There's already an account with this email — sign in instead.", "email"),
    );
    renderAt("/signup");
    await userEvent.type(await screen.findByLabelText("Full name"), "Jordan");
    await userEvent.type(screen.getByLabelText("Email"), "jordan@student.monash.edu");
    await userEvent.type(screen.getByLabelText("Password"), "correct-horse");
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByText(/sign in instead/)).toBeDefined();
    expect(screen.getByLabelText(/^Email/).getAttribute("aria-invalid")).toBe("true");
  });
});

describe("signing in (D40)", () => {
  it("says so when the email and password don't match", async () => {
    vi.spyOn(api, "signIn").mockRejectedValue(new ApiError(401, "That email and password don't match an account."));
    renderAt("/signin");
    await userEvent.type(await screen.findByLabelText("Email"), INBOX);
    await userEvent.type(screen.getByLabelText("Password"), "wrong-password");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("alert")).toBeDefined();
    expect(screen.getByText("That email and password don't match an account.")).toBeDefined();
  });

  it("takes the demo inbox's account to Connect Gmail on its first sign-in, as itself", async () => {
    vi.spyOn(api, "signIn").mockImplementation(async () => (current = demoFirstTime));
    renderAt("/signin");
    await userEvent.type(await screen.findByLabelText("Email"), INBOX);
    await userEvent.type(screen.getByLabelText("Password"), "correct-horse");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await heading("Welcome, GradTracker. Connect your Gmail")).toBeDefined();
    expect(screen.getByText("Reads your Gmail, read-only")).toBeDefined();
    await userEvent.click(screen.getByRole("button", { name: "Continue with Google" }));

    const consent = await screen.findByRole("region", { name: /Sign in with Google/ });
    expect(within(consent).getByText("GradTracker Demo")).toBeDefined();
    expect(within(consent).getByText(INBOX)).toBeDefined();
    expect(within(consent).getByText(/cannot send, delete or change/)).toBeDefined();

    await userEvent.click(within(consent).getByRole("button", { name: "Cancel" }));
    expect(await screen.findByRole("button", { name: "Continue with Google" })).toBeDefined();
  });

  it("goes straight to the dashboard once the inbox has been scanned", async () => {
    current = demoScanned;
    scanned = true;
    renderAt("/");
    expect(await heading("Pipeline")).toBeDefined();
  });

  it("never lets another account connect the demo inbox", async () => {
    current = newcomer;
    renderAt("/connect");
    expect(await heading("Pipeline")).toBeDefined();
  });

  it("goes to Sign in when the server says nobody is signed in", async () => {
    // Through the real request path, so the client's own 401 handling runs.
    vi.mocked(api.listJobs).mockRestore();
    vi.spyOn(globalThis, "fetch").mockImplementation(
      async () => new Response(JSON.stringify({ error: "Sign in first." }), { status: 401 }),
    );
    renderAt("/pipeline");
    expect(await heading("Sign in")).toBeDefined();
  });
});

describe("the demo inbox's first scan (D37, D40)", () => {
  async function connectAndAllow() {
    current = demoFirstTime;
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderAt("/connect");
    await user.click(await screen.findByRole("button", { name: "Continue with Google" }));
    await user.click(await screen.findByRole("button", { name: "Allow" }));
  }

  it("names the inbox, says no model is called, and opens the dashboard with the review count", async () => {
    await connectAndAllow();
    expect(await screen.findByText(/Reading gradtrackerdemo@gmail.com, the demo inbox/)).toBeDefined();
    expect(screen.getByText(/no model is called/)).toBeDefined();
    await act(async () => {
      vi.advanceTimersByTime(SCAN_MS + 1000);
    });

    expect(await heading("Pipeline")).toBeDefined();
    expect(await screen.findByText(/Inbox scanned — 20 applications found, 4 to review/)).toBeDefined();
    const nav = await screen.findByRole("navigation", { name: "Main" });
    await waitFor(() => expect(within(nav).getByRole("link", { name: "Needs review, 4" })).toBeDefined());
  });

  it("says why when it fell back to the sample mailbox", async () => {
    vi.spyOn(api, "demoScan").mockImplementation(async () => {
      scanned = true;
      return { ...scan, source: "sample", inbox: null, notice: "Could not sign in to the demo inbox. Showing the sample mailbox instead." };
    });
    await connectAndAllow();
    expect(await screen.findByText(/of 80/)).toBeDefined();
    await act(async () => {
      vi.advanceTimersByTime(SCAN_MS + 1000);
    });
    expect(await screen.findByText(/Showing the sample mailbox instead/)).toBeDefined();
  });
});

describe("Settings → Account (D40)", () => {
  it("says who is signed in, and Sign out goes to Sign in", async () => {
    current = newcomer;
    const signOut = vi.spyOn(api, "signOut").mockImplementation(async () => {
      current = signedOut;
      return { ok: true };
    });
    renderAt("/settings");

    expect(await screen.findByText(/Signed in as/)).toBeDefined();
    expect(screen.getAllByText(/jordan@student.monash.edu/).length).toBeGreaterThan(0);
    // Settings' own Sign out (the sidebar's profile has one too).
    const profile = screen.getByRole("region", { name: "Profile" });
    await userEvent.click(within(profile).getByRole("button", { name: "Sign out" }));

    expect(signOut).toHaveBeenCalled();
    expect(await heading("Sign in")).toBeDefined();
  });

  it("the sidebar shows the signed-in account, with its own Sign out", async () => {
    current = newcomer;
    vi.spyOn(api, "signOut").mockImplementation(async () => {
      current = signedOut;
      return { ok: true };
    });
    renderAt("/pipeline");

    expect(await screen.findByText("Jordan Psomas")).toBeDefined();
    const signOuts = await screen.findAllByRole("button", { name: "Sign out" });
    await userEvent.click(signOuts[0]!);
    expect(await heading("Sign in")).toBeDefined();
  });

  it("Reset demo sends the demo inbox's account back to its first scan", async () => {
    current = demoScanned;
    scanned = true;
    vi.spyOn(api, "resetDemo").mockImplementation(async () => {
      scanned = false;
      current = demoFirstTime;
      return { ok: true };
    });
    renderAt("/settings");
    await userEvent.click(await screen.findByRole("button", { name: "Reset demo" }));

    expect(await heading("Welcome, GradTracker. Connect your Gmail")).toBeDefined();
  });

  it("Reset demo outside the presentation demo says so and stays put", async () => {
    current = newcomer;
    vi.spyOn(api, "resetDemo").mockRejectedValue(new ApiError(404, "Not found."));
    renderAt("/settings");
    await userEvent.click(await screen.findByRole("button", { name: "Reset demo" }));

    expect(await screen.findByText(/only in the presentation demo/)).toBeDefined();
    expect(screen.getByRole("heading", { level: 1, name: "Settings" })).toBeDefined();
  });
});
