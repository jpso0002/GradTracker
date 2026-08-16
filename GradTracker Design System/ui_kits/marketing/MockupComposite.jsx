const { Card, StageBadge, DeadlinePill, Badge, ConfidenceMeter } = window.GradTrackerDesignSystem_b026b0;

/* The composited product mockup: pipeline table centre, extraction card right — the brand's
   "look at the actual product" argument, rendered at reduced scale. */
function MockupComposite() {
  const rows = [
    ["Revolut", "Product Analyst Intern", "offer", "Reply by 22 Sep", 10],
    ["Monzo", "Backend Engineering Intern", "interview", "14 Sep", 2],
    ["NHS Digital", "Data Science Placement", "assessment", "16 Sep", 4],
    ["Bloomberg", "Engineering Summer Intern", "applied", "30 Sep", 18],
  ];
  return (
    <Card padding="none" radius="xl" elevation={2} style={{ overflow: "hidden", display: "grid", gridTemplateColumns: "1.6fr 1fr" }}>
      <div style={{ borderRight: "1px solid var(--border-hairline)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid var(--border-hairline)", background: "var(--surface-sunken)" }}>
          <span style={{ fontSize: "var(--caption-size)", color: "var(--text-heading)" }}>Pipeline</span>
          <span className="gt-num" style={{ fontSize: "var(--micro-size)", color: "var(--text-muted)" }}>23 live · synced 4 min ago</span>
        </div>
        {rows.map(([c, r, s, d, dl]) => (
          <div key={c} style={{ display: "grid", gridTemplateColumns: "1.3fr 150px 110px", alignItems: "center", gap: 12, padding: "11px 16px", borderBottom: "1px solid var(--border-hairline)" }}>
            <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
              <span style={{ fontSize: "var(--body-tabular-size)", color: "var(--text-heading)" }}>{c}</span>
              <span style={{ fontSize: "var(--micro-size)", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r}</span>
            </span>
            <StageBadge stage={s} size="sm" />
            <DeadlinePill daysLeft={dl} style={{ fontSize: "var(--micro-size)" }}>{d}</DeadlinePill>
          </div>
        ))}
      </div>
      <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 12, background: "var(--surface-card)" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}><Badge tone="ai">AI detected</Badge><ConfidenceMeter value={0.96} /></span>
        <span style={{ fontSize: "var(--caption-size)", color: "var(--text-muted)", lineHeight: 1.5 }}>
          "Hi Ana — we'd love to book your first interview for the Backend Engineering Intern role…"
        </span>
        {[["Company", "Monzo"], ["Role", "Backend Eng. Intern"], ["Stage", "Interview scheduled"], ["Deadline", "14 Sep · 09:00"]].map(([k, v]) => (
          <span key={k} style={{ display: "flex", justifyContent: "space-between", gap: 8, paddingBottom: 6, borderBottom: "1px solid var(--border-hairline)" }}>
            <span style={{ fontSize: "var(--micro-size)", color: "var(--text-muted)" }}>{k}</span>
            <span className="gt-num" style={{ fontSize: "var(--micro-size)", color: "var(--text-body)" }}>{v}</span>
          </span>
        ))}
      </div>
    </Card>
  );
}
Object.assign(window, { MockupComposite });
