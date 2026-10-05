import { useMemo } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { Tabs, TopBar } from "../ds";
import { ViewTitle } from "../shell/ViewTitle";
import { DOC_PAGES, installedPackages, pageMarkdown, renderMarkdown } from "../documentation/pages";

/**
 * The Documentation Center (T5.9): five pages — Architecture, Components, Data
 * flow, API, Dependencies — each a section of a file in `docs/`, rendered.
 * Nothing on these pages is written twice; the footer of each names its file.
 */
export function DocsView() {
  const { page: slug } = useParams<{ page: string }>();
  const navigate = useNavigate();
  const page = DOC_PAGES.find((p) => p.slug === slug);

  const html = useMemo(() => (page ? renderMarkdown(pageMarkdown(page)) : ""), [page]);

  if (!page) return <Navigate to={`/docs/${DOC_PAGES[0]!.slug}`} replace />;

  return (
    <>
      <ViewTitle title={`${page.title} — Documentation`} />
      <TopBar title="Documentation" subtitle={page.title} />
      <div style={{ padding: "var(--space-xl)", display: "flex", flexDirection: "column", gap: "var(--space-xl)", minWidth: 0 }}>
        <Tabs
          tabs={DOC_PAGES.map((p) => ({ id: p.slug, label: p.title }))}
          activeId={page.slug}
          onSelect={(id) => navigate(`/docs/${id}`)}
          style={{ flexWrap: "wrap", rowGap: 0 }}
        />

        {/* The project's own markdown, compiled in at build time. */}
        <article className="gt-docs" dangerouslySetInnerHTML={{ __html: html }} />

        {page.slug === "dependencies" ? <InstalledPackages /> : null}

        <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "var(--caption-size)" }}>
          From docs/{page.file} — {page.headings.map((h) => h.replace(/^#+\s*/, "§")).join(", ")}. Edit the file, not
          this page.
        </p>
      </div>
    </>
  );
}

/** The packages as the package files declare them — generated, so they cannot
 *  drift from what `npm install` installs. */
function InstalledPackages() {
  const packages = installedPackages();
  return (
    <section className="gt-docs" aria-labelledby="installed-packages">
      <h2 id="installed-packages">Installed packages</h2>
      <p>Read from each workspace's package.json when the app is built.</p>
      <table>
        <thead>
          <tr>
            <th>Package</th>
            <th>Version</th>
            <th>Workspace</th>
            <th>Used</th>
          </tr>
        </thead>
        <tbody>
          {packages.map((p) => (
            <tr key={`${p.workspace}:${p.name}`}>
              <td>
                <code>{p.name}</code>
              </td>
              <td className="gt-num">{p.version}</td>
              <td>{p.workspace}</td>
              <td>{p.kind === "runtime" ? "At run time" : "In development"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
