import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { StageEnum, type Job, type JobStatus, type Stage } from "@gradtracker/shared";
import { ApplicationRow, EmptyState, StatCard, Tabs, TopBar, Button, Icon, STAGES } from "../ds";
import { api } from "../api/client";
import { useAsync } from "../hooks/useAsync";
import { DetailPanel } from "./DetailPanel";
import { formatDeadline } from "../format";

/**
 * The pipeline — the one screen the product is judged on (SM-4).
 *
 * The list arrives already ranked by the server. **Nothing here re-sorts it.**
 * Stage chips filter and the tabs switch corpus; neither touches order, and
 * there is no sort control, because a student who can sort by company name has
 * rebuilt the spreadsheet this replaces.
 */

/** The six stages, from the shared enum — never a second hand-written list. */
const STAGE_VALUES: readonly Stage[] = StageEnum.options;

export function PipelineView() {
  const [status, setStatus] = useState<JobStatus>("active");
  const [stages, setStages] = useState<Stage[]>([]);
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();

  const pipeline = useAsync(() => api.listJobs({ status, stages }), [status, stages.join(",")]);
  const review = useAsync(() => api.listReview(), []);

  const jobs = pipeline.data?.jobs ?? [];
  const stats = pipeline.data?.stats;

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
            status={status}
            filtered={stages.length > 0}
            selectedId={jobId}
            onSelect={(id) => navigate(`/pipeline/${id}`)}
            onClearFilters={() => setStages([])}
            onRetry={pipeline.reload}
          />
        </div>

        {jobId ? (
          <DetailPanel
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
  jobs: Job[];
  status: JobStatus;
  filtered: boolean;
  selectedId: string | undefined;
  onSelect: (id: string) => void;
  onClearFilters: () => void;
  onRetry: () => void;
}

function PipelineBody(props: BodyProps) {
  const { loading, error, offline, jobs, status, filtered } = props;

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

  return (
    <div role="list">
      {jobs.map((job) => (
        <ApplicationRow
          key={job.id}
          company={job.company}
          role={job.role}
          stage={job.stage}
          selected={job.id === props.selectedId}
          onClick={() => props.onSelect(job.id)}
          {...(job.nextAction ? { nextAction: job.nextAction } : {})}
          {...(job.deadlineAt ? { deadline: formatDeadline(job.deadlineAt) } : {})}
          {...(job.daysLeft !== null ? { daysLeft: job.daysLeft } : {})}
          {...(job.senderDomain ? { source: `Detected from ${job.senderDomain}` } : {})}
        />
      ))}
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
