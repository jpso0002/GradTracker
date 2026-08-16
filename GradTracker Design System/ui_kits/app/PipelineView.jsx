const { StatCard, ApplicationRow, Card, Tabs, Tag, EmptyState, Button } = window.GradTrackerDesignSystem_b026b0;

function PipelineView({ apps, onOpen, selectedId }) {
  const [tab, setTab] = React.useState("all");
  const [filter, setFilter] = React.useState(null);
  const active = ["applied","assessment","interview"];
  let rows = apps;
  if (tab === "active") rows = apps.filter(a => active.includes(a.stage));
  if (tab === "waiting") rows = apps.filter(a => a.stage === "applied" || a.stage === "assessment");
  if (tab === "closed") rows = apps.filter(a => ["rejected","withdrawn","offer"].includes(a.stage));
  if (filter) rows = rows.filter(a => a.stage === filter);

  return (
    <div style={{ padding: "var(--space-xl) var(--section-pad-app) var(--space-huge)", display: "flex", flexDirection: "column", gap: "var(--space-xl)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "var(--space-md)" }}>
        <StatCard label="Live applications" value="23" delta="+3 this week" deltaTone="up" icon="layers" />
        <StatCard label="Needs action" value="6" delta="2 due in 48h" deltaTone="down" icon="alarm-clock" />
        <StatCard label="Interviews" value="4" delta="+1 this week" deltaTone="up" icon="calendar-check" />
        <StatCard label="Response rate" value="38%" delta="-4 pts" deltaTone="down" icon="trending-down" />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
        <Tabs activeId={tab} onSelect={setTab} tabs={[
          { id: "all", label: "All", count: apps.length },
          { id: "active", label: "Active", count: apps.filter(a => active.includes(a.stage)).length },
          { id: "waiting", label: "Waiting on them", count: apps.filter(a => ["applied","assessment"].includes(a.stage)).length },
          { id: "closed", label: "Closed", count: apps.filter(a => ["rejected","withdrawn","offer"].includes(a.stage)).length },
        ]} />
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", flexWrap: "wrap" }}>
          <span style={{ fontSize: "var(--micro-cap-size)", letterSpacing: ".08em", textTransform: "uppercase", color: "var(--text-muted)", marginRight: 4 }}>Stage</span>
          {[["interview","Interview"],["assessment","Assessment"],["offer","Offer"],["rejected","Rejected"]].map(([k,l]) => (
            <Tag key={k} selected={filter === k} onClick={() => setFilter(filter === k ? null : k)}>{l}</Tag>
          ))}
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: "var(--caption-size)", letterSpacing: "var(--caption-ls)", color: "var(--text-muted)" }}>Ranked by what's due next</span>
        </div>

        <Card padding="none" style={{ overflow: "hidden" }}>
          <div style={{
            display: "grid", gridTemplateColumns: "minmax(200px,1.4fr) 170px minmax(160px,1fr) 150px 28px",
            gap: "var(--space-lg)", padding: "8px var(--cell-pad-x)", background: "var(--surface-sunken)",
            borderBottom: "1px solid var(--border-hairline)", fontSize: "var(--micro-cap-size)",
            letterSpacing: ".08em", textTransform: "uppercase", color: "var(--text-muted)",
          }}>
            <span>Company & role</span><span>Stage</span><span>Next action</span><span>Deadline</span><span />
          </div>
          {rows.length ? rows.map(a => (
            <ApplicationRow key={a.id} {...a} selected={a.id === selectedId} onClick={() => onOpen(a)} />
          )) : (
            <EmptyState compact icon="filter-x" title="Nothing in this view" description="Clear the stage filter to see the rest of your pipeline." action={<Button variant="secondary" size="sm" onClick={() => setFilter(null)}>Clear filter</Button>} />
          )}
        </Card>
      </div>
    </div>
  );
}
Object.assign(window, { PipelineView });
