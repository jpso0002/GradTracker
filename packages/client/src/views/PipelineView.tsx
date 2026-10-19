import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import type { Job, JobStatus, ListJobsResponse, Stage } from "@gradtracker/shared";
import { Button, CompanyLogo, EmptyState, Icon, SearchField, StageBadge, STAGES, Tabs } from "../ui";
import { api, ApiError } from "../api/client";
import { useToast } from "../shell/ToastHost";
import { syncSummary } from "../syncSummary";
import { useAsync } from "../hooks/useAsync";
import { useBreakpoint } from "../hooks/useBreakpoint";
import { useShortcuts } from "../preferences";
import { VisuallyHidden } from "../shell/VisuallyHidden";
import { ViewTitle } from "../shell/ViewTitle";
import { DetailPanel, type PanelLayout } from "./DetailPanel";
import { deadlineWording, formatDeadline } from "../format";

/**
 * The pipeline — the one screen the product is judged on (SM-4), in Will's
 * design (D41).
 *
 * The list arrives already ranked by the server. **Nothing here re-sorts it.**
 * Stage chips filter and the tabs switch corpus; neither touches order, and
 * there is no sort control, because a student who can sort by company name has
 * rebuilt the spreadsheet this replaces. Search narrows the same way (T5.11,
 * D30): it removes rows and never moves one.
 */

/** The stages each tab can hold: live applications, then closed ones. */
const TAB_STAGES: Record<JobStatus, Stage[]> = {
  active: ["applied", "assessment", "interview", "offer"],
  archived: ["rejected", "withdrawn"],
};

type PipelineStats = ListJobsResponse["stats"];

/** Company or role, any case. A filter, so the survivors keep the server's order. */
export function matchesSearch(job: Job, query: string): boolean {
  const q = query.trim().toLocaleLowerCase();
  return q === "" || job.company.toLocaleLowerCase().includes(q) || job.role.toLocaleLowerCase().includes(q);
}

const rowId = (jobId: string) => `row-${jobId}`;

/**
 * What a row says to assistive technology: everything the row shows, in words.
 * The stage and the deadline's urgency are colour on screen; here they are
 * text, so nothing rests on colour (design.md §10.1, T6.5).
 */
function rowLabel(job: Job): string {
  const parts = [`${job.company}, ${job.role}`, STAGES[job.stage].label];
  parts.push(
    job.deadlineAt
      ? `deadline ${formatDeadline(job.deadlineAt).replace(" · ", " at ")}` +
          (job.daysLeft !== null ? `, ${deadlineWording(job.daysLeft).toLowerCase()}` : "")
      : "no deadline",
  );
  if (job.nextAction) parts.push(`next action: ${job.nextAction}`);
  return parts.join(". ");
}

/** "Good morning" by the clock where the student is. */
function greeting(now: Date): string {
  const hour = now.getHours();
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

const TODAY = new Intl.DateTimeFormat("en-AU", { weekday: "long", day: "numeric", month: "long" });
const SYNCED_TIME = new Intl.DateTimeFormat("en-AU", { hour: "numeric", minute: "2-digit" });
const SYNCED_DATE = new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short" });

/** "Today, 9:41 am" — or a date, when it was not today. */
function syncedWording(iso: string | null | undefined, now: Date): string {
  if (!iso) return "Not yet";
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "Not yet";
  const sameDay = at.toDateString() === now.toDateString();
  return sameDay ? `Today, ${SYNCED_TIME.format(at)}` : `${SYNCED_DATE.format(at)}, ${SYNCED_TIME.format(at)}`;
}

export function PipelineView({ onReviewChanged }: { onReviewChanged?: () => void } = {}) {
  const [status, setStatus] = useState<JobStatus>("active");
  const [stages, setStages] = useState<Stage[]>([]);
  const [query, setQuery] = useState("");
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const searchLabel = useRef<HTMLLabelElement>(null);
  const breakpoint = useBreakpoint();
  const phone = breakpoint === "mobile";
  const [shortcuts] = useShortcuts();

  const pipeline = useAsync(() => api.listJobs({ status, stages }), [status, stages.join(",")]);
  const review = useAsync(() => api.listReview(), []);
  const syncState = useAsync(() => api.syncStatus(), []);
  const session = useAsync(() => api.session(), []);
  const { show } = useToast();
  const [syncing, setSyncing] = useState(false);

  const jobs = pipeline.data?.jobs ?? [];
  const stats = pipeline.data?.stats;
  const panelLayout: PanelLayout = breakpoint === "desktop" ? "inline" : phone ? "sheet" : "overlay";

  // The search field takes no label of its own, and the wrapping label would
  // read its "/" hint aloud. Named directly, with the shortcut declared to
  // assistive technology.
  useEffect(() => {
    const input = searchLabel.current?.querySelector("input");
    input?.setAttribute("aria-label", "Search applications");
    if (shortcuts) input?.setAttribute("aria-keyshortcuts", "/");
    else input?.removeAttribute("aria-keyshortcuts");
  }, [shortcuts]);

  // Closing the panel returns focus to the row that opened it. Carried in the
  // navigation, so it holds even if the list re-renders on the way back.
  const focusRow = (location.state as { focusRow?: string } | null)?.focusRow;
  const focusedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!focusRow || focusedFor.current === location.key) return;
    const row = document.getElementById(rowId(focusRow));
    if (row) {
      row.focus();
      focusedFor.current = location.key;
    }
  }, [focusRow, location.key, jobs]);

  // The search box's hint promises "/". Typing it anywhere outside a field
  // keeps that promise — unless the student has turned it off (WCAG 2.1.4).
  useEffect(() => {
    if (!shortcuts) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
      e.preventDefault();
      searchLabel.current?.querySelector("input")?.focus();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [shortcuts]);

  // Sync inbox reads new mail (D36). Outside the presentation demo the server
  // has no inbox to read and says so with a 501: it then reloads, as before.
  const { reload: reloadPipeline } = pipeline;
  const { reload: reloadReview } = review;
  const { reload: reloadSync } = syncState;
  const refresh = useCallback(
    async (backup = false) => {
      setSyncing(true);
      try {
        const result = await (backup ? api.syncBackup() : api.sync());
        show(syncSummary(result), result.emailsRead === 0 ? "info" : "success");
      } catch (error) {
        if (!(error instanceof ApiError && error.status === 501)) {
          show(error instanceof Error ? error.message : "Could not refresh", "error");
        }
      } finally {
        setSyncing(false);
        reloadPipeline();
        reloadReview();
        reloadSync();
        onReviewChanged?.();
      }
    },
    [show, reloadPipeline, reloadReview, reloadSync, onReviewChanged],
  );

  // The presenter's fallback when Gmail or the venue's network fails: the same
  // pre-written emails, through the same pipeline (D36). Ctrl+Alt+R — a chord
  // no browser claims, never a bare key (WCAG 2.1.4).
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey && e.altKey && !e.shiftKey && e.code === "KeyR")) return;
      e.preventDefault();
      void refresh(true);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [refresh]);

  const toggleStage = (stage: Stage) => {
    setStages((current) => (current.includes(stage) ? current.filter((s) => s !== stage) : [...current, stage]));
  };

  const switchTab = (next: JobStatus) => {
    setStatus(next);
    // A stage chip from the other tab would silently empty this one.
    setStages([]);
  };

  const now = new Date();
  const firstName = session.data?.user?.name.trim().split(/\s+/)[0];
  const demoTarget = jobs.find((job) => job.company === "Accenture" && job.status === "active");

  return (
    <>
      <ViewTitle title="Pipeline" />
      <header className="gt-topbar">
        <span style={{ font: "700 18px var(--font-display)" }}>Pipeline</span>
        <div className="gt-topbar-actions">
          <label ref={searchLabel} style={{ display: "flex" }}>
            <VisuallyHidden>Search applications</VisuallyHidden>
            <SearchField
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search applications…"
              shortcut={shortcuts ? "/" : ""}
            />
          </label>
          <span className="gt-sync-meta">
            <span>Last synced</span>
            <strong>{syncing ? "Updating now" : syncedWording(syncState.data?.lastSyncAt, now)}</strong>
          </span>
          <Button
            variant="ink"
            iconLeft="refresh-cw"
            onClick={() => void refresh()}
            disabled={syncing}
            className={syncing ? "syncing" : undefined}
          >
            {syncing ? "Syncing…" : "Sync inbox"}
          </Button>
        </div>
      </header>

      <div style={{ display: "flex", minHeight: 0, flex: 1, alignItems: "flex-start" }}>
        <div className="gt-page" style={{ flex: 1, minWidth: 0 }}>
          <section className="gt-page-head" aria-label="Today">
            <div>
              <p className="gt-eyebrow">{TODAY.format(now)}</p>
              <h2>{firstName ? `${greeting(now)}, ${firstName}.` : `${greeting(now)}.`}</h2>
              <span className="lede">Here’s what needs your attention today.</span>
            </div>
            {demoTarget ? (
              <div className="gt-flow-hint">
                <span>DEMO FLOW</span>
                <strong>Click Accenture to inspect &amp; edit</strong>
                <Icon name="arrow-right" size={16} />
              </div>
            ) : null}
          </section>

          <StatStrip stats={stats} needsReview={review.data?.items.length} />

          <section className="gt-section" aria-labelledby="pipeline-heading">
            <div className="gt-section-heading">
              <div>
                <h2 id="pipeline-heading">Your pipeline</h2>
                <p>Ranked by what needs attention first</p>
              </div>
              <Tabs
                tabs={[
                  { id: "active", label: "Active", ...(stats ? { count: stats.liveApplications } : {}) },
                  { id: "archived", label: "Archived" },
                ]}
                activeId={status}
                onSelect={(id) => switchTab(id as JobStatus)}
              />
            </div>

            <StageFilter stages={TAB_STAGES[status]} selected={stages} onToggle={toggleStage} onAll={() => setStages([])} />

            <PipelineBody
              loading={pipeline.loading}
              error={pipeline.error}
              offline={pipeline.offline}
              jobs={jobs}
              stats={stats}
              query={query}
              status={status}
              filtered={stages.length > 0}
              selectedId={jobId}
              onSelect={(id) => navigate(`/pipeline/${id}`)}
              onClearFilters={() => setStages([])}
              onClearSearch={() => setQuery("")}
              onRetry={pipeline.reload}
            />
          </section>
        </div>

        {jobId ? (
          <DetailPanel
            // A different application is a fresh panel: an open editor's
            // changes were for the last one.
            key={jobId}
            jobId={jobId}
            layout={panelLayout}
            onClose={() => navigate("/pipeline", { state: { focusRow: jobId } })}
            onChanged={pipeline.reload}
          />
        ) : null}
      </div>
    </>
  );
}

function StatStrip({ stats, needsReview }: { stats: PipelineStats | undefined; needsReview: number | undefined }) {
  // A dash, not a zero, while the number is unknown. "0 due this week" is a
  // claim; "not loaded yet" is not.
  const value = (n: number | undefined) => (n === undefined ? "—" : n.toLocaleString("en-AU"));
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

  /** Read as one phrase — "23 live applications" (design.md §10.3) — rather
   *  than an upper-case label and a bare number. */
  const stat = (
    label: string,
    n: number | undefined,
    spoken: (n: number) => string,
    icon: string,
    tone: string,
  ) => (
    <div className="gt-stat">
      <VisuallyHidden>{n === undefined ? `${label}: not loaded yet` : spoken(n)}</VisuallyHidden>
      <div aria-hidden="true">
        <span className={`gt-stat-icon ${tone}`}>
          <Icon name={icon} size={18} />
        </span>
        <p className="gt-eyebrow" style={{ fontSize: 11, margin: "1px 0 6px" }}>
          {label}
        </p>
        <span className="value">{value(n)}</span>
      </div>
    </div>
  );

  return (
    <div className="gt-stats">
      {stat("Live applications", stats?.liveApplications, (n) => plural(n, "live application", "live applications"), "briefcase", "lilac")}
      {stat("Due this week", stats?.dueThisWeek, (n) => `${n} due this week`, "calendar", "peach")}
      {stat("Needs review", needsReview, (n) => plural(n, "email needs review", "emails need review"), "inbox", "yellow")}
      {stat("Emails read", stats?.emailsRead, (n) => plural(n, "email read", "emails read"), "mail", "mint")}
    </div>
  );
}

function StageFilter({
  stages,
  selected,
  onToggle,
  onAll,
}: {
  stages: Stage[];
  selected: Stage[];
  onToggle: (stage: Stage) => void;
  onAll: () => void;
}) {
  return (
    <div role="group" aria-label="Filter by stage" className="gt-filters">
      <button type="button" aria-pressed={selected.length === 0} onClick={onAll}>
        All
      </button>
      {stages.map((stage) => (
        <button key={stage} type="button" aria-pressed={selected.includes(stage)} onClick={() => onToggle(stage)}>
          {STAGES[stage].label}
        </button>
      ))}
    </div>
  );
}

interface BodyProps {
  loading: boolean;
  error: Error | null;
  offline: boolean;
  /** The server's list, in the server's order. */
  jobs: Job[];
  stats: PipelineStats | undefined;
  query: string;
  status: JobStatus;
  filtered: boolean;
  selectedId: string | undefined;
  onSelect: (id: string) => void;
  onClearFilters: () => void;
  onClearSearch: () => void;
  onRetry: () => void;
}

function PipelineBody(props: BodyProps) {
  const { loading, error, offline, jobs, stats, query, status, filtered } = props;
  const navigate = useNavigate();

  if (loading && jobs.length === 0) {
    return <Skeleton />;
  }

  // Nothing loaded yet. With something loaded, a failed reload keeps the list
  // on screen — offline, the shell's banner says so (T5.7).
  if (offline && jobs.length === 0) {
    return (
      <EmptyState
        icon="wifi-off"
        title="You are offline"
        description="GradTracker cannot reach the server. Your pipeline is unchanged."
        action={<Button onClick={props.onRetry}>Try again</Button>}
      />
    );
  }

  if (error && !offline && jobs.length === 0) {
    return (
      <EmptyState
        icon="triangle-alert"
        title="Could not load your pipeline"
        description={error.message}
        action={<Button onClick={props.onRetry}>Try again</Button>}
      />
    );
  }

  if (jobs.length === 0 && filtered) {
    return (
      <EmptyState
        icon="filter-x"
        title="No applications match these filters"
        description="Your pipeline is not empty — the filters are just narrow."
        action={<Button onClick={props.onClearFilters}>Clear filters</Button>}
        compact
      />
    );
  }

  if (jobs.length === 0 && status === "archived") {
    return <EmptyState icon="archive" title="Nothing archived" description="Rejected and withdrawn applications move here." compact />;
  }

  if (jobs.length === 0 && (stats?.emailsRead ?? 0) === 0) {
    // Never filled. The hosted product would offer "Scan inbox"; in the demo
    // nothing can scan, and a button that cannot work is worse than none.
    return (
      <EmptyState
        icon="mail-search"
        title="No applications yet"
        description="No mail has been read for this account yet. In the demo, only the demo inbox's own account can connect Gmail."
        compact
      />
    );
  }

  if (jobs.length === 0) {
    // Mail was read and nothing became an application. That most often means
    // the gate is too high (app-flow.md §6) — but a high threshold sends
    // applications to review rather than losing them, so look there first.
    const waiting = stats?.needsReview ?? 0;
    return (
      <EmptyState
        icon="mail-search"
        title="No applications found"
        description={
          `GradTracker read ${stats?.emailsRead ?? 0} emails and didn't find any job applications.` +
          (waiting > 0
            ? ` ${waiting} it wasn't sure about ${waiting === 1 ? "is" : "are"} waiting in Needs review.`
            : " If that's wrong, lower the review threshold in Settings — it applies to new mail.")
        }
        action={
          waiting > 0 ? (
            <Button onClick={() => navigate("/review")}>Open Needs review</Button>
          ) : (
            <Button onClick={() => navigate("/settings")}>Open Settings</Button>
          )
        }
        compact
      />
    );
  }

  // `filter`, never `sort`: the rows that survive keep the server's order.
  const shown = jobs.filter((job) => matchesSearch(job, query));

  if (shown.length === 0) {
    return (
      <EmptyState
        icon="search"
        title={`No applications match “${query.trim()}”`}
        description="Search looks at company and role."
        action={<Button onClick={props.onClearSearch}>Clear search</Button>}
        compact
      />
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ minWidth: 640 }}>
        {error && !offline ? (
          // The server answered, but not with the pipeline. What is on screen is
          // what was loaded before, and the student should know that.
          <p role="status" style={{ margin: "10px 20px", color: "var(--text-secondary)", fontSize: 13 }}>
            Could not refresh — showing what was loaded before. {error.message}
          </p>
        ) : null}
        <div className="gt-table-header" aria-hidden="true">
          <span>Company &amp; role</span>
          <span>Stage</span>
          <span>Next action</span>
          <span>Deadline</span>
          <span />
        </div>
        <ul className="gt-job-list">
          {shown.map((job) => (
            <PipelineRow key={job.id} job={job} selected={job.id === props.selectedId} onSelect={() => props.onSelect(job.id)} />
          ))}
        </ul>
      </div>
    </div>
  );
}

/** "2 days" / "Overdue" / "Today" — Will's short form; the date beneath. */
function shortDeadline(daysLeft: number): string {
  if (daysLeft < 0) return "Overdue";
  if (daysLeft === 0) return "Today";
  if (daysLeft === 1) return "Tomorrow";
  return `${daysLeft} days`;
}

/**
 * One row, plus — while an email may belong to this application (T3.10) — a
 * marker linking to that question in the review queue (T6.6).
 */
function PipelineRow({ job, selected, onSelect }: { job: Job; selected: boolean; onSelect: () => void }) {
  const urgency = job.daysLeft === null ? "" : job.daysLeft <= 2 ? " urgent" : job.daysLeft <= 7 ? " soon" : "";
  return (
    <li>
      {/* A real button (design.md §10.2): Enter or Space opens the panel, and
          the name says everything the row shows. */}
      <button
        type="button"
        id={rowId(job.id)}
        className="gt-job-row"
        aria-label={rowLabel(job)}
        aria-current={selected ? "true" : undefined}
        onClick={onSelect}
      >
        <CompanyLogo company={job.company} />
        <span className="gt-cell">
          <strong>{job.company}</strong>
          <small>{job.role}</small>
        </span>
        <span>
          <StageBadge stage={job.stage} />
        </span>
        <span className="gt-cell action">
          <strong>{job.nextAction ?? "No action needed"}</strong>
          <small>{job.senderDomain ? `From ${job.senderDomain}` : "From your latest email"}</small>
        </span>
        <span className={`gt-cell gt-deadline${urgency}`}>
          {job.deadlineAt && job.daysLeft !== null ? (
            <>
              <strong>{shortDeadline(job.daysLeft)}</strong>
              <small>{formatDeadline(job.deadlineAt)}</small>
            </>
          ) : (
            <small style={{ marginTop: 0 }}>No deadline</small>
          )}
        </span>
        <span className="gt-row-arrow">
          <Icon name="chevron-right" size={17} />
        </span>
      </button>
      {job.pendingReviewId ? (
        <Link
          to={`/review#review-${job.pendingReviewId}`}
          className="gt-row-marker"
          aria-label={`Review required: an email may belong to ${job.company} — ${job.role}`}
        >
          <Icon name="sparkles" size={13} />
          Review required
        </Link>
      ) : null}
    </li>
  );
}

/** Rows, not a spinner. The list has a known shape, so show that shape. */
function Skeleton() {
  return (
    <div aria-busy="true" aria-label="Loading your pipeline">
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          style={{
            height: 72,
            borderBottom: "1px solid var(--line)",
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "0 20px",
            opacity: 0.5,
            color: "var(--muted)",
          }}
        >
          <span className="gt-company-logo tone-purple" style={{ opacity: 0.4 }} />
          <Icon name="loader" size={14} />
        </div>
      ))}
    </div>
  );
}
