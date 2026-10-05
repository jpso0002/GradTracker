import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { StageEnum, type Job, type JobStatus, type Stage } from "@gradtracker/shared";
import {
  ApplicationRow,
  Badge,
  EmptyState,
  SearchField,
  StatCard,
  Tabs,
  TopBar,
  Button,
  Icon,
  STAGES,
} from "../ds";
import { api } from "../api/client";
import { useAsync } from "../hooks/useAsync";
import { VisuallyHidden } from "../shell/VisuallyHidden";
import { DetailPanel } from "./DetailPanel";
import { formatDeadline } from "../format";

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

/** Company or role, any case. A filter, so the survivors keep the server's order. */
export function matchesSearch(job: Job, query: string): boolean {
  const q = query.trim().toLocaleLowerCase();
  return q === "" || job.company.toLocaleLowerCase().includes(q) || job.role.toLocaleLowerCase().includes(q);
}

export function PipelineView() {
  const [status, setStatus] = useState<JobStatus>("active");
  const [stages, setStages] = useState<Stage[]>([]);
  const [query, setQuery] = useState("");
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const searchLabel = useRef<HTMLLabelElement>(null);

  const pipeline = useAsync(() => api.listJobs({ status, stages }), [status, stages.join(",")]);
  const review = useAsync(() => api.listReview(), []);

  const jobs = pipeline.data?.jobs ?? [];
  const stats = pipeline.data?.stats;

  // The search box's hint promises "/". Typing it anywhere outside a field
  // keeps that promise.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
      e.preventDefault();
      searchLabel.current?.querySelector("input")?.focus();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const toggleStage = (stage: Stage) => {
    setStages((current) =>
      current.includes(stage) ? current.filter((s) => s !== stage) : [...current, stage],
    );
  };

  const subtitle = useMemo(() => {
    if (!stats) return undefined;
    return `${stats.emailsRead} emails read · ${stats.liveApplications} live`;
  }, [stats]);

  return (
    <>
      <TopBar title="Applications" {...(subtitle ? { subtitle } : {})}>
        <label ref={searchLabel} style={{ display: "flex" }}>
          <VisuallyHidden>Search applications</VisuallyHidden>
          <SearchField
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Company or role"
            width={240}
          />
        </label>
        <Button variant="ghost" iconLeft="refresh-cw" onClick={pipeline.reload}>
          Refresh
        </Button>
      </TopBar>

      <div style={{ display: "flex", minHeight: 0, flex: 1 }}>
        <div style={{ flex: 1, minWidth: 0, padding: "var(--space-xl)" }}>
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

          <StageFilter selected={stages} onToggle={toggleStage} />

          <PipelineBody
            loading={pipeline.loading}
            error={pipeline.error}
            offline={pipeline.offline}
            jobs={jobs}
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
            onClose={() => navigate("/pipeline")}
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
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: "var(--space-md)",
      }}
    >
      <StatCard label="Live applications" value={value(stats?.liveApplications)} icon="layers" />
      <StatCard label="Due this week" value={value(stats?.dueThisWeek)} icon="calendar-clock" />
      {/* Not clickable: StatCard takes no onClick, and a card with a pointer
          cursor that does nothing is worse than a plain one. The sidebar
          carries the link to the review queue. */}
      <StatCard label="Needs review" value={value(needsReview)} icon="sparkles" />
      <StatCard label="Emails read" value={value(stats?.emailsRead)} icon="mail-search" />
    </div>
  );
}

function StageFilter({
  selected,
  onToggle,
}: {
  selected: Stage[];
  onToggle: (stage: Stage) => void;
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
  loading: boolean;
  error: Error | null;
  offline: boolean;
  /** The server's list, in the server's order. */
  jobs: Job[];
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
  const { loading, error, offline, jobs, query, status, filtered } = props;

  if (loading && jobs.length === 0) {
    return <Skeleton />;
  }

  if (offline) {
    return (
      <EmptyState
        icon="wifi-off"
        title="You are offline"
        description="GradTracker cannot reach the server. Your pipeline is unchanged."
        action={<Button onClick={props.onRetry}>Try again</Button>}
      />
    );
  }

  if (error) {
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

  if (jobs.length === 0) {
    return status === "archived" ? (
      <EmptyState
        icon="archive"
        title="Nothing archived yet"
        description="Rejected and withdrawn applications move here."
        compact
      />
    ) : (
      <EmptyState
        icon="layers"
        title="No applications yet"
        description="GradTracker has not found any application emails in your inbox."
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
    <div role="list">
      {shown.map((job) => (
        <PipelineRow
          key={job.id}
          job={job}
          selected={job.id === props.selectedId}
          onSelect={() => props.onSelect(job.id)}
        />
      ))}
    </div>
  );
}

/**
 * One row, plus — while an email may belong to this application (T3.10) — a
 * marker linking to that question in the review queue (T6.6).
 *
 * The wrapper owns the hairline and the hover and selected tints, so the
 * marker's line reads as part of its row rather than as a row of its own.
 */
function PipelineRow({ job, selected, onSelect }: { job: Job; selected: boolean; onSelect: () => void }) {
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
      <ApplicationRow
        company={job.company}
        role={job.role}
        stage={job.stage}
        selected={selected}
        onClick={onSelect}
        style={{ borderBottom: "none", background: "transparent" }}
        {...(job.nextAction ? { nextAction: job.nextAction } : {})}
        {...(job.deadlineAt ? { deadline: formatDeadline(job.deadlineAt) } : {})}
        {...(job.daysLeft !== null ? { daysLeft: job.daysLeft } : {})}
        // The row adds "Detected from" itself; passing it too doubled it.
        {...(job.senderDomain ? { source: job.senderDomain } : {})}
      />
      {job.pendingReviewId ? <ReviewMarker job={job} questionId={job.pendingReviewId} /> : null}
    </div>
  );
}

/**
 * "Review required" — in words, not a coloured dot, and named in full for
 * assistive technology. It exists exactly while a pending review item suggests
 * this application; the server clears `pendingReviewId` once it is answered.
 */
function ReviewMarker({ job, questionId }: { job: Job; questionId: string }) {
  return (
    <div style={{ padding: "0 var(--cell-pad-x) var(--cell-pad-y)" }}>
      <Link
        to={`/review#review-${questionId}`}
        aria-label={`Review required: an email may belong to ${job.company} — ${job.role}`}
        style={{ display: "inline-flex", borderRadius: "var(--radius-pill)", textDecoration: "none" }}
      >
        <Badge tone="ai" uppercase={false}>
          <Icon name="sparkles" size={12} />
          Review required
        </Badge>
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
