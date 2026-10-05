import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { StageEnum, type Job, type JobStatus, type ListJobsResponse, type Stage } from "@gradtracker/shared";
import {
  ApplicationRow,
  DeadlinePill,
  EmptyState,
  SearchField,
  StageBadge,
  StatCard,
  Tabs,
  Tag,
  TopBar,
  Button,
  Icon,
  STAGES,
} from "../ds";
import { api } from "../api/client";
import { useAsync } from "../hooks/useAsync";
import { isTouch, useBreakpoint } from "../hooks/useBreakpoint";
import { useElementWidth } from "../hooks/useElementWidth";
import { useShortcuts } from "../preferences";
import { VisuallyHidden } from "../shell/VisuallyHidden";
import { ViewTitle } from "../shell/ViewTitle";
import { DetailPanel, type PanelLayout } from "./DetailPanel";
import { deadlineWording, formatDeadline } from "../format";

/**
 * The pipeline — the one screen the product is judged on (SM-4).
 *
 * The list arrives already ranked by the server. **Nothing here re-sorts it.**
 * Stage chips filter and the tabs switch corpus; neither touches order, and
 * there is no sort control, because a student who can sort by company name has
 * rebuilt the spreadsheet this replaces. Search narrows the same way (T5.11,
 * D30): it removes rows and never moves one.
 */

/** The six stages, from the shared enum — never a second hand-written list. */
const STAGE_VALUES: readonly Stage[] = StageEnum.options;

type PipelineStats = ListJobsResponse["stats"];

/** The design system's row overflows below this — measured: 788px of content. */
const ROW_MIN_WIDTH = 800;

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

export function PipelineView() {
  const [status, setStatus] = useState<JobStatus>("active");
  const [stages, setStages] = useState<Stage[]>([]);
  const [query, setQuery] = useState("");
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const searchLabel = useRef<HTMLLabelElement>(null);
  const breakpoint = useBreakpoint();
  const touch = isTouch(breakpoint);
  const phone = breakpoint === "mobile";
  const [shortcuts] = useShortcuts();
  const [listArea, listWidth] = useElementWidth<HTMLDivElement>();

  const pipeline = useAsync(() => api.listJobs({ status, stages }), [status, stages.join(",")]);
  const review = useAsync(() => api.listReview(), []);

  const jobs = pipeline.data?.jobs ?? [];
  const stats = pipeline.data?.stats;

  // The design system's row needs about 790px. Narrower than that — a phone, a
  // tablet, or a laptop with the panel open — it overflows, so the list becomes
  // stacked cards. Measured on the list itself; the viewport where it cannot be.
  const cards = listWidth !== null ? listWidth < ROW_MIN_WIDTH : phone;
  const panelLayout: PanelLayout = breakpoint === "desktop" ? "inline" : phone ? "sheet" : "overlay";

  // The design system's search field takes no label of its own, and the
  // wrapping label would read its "/" hint aloud. Named directly, with the
  // shortcut declared to assistive technology. Again when it moves on a phone.
  useEffect(() => {
    const input = searchLabel.current?.querySelector("input");
    input?.setAttribute("aria-label", "Search applications");
    if (shortcuts) input?.setAttribute("aria-keyshortcuts", "/");
    else input?.removeAttribute("aria-keyshortcuts");
  }, [phone, shortcuts]);

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

  const toggleStage = (stage: Stage) => {
    setStages((current) =>
      current.includes(stage) ? current.filter((s) => s !== stage) : [...current, stage],
    );
  };

  const subtitle = useMemo(() => {
    if (!stats) return undefined;
    return `${stats.emailsRead} emails read · ${stats.liveApplications} live`;
  }, [stats]);

  const search = (
    <label ref={searchLabel} style={{ display: "flex", ...(phone ? { marginBottom: "var(--space-lg)" } : {}) }}>
      <VisuallyHidden>Search applications</VisuallyHidden>
      <SearchField
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Company or role"
        shortcut={shortcuts ? "/" : ""}
        width={phone ? "100%" : 240}
        {...(touch ? { style: { minHeight: "var(--touch-min)" } } : {})}
      />
    </label>
  );

  return (
    <>
      <ViewTitle title="Applications" />
      <TopBar title="Applications" {...(subtitle ? { subtitle } : {})}>
        {/* On a phone the top bar has room for the title and one button; the
            search gets a row of its own below. */}
        {phone ? null : search}
        <Button
          variant="ghost"
          iconLeft="refresh-cw"
          onClick={pipeline.reload}
          {...(touch ? { style: { minHeight: "var(--touch-min)" } } : {})}
        >
          Refresh
        </Button>
      </TopBar>

      <div style={{ display: "flex", minHeight: 0, flex: 1 }}>
        <div
          ref={listArea}
          style={{ flex: 1, minWidth: 0, padding: phone ? "var(--space-lg)" : "var(--space-xl)" }}
        >
          {phone ? search : null}
          <StatRow stats={stats} needsReview={review.data?.items.length} />

          <div style={{ marginTop: "var(--space-xl)" }}>
            <Tabs
              tabs={[
                { id: "active", label: "Active" },
                { id: "archived", label: "Archived" },
              ]}
              activeId={status}
              onSelect={(id) => setStatus(id as JobStatus)}
            />
          </div>

          <StageFilter selected={stages} onToggle={toggleStage} touch={touch} />

          <PipelineBody
            cards={cards}
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

function StatRow({
  stats,
  needsReview,
}: {
  stats: { liveApplications: number; dueThisWeek: number; emailsRead: number } | undefined;
  needsReview: number | undefined;
}) {
  // A dash, not a zero, while the number is unknown. "0 due this week" is a
  // claim; "not loaded yet" is not.
  const value = (n: number | undefined) => (n === undefined ? "—" : n);
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

  /** Read as one phrase — "23 live applications" (design.md §10.3) — rather
   *  than an upper-case label and a bare number. */
  const stat = (label: string, n: number | undefined, spoken: (n: number) => string, icon: string) => (
    <div style={{ minWidth: 0 }}>
      <VisuallyHidden>{n === undefined ? `${label}: not loaded yet` : spoken(n)}</VisuallyHidden>
      <div aria-hidden="true">
        <StatCard label={label} value={value(n)} icon={icon} />
      </div>
    </div>
  );

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
        gap: "var(--space-md)",
      }}
    >
      {stat("Live applications", stats?.liveApplications, (n) => plural(n, "live application", "live applications"), "layers")}
      {stat("Due this week", stats?.dueThisWeek, (n) => `${n} due this week`, "calendar-clock")}
      {/* Not clickable: StatCard takes no onClick, and a card with a pointer
          cursor that does nothing is worse than a plain one. The sidebar
          carries the link to the review queue. */}
      {stat("Needs review", needsReview, (n) => plural(n, "email needs review", "emails need review"), "sparkles")}
      {stat("Emails read", stats?.emailsRead, (n) => plural(n, "email read", "emails read"), "mail-search")}
    </div>
  );
}

function StageFilter({
  selected,
  onToggle,
  touch,
}: {
  selected: Stage[];
  onToggle: (stage: Stage) => void;
  /** Below 1024px each chip is a 44px touch target (design.md §11). */
  touch: boolean;
}) {
  return (
    <div
      role="group"
      aria-label="Filter by stage"
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "var(--space-xs)",
        margin: "var(--space-md) 0",
      }}
    >
      {STAGE_VALUES.map((stage: Stage) => {
        const on = selected.includes(stage);
        return (
          <button
            key={stage}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(stage)}
            style={{
              all: "unset",
              cursor: "pointer",
              padding: "4px 12px",
              borderRadius: "var(--radius-pill)",
              fontFamily: "var(--font-core)",
              fontSize: "var(--caption-size)",
              transition: "var(--transition-control)",
              background: on ? `var(--stage-${stage}-bg)` : "transparent",
              color: on ? `var(--stage-${stage}-fg)` : "var(--text-muted)",
              boxShadow: on ? "none" : "inset 0 0 0 1px var(--border-hairline)",
              ...(touch
                ? { minHeight: "var(--touch-min)", boxSizing: "border-box", display: "inline-flex", alignItems: "center" }
                : {}),
            }}
          >
            {STAGES[stage].label}
          </button>
        );
      })}
    </div>
  );
}

interface BodyProps {
  /** Stacked cards rather than the design system's table row (T5.8). */
  cards: boolean;
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
    return (
      <EmptyState
        icon="archive"
        title="Nothing archived"
        description="Rejected and withdrawn applications move here."
        compact
      />
    );
  }

  if (jobs.length === 0 && (stats?.emailsRead ?? 0) === 0) {
    // Never filled. The hosted product would offer "Scan inbox"; in the demo
    // nothing can scan, and a button that cannot work is worse than none.
    return (
      <EmptyState
        icon="mail-search"
        title="No applications yet"
        description="No mail has been read yet. In this demo, applications arrive through the local import."
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
    <>
      {error && !offline ? (
        // The server answered, but not with the pipeline. What is on screen is
        // what was loaded before, and the student should know that.
        <p role="status" style={{ margin: "0 0 var(--space-sm)", color: "var(--text-secondary)", fontSize: "var(--caption-size)" }}>
          Could not refresh — showing what was loaded before. {error.message}
        </p>
      ) : null}
      <div role="list">
        {shown.map((job) => (
          <PipelineRow
            key={job.id}
            job={job}
            card={props.cards}
            selected={job.id === props.selectedId}
            onSelect={() => props.onSelect(job.id)}
          />
        ))}
      </div>
    </>
  );
}

/**
 * One row, plus — while an email may belong to this application (T3.10) — a
 * marker linking to that question in the review queue (T6.6).
 *
 * The wrapper owns the hairline and the hover and selected tints, so the
 * marker's line reads as part of its row rather than as a row of its own.
 */
function PipelineRow({
  job,
  card,
  selected,
  onSelect,
}: {
  job: Job;
  card: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <div
      role="listitem"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        borderBottom: "1px solid var(--border-hairline)",
        background: selected ? "var(--surface-selected)" : hover ? "var(--surface-hover)" : "transparent",
        transition: "background-color var(--dur-fast) var(--ease-standard)",
      }}
    >
      {/* A real button (design.md §10.2): the design system's row is a `div`
          with a click handler, which no keyboard can reach. Enter or Space
          opens the panel; the name says everything the row shows. */}
      <div
        id={rowId(job.id)}
        role="button"
        tabIndex={0}
        aria-label={rowLabel(job)}
        aria-current={selected ? "true" : undefined}
        onClick={onSelect}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect();
          }
        }}
        style={card ? { minHeight: "var(--touch-min)", cursor: "pointer" } : undefined}
      >
        {card ? (
          <PipelineCard job={job} />
        ) : (
          <ApplicationRow
            company={job.company}
            role={job.role}
            stage={job.stage}
            selected={selected}
            style={{ borderBottom: "none", background: "transparent" }}
            {...(job.nextAction ? { nextAction: job.nextAction } : {})}
            {...(job.deadlineAt ? { deadline: formatDeadline(job.deadlineAt) } : {})}
            {...(job.daysLeft !== null ? { daysLeft: job.daysLeft } : {})}
            // The row adds "Detected from" itself; passing it too doubled it.
            {...(job.senderDomain ? { source: job.senderDomain } : {})}
          />
        )}
      </div>
      {job.pendingReviewId ? <ReviewMarker job={job} questionId={job.pendingReviewId} /> : null}
    </div>
  );
}

/**
 * The narrow form of a row (design.md §11): company and role on line one, stage
 * and deadline on line two, next action on line three. Built from the design
 * system's badge and pill, so stage and urgency look as they do in the table.
 * The role is secondary text, not muted — muted text falls short of 4.5:1 on a
 * hovered or selected row (T6.5).
 */
function PipelineCard({ job }: { job: Job }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-xs)",
        padding: "var(--cell-pad-y) var(--cell-pad-x)",
      }}
    >
      <div data-line="identity" style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "0 var(--space-sm)" }}>
        <span style={{ fontSize: "var(--body-md-size)", color: "var(--text-heading)" }}>{job.company}</span>
        <span style={{ fontSize: "var(--caption-size)", color: "var(--text-secondary)" }}>{job.role}</span>
      </div>
      <div data-line="status" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "var(--space-sm)" }}>
        <StageBadge stage={job.stage} />
        {job.deadlineAt ? (
          <DeadlinePill {...(job.daysLeft !== null ? { daysLeft: job.daysLeft } : {})}>
            {formatDeadline(job.deadlineAt)}
          </DeadlinePill>
        ) : (
          <span style={{ fontSize: "var(--caption-size)", color: "var(--text-secondary)" }}>No deadline</span>
        )}
      </div>
      {job.nextAction ? (
        <div data-line="action" style={{ fontSize: "var(--body-tabular-size)", color: "var(--text-secondary)" }}>
          {job.nextAction}
        </div>
      ) : null}
    </div>
  );
}

/**
 * "Review required" — in words, not a coloured dot, and named in full for
 * assistive technology. It exists exactly while a pending review item suggests
 * this application; the server clears `pendingReviewId` once it is answered.
 *
 * A `Tag`, not the `Badge` "ai" tone it was built with: that tone is 1.07:1 in
 * the dark theme — unreadable (contrast.test.ts, T6.5).
 */
function ReviewMarker({ job, questionId }: { job: Job; questionId: string }) {
  return (
    <div style={{ padding: "0 var(--cell-pad-x) var(--cell-pad-y)" }}>
      <Link
        to={`/review#review-${questionId}`}
        className="gt-touch"
        aria-label={`Review required: an email may belong to ${job.company} — ${job.role}`}
        style={{ display: "inline-flex", borderRadius: "var(--radius-pill)", textDecoration: "none" }}
      >
        <Tag icon="sparkles">Review required</Tag>
      </Link>
    </div>
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
            height: 56,
            borderBottom: "1px solid var(--border-hairline)",
            display: "flex",
            alignItems: "center",
            gap: "var(--space-sm)",
            opacity: 0.45,
            color: "var(--text-muted)",
          }}
        >
          <Icon name="loader" size={14} />
        </div>
      ))}
    </div>
  );
}
