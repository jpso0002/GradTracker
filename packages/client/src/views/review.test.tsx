// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, waitFor, cleanup, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { ReviewItem } from "@gradtracker/shared";
import { ReviewView } from "./ReviewView";
import { ToastHost } from "../shell/ToastHost";
import { api, ApiError } from "../api/client";

/**
 * The review queue (T6.3): emails GradTracker would not assert on its own.
 * Nothing on these cards is a fact until the student confirms it.
 */

const FIRST = "11111111-1111-4111-8111-111111111111";
const SECOND = "22222222-2222-4222-8222-222222222222";
const TRACKED = "33333333-3333-4333-8333-333333333333";

function item(over: Partial<ReviewItem> = {}): ReviewItem {
  return {
    eventId: FIRST,
    receivedAt: "2026-08-15T00:00:00.000Z",
    senderDomain: "boutique-consult.com.au",
    company: "Boutique Consulting",
    role: "Graduate Analyst",
    stage: "applied",
    deadlineAt: null,
    nextAction: null,
    confidence: 0.62,
    suggestedJob: null,
    ...over,
  };
}

function renderReview(items: ReviewItem[], path = "/review") {
  vi.spyOn(api, "listReview").mockResolvedValue({ items });
  const onChanged = vi.fn();
  render(
    <ToastHost>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/review" element={<ReviewView onChanged={onChanged} />} />
        </Routes>
      </MemoryRouter>
    </ToastHost>,
  );
  return { onChanged };
}

const card = (name: RegExp) => screen.findByRole("article", { name });

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  document.documentElement.style.removeProperty("--dur-base");
});

describe("ReviewView (T6.3)", () => {
  it("shows what GradTracker read from each email, how sure it is, and where it came from", async () => {
    renderReview([item({ nextAction: "Complete the video interview" })]);
    const c = await card(/Boutique Consulting/);

    expect(within(c).getByText("Graduate Analyst")).toBeDefined();
    expect(within(c).getByText("Applied")).toBeDefined();
    expect(within(c).getByText("Complete the video interview")).toBeDefined();
    expect(within(c).getByText(/Detected from boutique-consult\.com\.au/)).toBeDefined();
    expect(within(c).getByTitle("How sure the model is about this email: 62%")).toBeDefined();
  });

  it("confirming adds the application as shown and moves focus to the next item", async () => {
    const confirm = vi.spyOn(api, "confirmReview").mockResolvedValue({ jobId: TRACKED, matched: false });
    const { onChanged } = renderReview([
      item(),
      item({ eventId: SECOND, company: "Optiver", role: "Graduate Trader" }),
    ]);

    await userEvent.click(within(await card(/Boutique Consulting/)).getByRole("button", { name: "Confirm" }));

    // An untouched card is "yes, as shown": no corrections, no question.
    expect(confirm).toHaveBeenCalledWith(FIRST, {});
    await waitFor(() => expect(screen.queryByText("Boutique Consulting")).toBeNull());
    expect(document.activeElement).toBe(await card(/Optiver/));
    expect(await screen.findByText("Added to your pipeline")).toBeDefined();
    // The sidebar count re-reads.
    expect(onChanged).toHaveBeenCalled();
  });

  it("fades the item out before removing it, on the motion tokens", async () => {
    // jsdom has no stylesheet, so the token is set here; the real one is zeroed
    // under prefers-reduced-motion, which is why nothing may bypass it.
    document.documentElement.style.setProperty("--dur-base", "120ms");
    vi.spyOn(api, "confirmReview").mockResolvedValue({ jobId: TRACKED, matched: false });
    renderReview([item(), item({ eventId: SECOND, company: "Optiver" })]);
    const leaving = await card(/Boutique Consulting/);
    expect(leaving.style.transition).toContain("var(--dur-base)");

    await userEvent.click(within(leaving).getByRole("button", { name: "Confirm" }));

    await waitFor(() => expect(leaving.style.opacity).toBe("0"));
    expect(leaving.isConnected).toBe(true);
    await waitFor(() => expect(leaving.isConnected).toBe(false));
  });

  it("Edit and confirm sends only the fields the student changed", async () => {
    const confirm = vi.spyOn(api, "confirmReview").mockResolvedValue({ jobId: TRACKED, matched: false });
    renderReview([item()]);
    const c = await card(/Boutique Consulting/);

    await userEvent.click(within(c).getByRole("button", { name: "Edit" }));
    const role = within(c).getByRole("textbox", { name: /^Role/ });
    await userEvent.clear(role);
    await userEvent.type(role, "Graduate Analyst, Risk");
    await userEvent.click(within(c).getByRole("button", { name: "Confirm" }));

    expect(confirm).toHaveBeenCalledWith(FIRST, { corrections: { role: "Graduate Analyst, Risk" } });
  });

  it("asks same application or a new one before confirming an item with a suggestion", async () => {
    const confirm = vi.spyOn(api, "confirmReview").mockResolvedValue({ jobId: TRACKED, matched: true });
    renderReview([
      item({
        company: "Macquarie",
        role: "Graduate Program (Technology)",
        suggestedJob: { id: TRACKED, company: "Macquarie", role: "Graduate Program (Risk)" },
      }),
    ]);
    const c = await card(/Macquarie/);
    const question = within(c).getByRole("group", {
      name: /same application as Macquarie — Graduate Program \(Risk\)/,
    });

    // Unanswered, Confirm asks rather than guessing.
    await userEvent.click(within(c).getByRole("button", { name: "Confirm" }));
    expect(confirm).not.toHaveBeenCalled();
    expect(within(c).getByText(/Choose whether this is the same application/)).toBeDefined();

    await userEvent.click(within(question).getByRole("radio", { name: "Same application" }));
    await userEvent.click(within(c).getByRole("button", { name: "Confirm" }));

    expect(confirm).toHaveBeenCalledWith(FIRST, { application: "same" });
    expect(await screen.findByText("Added to Macquarie — Graduate Program (Risk)")).toBeDefined();
  });

  it("answering a new one starts a separate application", async () => {
    const confirm = vi.spyOn(api, "confirmReview").mockResolvedValue({ jobId: SECOND, matched: false });
    renderReview([
      item({
        company: "Macquarie",
        role: "Graduate Program (Technology)",
        suggestedJob: { id: TRACKED, company: "Macquarie", role: "Graduate Program (Risk)" },
      }),
    ]);
    const c = await card(/Macquarie/);

    await userEvent.click(within(c).getByRole("radio", { name: "New application" }));
    await userEvent.click(within(c).getByRole("button", { name: "Confirm" }));

    expect(confirm).toHaveBeenCalledWith(FIRST, { application: "new" });
    expect(await screen.findByText("Added to your pipeline")).toBeDefined();
  });

  it("Not an application dismisses the item, and the empty queue takes focus", async () => {
    const dismiss = vi.spyOn(api, "dismissReview").mockResolvedValue({ ok: true });
    const { onChanged } = renderReview([item()]);

    await userEvent.click(
      within(await card(/Boutique Consulting/)).getByRole("button", { name: "Not an application" }),
    );

    expect(dismiss).toHaveBeenCalledWith(FIRST);
    expect(await screen.findByText("Nothing to review")).toBeDefined();
    await waitFor(() => expect(document.activeElement?.textContent).toContain("Nothing to review"));
    expect(onChanged).toHaveBeenCalled();
  });

  it("a refusal opens the editor with the reason beneath the field, keeping the card", async () => {
    const confirm = vi
      .spyOn(api, "confirmReview")
      .mockRejectedValueOnce(new ApiError(400, "A company and role are required to confirm an application.", "company"))
      .mockResolvedValue({ jobId: TRACKED, matched: false });
    renderReview([item({ company: null })]);
    const c = await card(/Company not found/);

    await userEvent.click(within(c).getByRole("button", { name: "Confirm" }));

    const company = await within(c).findByRole("textbox", { name: /^Company/ });
    expect(within(c).getByText("A company and role are required to confirm an application.")).toBeDefined();
    expect(document.activeElement).toBe(company);

    await userEvent.type(company, "Boutique Consulting");
    await userEvent.click(within(c).getByRole("button", { name: "Confirm" }));
    expect(confirm).toHaveBeenLastCalledWith(FIRST, { corrections: { company: "Boutique Consulting" } });
  });

  it("lands on the item a row's marker links to", async () => {
    renderReview([item(), item({ eventId: SECOND, company: "Optiver" })], `/review#review-${SECOND}`);
    await waitFor(async () => expect(document.activeElement).toBe(await card(/Optiver/)));
  });

  it("says so when there is nothing to review", async () => {
    renderReview([]);
    expect(await screen.findByText("Nothing to review")).toBeDefined();
  });
});
