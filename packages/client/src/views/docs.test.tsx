// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { App } from "../App";
import { ThemeProvider } from "../theme/theme";
import { api } from "../api/client";
import { DOC_PAGES, renderMarkdown } from "../documentation/pages";

/**
 * T5.9 — the Documentation Center. Its done-when: all five pages render inside
 * the app shell, and editing a file in `docs/` changes the page with no second
 * edit — so each page must *be* a section of a file there, not a copy of one.
 */

const DOCS = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..", "docs");
const read = (file: string) => readFileSync(join(DOCS, file), "utf8");

beforeEach(() => {
  vi.spyOn(api, "listReview").mockResolvedValue({ items: [] });
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

describe("the Documentation Center (T5.9)", () => {
  it("offers the five pages inside the app shell, starting at Architecture", async () => {
    renderAt("/docs");

    const tabs = await screen.findByRole("tablist");
    expect(within(tabs).getAllByRole("tab").map((t) => t.textContent)).toEqual([
      "Architecture",
      "Components",
      "Data flow",
      "API",
      "Dependencies",
    ]);
    expect(within(tabs).getByRole("tab", { name: "Architecture" }).getAttribute("aria-selected")).toBe("true");
    // Inside the shell: the sidebar is there, with Documentation lit.
    expect(screen.getByRole("navigation")).toBeDefined();
  });

  it.each(DOC_PAGES.map((page) => [page.title, page] as const))(
    "%s is the section of docs/ it names, read from the file — not a copy",
    async (_title, page) => {
      renderAt(`/docs/${page.slug}`);
      const article = await screen.findByRole("article");

      for (const heading of page.headings) {
        // The heading, and the first sentence under it, as the file has them
        // today — read here independently of the page's own code.
        const source = read(page.file);
        expect(source, `${page.file} no longer has "${heading}"`).toContain(`\n${heading}\n`);
        const after = source.slice(source.indexOf(`\n${heading}\n`) + heading.length + 2);
        const firstProse = after
          .split(/\r?\n/)
          .find((line) => /^[A-Z*]/.test(line.trim()) && !line.startsWith("|") && !line.startsWith("#"))!;
        // Markdown punctuation is gone once rendered — emphasis, code, links —
        // but a `*` can also be literal inside code, so both sides drop it.
        const plain = (s: string) => s.replace(/[*`]/g, "");
        const words = plain(firstProse.replace(/\[|\]\([^)]*\)/g, "")).split(/\s+/).slice(0, 6).join(" ");

        expect(article.textContent).toContain(heading.replace(/^#+\s*/, ""));
        expect(plain(article.textContent ?? "")).toContain(words);
      }
      expect(screen.getByText(new RegExp(`From docs/${page.file.replace(".", "\\.")}`))).toBeDefined();
    },
  );

  it("renders tables as tables", async () => {
    renderAt("/docs/components");
    const article = await screen.findByRole("article");
    expect(within(article).getAllByRole("table").length).toBeGreaterThan(0);
  });

  it("moves between pages with the tabs", async () => {
    renderAt("/docs/architecture");
    await userEvent.click(await screen.findByRole("tab", { name: "API" }));
    expect(within(await screen.findByRole("article")).getByRole("heading", { name: /API surface/ })).toBeDefined();
  });

  it("an unknown page leads to the first one rather than a blank", async () => {
    renderAt("/docs/nonsense");
    expect(await screen.findByRole("tab", { name: "Architecture", selected: true })).toBeDefined();
  });
});

describe("links inside the documentation never dead-end", () => {
  it("keeps a web link, opening it in a new tab", () => {
    const html = renderMarkdown("See [Lucide](https://lucide.dev).");
    expect(html).toContain('href="https://lucide.dev"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noreferrer"');
  });

  it("turns a link to another docs file into plain text, since the app has no page for it", () => {
    const html = renderMarkdown("Reasoning is in [decision-record.md](decision-record.md) and [§7](#7-ai-vs-human).");
    expect(html).not.toContain("<a");
    expect(html).toContain("decision-record.md");
    expect(html).toContain("§7");
  });
});
