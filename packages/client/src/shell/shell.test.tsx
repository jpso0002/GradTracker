// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { App } from "../App";
import { ThemeProvider } from "../theme/theme";
import { api } from "../api/client";

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
