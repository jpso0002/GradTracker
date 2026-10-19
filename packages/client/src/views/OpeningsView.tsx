import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { OpeningItem } from "@gradtracker/shared";
import { Button, CompanyLogo, EmptyState, Icon, SearchField } from "../ui";
import { ViewTitle } from "../shell/ViewTitle";
import { VisuallyHidden } from "../shell/VisuallyHidden";
import { api } from "../api/client";
import { useAsync } from "../hooks/useAsync";
import { useToast } from "../shell/ToastHost";
import { formatEventDate } from "../format";
import { gmailLink, useMailboxAccount } from "../gmailLink";

/**
 * Openings (D43): jobs the student could apply for, read from job alerts,
 * job boards and careers newsletters. Not applications: nothing here is
 * tracked until the student says "I've applied", and then it moves to
 * Applications at Applied.
 *
 * Soonest closing first, so the one about to close is at the top; those with
 * no closing date after, newest first. Closed ones and ones already tracked
 * are not listed (the server leaves them out).
 */

export interface OpeningsViewProps {
  /** Called after "I've applied", so anything counting applications re-reads. */
  onApplied?: () => void;
}

export function matchesOpening(opening: OpeningItem, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [opening.company, opening.role, opening.location ?? "", opening.source ?? ""].some((field) =>
    field.toLowerCase().includes(q),
  );
}

/** "Closes in 4 days" — the words; the date is shown beneath. */
function closingWording(daysLeft: number): string {
  if (daysLeft === 0) return "Closes today";
  if (daysLeft === 1) return "Closes tomorrow";
  return `Closes in ${daysLeft} days`;
}

export function OpeningsView({ onApplied }: OpeningsViewProps) {
  const list = useAsync(() => api.listOpenings(), []);
  const [query, setQuery] = useState("");
  // Handled here, so gone from the list without a re-read.
  const [handled, setHandled] = useState<ReadonlySet<string>>(() => new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const searchLabel = useRef<HTMLLabelElement>(null);
  const account = useMailboxAccount();
  const { show } = useToast();
  const navigate = useNavigate();

  // The search field takes no label of its own; named directly, as on
  // Applications.
  useEffect(() => {
    searchLabel.current?.querySelector("input")?.setAttribute("aria-label", "Search openings");
  }, []);

  const openings = (list.data?.openings ?? []).filter((o) => !handled.has(o.id));
  const shown = openings.filter((o) => matchesOpening(o, query));

  const handle = async (opening: OpeningItem, action: "applied" | "dismiss") => {
    setBusy(opening.id);
    try {
      if (action === "applied") {
        const { jobId, created } = await api.markOpeningApplied(opening.id);
        show(
          created
            ? `Added ${opening.company} to Applications`
            : `${opening.company} is already in Applications`,
          "success",
        );
        onApplied?.();
        setHandled((current) => new Set(current).add(opening.id));
        // Straight to it, so the student sees where it went.
        void navigate(`/pipeline/${jobId}`);
        return;
      }
      await api.dismissOpening(opening.id);
      setHandled((current) => new Set(current).add(opening.id));
      show(`Dismissed ${opening.company}, ${opening.role}`, "info");
    } catch (error) {
      show(error instanceof Error ? error.message : "Something went wrong", "error");
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <ViewTitle title="Openings" />
      <header className="gt-topbar">
        <span style={{ font: "700 18px var(--font-display)" }}>Openings</span>
        <div className="gt-topbar-actions">
          <label ref={searchLabel} style={{ display: "flex" }}>
            <VisuallyHidden>Search openings</VisuallyHidden>
            <SearchField value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search openings…" shortcut="" />
          </label>
        </div>
      </header>

      <div className="gt-page">
        <section className="gt-page-head" aria-label="About openings">
          <div>
            <h2>Jobs you can apply for</h2>
            <span className="lede">From your job alerts and careers emails. Soonest closing first.</span>
          </div>
        </section>

        <section className="gt-section" aria-labelledby="openings-heading">
          <div className="gt-section-heading">
            <div>
              <h2 id="openings-heading">Open now</h2>
              <p>
                {list.data
                  ? `${openings.length} ${openings.length === 1 ? "opening" : "openings"}`
                  : "Loading"}
              </p>
            </div>
          </div>

          {list.loading && !list.data ? (
            <p aria-busy="true" style={{ padding: "16px 20px", color: "var(--muted)" }}>
              Loading openings…
            </p>
          ) : list.error && !list.data ? (
            <EmptyState
              icon="triangle-alert"
              title="Could not load openings"
              description={list.error.message}
              action={<Button onClick={list.reload}>Try again</Button>}
            />
          ) : openings.length === 0 ? (
            <EmptyState
              icon="mail-search"
              title="No openings right now"
              description="Job alerts and careers emails show up here when Sync inbox reads them."
            />
          ) : shown.length === 0 ? (
            <EmptyState
              icon="search"
              title="No openings match"
              description="Search looks at company, role, location and source."
              action={<Button onClick={() => setQuery("")}>Clear search</Button>}
            />
          ) : (
            <ul className="gt-job-list">
              {shown.map((opening) => (
                <OpeningRow
                  key={opening.id}
                  opening={opening}
                  link={gmailLink(opening.gmailMessageId, account)}
                  busy={busy === opening.id}
                  onApplied={() => void handle(opening, "applied")}
                  onDismiss={() => void handle(opening, "dismiss")}
                />
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

function OpeningRow({
  opening,
  link,
  busy,
  onApplied,
  onDismiss,
}: {
  opening: OpeningItem;
  link: string | null;
  busy: boolean;
  onApplied: () => void;
  onDismiss: () => void;
}) {
  const { daysLeft } = opening;
  const urgency = daysLeft === null ? "" : daysLeft <= 2 ? " urgent" : daysLeft <= 7 ? " soon" : "";
  const name = `${opening.company}, ${opening.role}`;
  return (
    <li className="gt-opening-row">
      <CompanyLogo company={opening.company} />
      <span className="gt-cell">
        <strong>{opening.company}</strong>
        <small>{opening.role}</small>
      </span>
      <span className="gt-cell">
        <strong className="gt-opening-place">
          <Icon name="map-pin" size={13} /> {opening.location ?? "Location not given"}
        </strong>
        <small>{opening.source ? `Via ${opening.source}` : `From ${opening.senderDomain ?? "an email"}`}</small>
      </span>
      <span className={`gt-cell gt-deadline${urgency}`}>
        {opening.closesAt && daysLeft !== null ? (
          <>
            <strong>{closingWording(daysLeft)}</strong>
            <small>{formatEventDate(opening.closesAt)}</small>
          </>
        ) : (
          <small style={{ marginTop: 0 }}>No closing date given</small>
        )}
      </span>
      <span className="gt-opening-actions">
        {link ? (
          <a className="gt-button quiet size-sm" href={link} target="_blank" rel="noreferrer" aria-label={`Open the email about ${name} in Gmail`}>
            Open in Gmail ↗
          </a>
        ) : null}
        <Button size="sm" variant="ink" iconLeft="check" disabled={busy} onClick={onApplied} aria-label={`I've applied: ${name}`}>
          I’ve applied
        </Button>
        <Button size="sm" variant="ghost" disabled={busy} onClick={onDismiss} aria-label={`Dismiss ${name}`}>
          Dismiss
        </Button>
      </span>
    </li>
  );
}
