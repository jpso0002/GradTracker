// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { OpeningItem } from "@gradtracker/shared";
import { OpeningsView, matchesOpening } from "./OpeningsView";
import { ToastHost } from "../shell/ToastHost";
import { api } from "../api/client";

/**
 * Openings (D43): jobs from job alerts the student could apply for, with
 * Gmail, "I've applied", Dismiss and search.
 */

const opening = (over: Partial<OpeningItem> = {}): OpeningItem => ({
  id: "o-afterpay",
  company: "Afterpay",
  role: "Graduate Software Engineer",
  location: "Melbourne",
  closesAt: "2026-11-06T12:59:00.000Z",
  daysLeft: 18,
  source: "SEEK",
  senderDomain: "seek.com.au",
  gmailMessageId: "fixture-059@gradtracker.demo",
  firstSeenAt: "2026-10-19T00:00:00.000Z",
  ...over,
});

const LINKTREE = opening({
  id: "o-linktree",
  company: "Linktree",
  role: "Associate Product Manager (Graduate)",
  closesAt: null,
  daysLeft: null,
  gmailMessageId: "seed-1",
});

beforeEach(() => {
  vi.spyOn(api, "me").mockResolvedValue({
    email: "gradtrackerdemo@gmail.com",
    displayName: "Sam Nguyen",
    gmailConnected: true,
    reviewThreshold: 0.75,
    timeZone: "Australia/Melbourne",
    demoMode: true,
    mailbox: "gradtrackerdemo@gmail.com",
    sync: { state: "idle", lastSyncAt: null, emailsReadTotal: 80, progress: null, lastError: null },
  });
  vi.spyOn(api, "listOpenings").mockResolvedValue({ openings: [opening(), LINKTREE] });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderOpenings(onApplied = vi.fn()) {
  render(
    <ToastHost>
      <MemoryRouter initialEntries={["/openings"]}>
        <Routes>
          <Route path="/openings" element={<OpeningsView onApplied={onApplied} />} />
          <Route path="/pipeline/:jobId" element={<p>Application panel</p>} />
        </Routes>
      </MemoryRouter>
    </ToastHost>,
  );
  return onApplied;
}

describe("OpeningsView", () => {
  it("shows each job with where, from which board, and when it closes", async () => {
    renderOpenings();
    const row = (await screen.findByText("Afterpay")).closest("li")!;
    expect(within(row).getByText("Graduate Software Engineer")).toBeDefined();
    expect(within(row).getByText(/Melbourne/)).toBeDefined();
    expect(within(row).getByText("Via SEEK")).toBeDefined();
    expect(within(row).getByText("Closes in 18 days")).toBeDefined();
    expect(screen.getByText("No closing date given")).toBeDefined();
    expect(screen.getByText("2 openings")).toBeDefined();
  });

  it("links to the alert in Gmail, and only where there is an email to link to", async () => {
    renderOpenings();
    const link = await screen.findByRole("link", { name: /Afterpay.*in Gmail/ });
    expect(link.getAttribute("href")).toContain("rfc822msgid");
    expect(screen.queryByRole("link", { name: /Linktree.*in Gmail/ })).toBeNull();
  });

  it("turns \"I've applied\" into an application and goes to it", async () => {
    const applied = vi.spyOn(api, "markOpeningApplied").mockResolvedValue({ jobId: "job-1", created: true });
    const onApplied = renderOpenings();

    await userEvent.click(await screen.findByRole("button", { name: "I've applied: Afterpay, Graduate Software Engineer" }));
    expect(applied).toHaveBeenCalledWith("o-afterpay");
    expect(onApplied).toHaveBeenCalled();
    expect(await screen.findByText("Application panel")).toBeDefined();
    expect(await screen.findByText("Added Afterpay to Applications")).toBeDefined();
  });

  it("dismisses one without re-reading the list", async () => {
    const dismissed = vi.spyOn(api, "dismissOpening").mockResolvedValue({ ok: true });
    renderOpenings();

    await userEvent.click(await screen.findByRole("button", { name: "Dismiss Linktree, Associate Product Manager (Graduate)" }));
    expect(dismissed).toHaveBeenCalledWith("o-linktree");
    expect(screen.queryByText("Linktree")).toBeNull();
    expect(screen.getByText("1 opening")).toBeDefined();
  });

  it("searches company, role, location and source", async () => {
    renderOpenings();
    await userEvent.type(await screen.findByRole("textbox", { name: "Search openings" }), "product");
    expect(screen.queryByText("Afterpay")).toBeNull();
    expect(screen.getByText("Linktree")).toBeDefined();

    expect(matchesOpening(opening(), "seek")).toBe(true);
    expect(matchesOpening(opening(), "sydney")).toBe(false);
  });

  it("says when there is nothing to apply for", async () => {
    vi.spyOn(api, "listOpenings").mockResolvedValue({ openings: [] });
    renderOpenings();
    expect(await screen.findByText("No openings right now")).toBeDefined();
  });
});
