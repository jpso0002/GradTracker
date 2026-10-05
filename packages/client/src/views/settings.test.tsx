// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, waitFor, cleanup, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { SettingsView } from "./SettingsView";
import { ToastHost } from "../shell/ToastHost";
import { ThemeProvider } from "../theme/theme";
import { api, ApiError } from "../api/client";

/**
 * Settings (T6.4): the review threshold (D28) and the theme. Gmail connection
 * is deferred with sign-in (T4.1–T4.3).
 */

function renderSettings(reviewThreshold = 0.8) {
  vi.spyOn(api, "getSettings").mockResolvedValue({ reviewThreshold });
  render(
    <ThemeProvider>
      <ToastHost>
        <MemoryRouter>
          <SettingsView />
        </MemoryRouter>
      </ToastHost>
    </ThemeProvider>,
  );
}

const slider = () =>
  screen.findByRole("slider", {
    name: "How sure GradTracker must be before adding an application automatically",
  }) as Promise<HTMLInputElement>;

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe("SettingsView (T6.4)", () => {
  it("shows the student's own threshold, and says it applies to new mail only", async () => {
    renderSettings(0.8);
    expect((await slider()).value).toBe("0.8");
    expect((await slider()).getAttribute("aria-valuetext")).toBe("80%");
    expect(screen.getByText(/Applies to new mail only/)).toBeDefined();
  });

  it("moving the slider persists through PATCH /api/settings", async () => {
    renderSettings(0.8);
    const update = vi.spyOn(api, "updateSettings").mockResolvedValue({ reviewThreshold: 0.9 });

    fireEvent.change(await slider(), { target: { value: "0.9" } });

    await waitFor(() => expect(update).toHaveBeenCalledWith({ reviewThreshold: 0.9 }));
    expect(update).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(/Review threshold saved/)).toBeDefined();
  });

  it("saves once when the slider is dragged through several values", async () => {
    renderSettings(0.8);
    const update = vi.spyOn(api, "updateSettings").mockResolvedValue({ reviewThreshold: 0.6 });

    for (const value of ["0.75", "0.7", "0.65", "0.6"]) fireEvent.change(await slider(), { target: { value } });

    await waitFor(() => expect(update).toHaveBeenCalledWith({ reviewThreshold: 0.6 }));
    expect(update).toHaveBeenCalledTimes(1);
  });

  it("at the maximum, says every application email will wait for the student", async () => {
    renderSettings(0.8);
    vi.spyOn(api, "updateSettings").mockResolvedValue({ reviewThreshold: 1 });

    fireEvent.change(await slider(), { target: { value: "1" } });

    expect(await screen.findByText(/Every application email waits in Needs review/)).toBeDefined();
  });

  it("puts the slider back and says so when the save fails", async () => {
    renderSettings(0.8);
    vi.spyOn(api, "updateSettings").mockRejectedValue(new ApiError(500, "Internal server error."));

    fireEvent.change(await slider(), { target: { value: "0.9" } });

    expect(await screen.findByText(/Could not save the review threshold/)).toBeDefined();
    await waitFor(async () => expect((await slider()).value).toBe("0.8"));
  });

  it("turns the / search shortcut off and on (WCAG 2.1.4)", async () => {
    renderSettings();
    const shortcut = await screen.findByRole("checkbox", { name: /Press \/ to search/ });
    expect((shortcut as HTMLInputElement).checked).toBe(true);

    await userEvent.click(shortcut);
    expect(window.localStorage.getItem("gradtracker.shortcuts")).toBe("off");
    await userEvent.click(shortcut);
    expect(window.localStorage.getItem("gradtracker.shortcuts")).toBe("on");
  });

  it("switches the theme", async () => {
    renderSettings();
    const before = document.documentElement.getAttribute("data-theme");

    await userEvent.click(await screen.findByRole("checkbox", { name: /Dark theme/ }));

    expect(document.documentElement.getAttribute("data-theme")).not.toBe(before);
  });
});
