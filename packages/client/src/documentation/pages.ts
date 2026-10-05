import { Marked, type Tokens } from "marked";
import implementation from "../../../../docs/implementation.md?raw";
import design from "../../../../docs/design.md?raw";
import codebaseGuide from "../../../../docs/codebase-guide.md?raw";
import rootPackage from "../../../../package.json?raw";
import clientPackage from "../../package.json?raw";
import serverPackage from "../../../server/package.json?raw";
import sharedPackage from "../../../shared/package.json?raw";

/**
 * The Documentation Center's pages (T5.9).
 *
 * **Each page is a section of a file in `docs/`, imported as text when the app
 * is built** — not a copy. Editing the file changes the page with no second
 * edit; in development, Vite reloads it as the file is saved. If a heading a
 * page names is renamed, `docs.test.tsx` fails, rather than the page going
 * quietly blank.
 */

export interface DocPage {
  slug: string;
  title: string;
  file: keyof typeof SOURCES;
  /** The sections shown, by their exact heading line. */
  headings: string[];
}

const SOURCES = {
  "implementation.md": implementation,
  "design.md": design,
  "codebase-guide.md": codebaseGuide,
};

export const DOC_PAGES: DocPage[] = [
  { slug: "architecture", title: "Architecture", file: "implementation.md", headings: ["## 2. System architecture"] },
  {
    slug: "components",
    title: "Components",
    file: "design.md",
    headings: ["## 4. Component inventory", "## 5. The four product-specific components"],
  },
  { slug: "data-flow", title: "Data flow", file: "codebase-guide.md", headings: ["## 2. The whole system in one page"] },
  { slug: "api", title: "API", file: "implementation.md", headings: ["## 9. API surface"] },
  { slug: "dependencies", title: "Dependencies", file: "implementation.md", headings: ["## 1. Stack"] },
];

/**
 * One section of a markdown file: from its heading to the next heading of the
 * same or a higher level, ignoring `#` inside code blocks. A trailing `---`
 * belongs to the document's layout, not the section.
 */
export function section(markdown: string, heading: string): string | null {
  const lines = markdown.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === heading);
  if (start === -1) return null;
  const level = /^#+/.exec(heading)![0].length;

  let end = lines.length;
  let fenced = false;
  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i]!;
    if (line.startsWith("```")) fenced = !fenced;
    const match = fenced ? null : /^(#+)\s/.exec(line);
    if (match && match[1]!.length <= level) {
      end = i;
      break;
    }
  }
  return lines.slice(start, end).join("\n").replace(/\n-{3,}\s*$/, "").trim();
}

export function pageMarkdown(page: DocPage): string {
  return page.headings
    .map((heading) => section(SOURCES[page.file], heading) ?? `*“${heading}” is no longer in docs/${page.file}.*`)
    .join("\n\n");
}

const marked = new Marked({
  gfm: true,
  renderer: {
    /**
     * A web link opens in a new tab. A link to another file in `docs/`, or to
     * an anchor, has no page in the app — so it is plain text, not a dead link.
     */
    link({ href, tokens }: Tokens.Link) {
      const text = this.parser.parseInline(tokens);
      if (/^https?:\/\//.test(href)) {
        const safe = href.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
        return `<a href="${safe}" target="_blank" rel="noreferrer">${text}</a>`;
      }
      return `<span>${text}</span>`;
    },
  },
});

/** The docs are this repository's own files, compiled in at build time — no
 *  student or email content ever passes through here. */
export function renderMarkdown(markdown: string): string {
  return marked.parse(markdown, { async: false });
}

// ── Dependencies: the installed packages, read from the package files ──────

interface PackageFile {
  name: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export interface InstalledPackage {
  workspace: string;
  name: string;
  version: string;
  kind: "runtime" | "development";
}

/** What `npm install` actually installs — from the package files themselves, so
 *  this list cannot drift from them either. Workspace links are left out. */
export function installedPackages(): InstalledPackage[] {
  const files: PackageFile[] = [rootPackage, sharedPackage, serverPackage, clientPackage].map(
    (raw) => JSON.parse(raw) as PackageFile,
  );
  return files.flatMap((file) =>
    (["dependencies", "devDependencies"] as const).flatMap((field) =>
      Object.entries(file[field] ?? {})
        .filter(([name]) => !name.startsWith("@gradtracker/"))
        .map(([name, version]) => ({
          workspace: file.name,
          name,
          version,
          kind: field === "dependencies" ? ("runtime" as const) : ("development" as const),
        })),
    ),
  );
}
