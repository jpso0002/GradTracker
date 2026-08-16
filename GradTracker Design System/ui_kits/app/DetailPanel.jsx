const { StageBadge, DeadlinePill, Badge, Button, IconButton, Select, ConfidenceMeter, Card, Tooltip } = window.GradTrackerDesignSystem_b026b0;

function DetailPanel({ app, onClose, onStageChange, onWithdraw }) {
  if (!app) return null;
  const labels = { applied:"Applied", assessment:"Assessment pending", interview:"Interview scheduled", offer:"Offer received", rejected:"Rejected", withdrawn:"Withdrawn" };
  return (
    <aside style={{
      width: 380, flex: "0 0 auto", boxSizing: "border-box", height: "100%", overflowY: "auto",
      borderLeft: "1px solid var(--border-hairline)", background: "var(--surface-card)",
      padding: "var(--space-xl)", display: "flex", flexDirection: "column", gap: "var(--space-xl)",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-md)" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: "var(--heading-lg-size)", lineHeight: "var(--heading-lg-lh)", letterSpacing: "var(--heading-lg-ls)", color: "var(--text-heading)" }}>{app.company}</span>
          <span style={{ fontSize: "var(--body-md-size)", color: "var(--text-muted)" }}>{app.role}</span>
          <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
            <StageBadge stage={app.stage} />
            <Tooltip label={"Detected from a " + app.source + " email"}><Badge tone="ai">AI detected</Badge></Tooltip>
          </div>
        </div>
        <IconButton icon="x" label="Close panel" onClick={onClose} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
        <Select label="Stage" value={labels[app.stage]} onChange={onStageChange} options={Object.values(labels)} />
        <div style={{ display: "flex", gap: "var(--space-sm)" }}>
          <Button size="sm" iconLeft="check" style={{ flex: 1 }}>Mark action done</Button>
          <Button size="sm" variant="quiet" iconLeft="bell" style={{ flex: 1 }}>Remind me</Button>
        </div>
      </div>

      <Card surface="sunken" padding="cell" border={false} style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
        <span style={{ fontSize: "var(--micro-cap-size)", letterSpacing: ".08em", textTransform: "uppercase", color: "var(--text-muted)" }}>Extracted fields</span>
        {[["Next action", app.nextAction, app.confidence],["Deadline", app.deadline ? app.deadline + " · 23:59" : "None found", app.confidence - 0.1],["Salary", app.salary, app.confidence - 0.05],["Location", app.location, app.confidence - 0.2]].map(([k,v,c]) => (
          <div key={k} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <span style={{ fontSize: "var(--caption-size)", letterSpacing: "var(--caption-ls)", color: "var(--text-muted)", width: 92, flex: "0 0 auto" }}>{k}</span>
            <span className="gt-num" style={{ flex: 1, fontSize: "var(--body-tabular-size)", color: "var(--text-body)" }}>{v}</span>
            <ConfidenceMeter value={Math.max(0.2, c)} showValue={false} width={40} />
          </div>
        ))}
      </Card>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
        <span style={{ fontSize: "var(--micro-cap-size)", letterSpacing: ".08em", textTransform: "uppercase", color: "var(--text-muted)" }}>Timeline</span>
        {app.timeline.map(([date, text], i) => (
          <div key={i} style={{ display: "flex", gap: "var(--space-md)" }}>
            <span className="gt-num" style={{ width: 52, flex: "0 0 auto", fontSize: "var(--caption-size)", color: "var(--text-muted)" }}>{date}</span>
            <span style={{ position: "relative", width: 1, background: "var(--border-hairline)", flex: "0 0 auto" }}>
              <span style={{ position: "absolute", top: 5, left: -2.5, width: 6, height: 6, borderRadius: 99, background: i === app.timeline.length - 1 ? "var(--accent-primary)" : "var(--border-strong)" }} />
            </span>
            <span style={{ fontSize: "var(--body-tabular-size)", letterSpacing: "var(--body-tabular-ls)", color: "var(--text-secondary)", paddingLeft: 8 }}>{text}</span>
          </div>
        ))}
      </div>

      {app.deadline ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <DeadlinePill daysLeft={app.daysLeft}>{app.daysLeft <= 2 ? "Due in " + app.daysLeft + " days" : app.deadline}</DeadlinePill>
        </div>
      ) : null}

      <Button variant="ghost" size="sm" iconLeft="circle-slash" onClick={onWithdraw} style={{ alignSelf: "flex-start" }}>Withdraw application</Button>
    </aside>
  );
}
Object.assign(window, { DetailPanel });
