const { Card, Badge, Button, ConfidenceMeter, StageBadge, EmptyState, Tooltip, IconButton } = window.GradTrackerDesignSystem_b026b0;

function ReviewView({ queue, onConfirm, onDismiss }) {
  if (!queue.length) return (
    <div style={{ padding: "var(--space-xl) var(--section-pad-app)" }}>
      <Card padding="none"><EmptyState icon="mail-check" title="Inbox is clear" description="Everything GradTracker detected has been confirmed. We'll scan again in 15 minutes." action={<Button variant="secondary" size="sm" iconLeft="refresh-cw">Scan now</Button>} /></Card>
    </div>
  );
  return (
    <div style={{ padding: "var(--space-xl) var(--section-pad-app) var(--space-huge)", display: "flex", flexDirection: "column", gap: "var(--space-lg)", maxWidth: 880 }}>
      <p style={{ margin: 0, fontSize: "var(--body-md-size)", color: "var(--text-muted)", maxWidth: 560 }}>
        These emails look like applications. Confirm what GradTracker read, or dismiss the ones that aren't.
      </p>
      {queue.map(item => (
        <Card key={item.id} padding="compact" elevation={1} style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-md)" }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: "var(--heading-sm-size)", color: "var(--text-heading)" }}>{item.subject}</span>
              <span className="gt-num" style={{ fontSize: "var(--caption-size)", letterSpacing: "var(--caption-ls)", color: "var(--text-muted)" }}>{item.from} · {item.received}</span>
            </div>
            <Tooltip label="How sure the model is about this email"><span style={{ display: "flex", alignItems: "center", gap: 8 }}><Badge tone="ai">AI</Badge><ConfidenceMeter value={item.confidence} /></span></Tooltip>
            <IconButton icon="external-link" label="Open in Gmail" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "var(--space-md) var(--space-xl)" }}>
            {item.fields.map(([k, v, c]) => (
              <div key={k} style={{ display: "flex", alignItems: "center", gap: "var(--space-md)", paddingBottom: 8, borderBottom: "1px solid var(--border-hairline)" }}>
                <span style={{ width: 74, flex: "0 0 auto", fontSize: "var(--caption-size)", letterSpacing: "var(--caption-ls)", color: "var(--text-muted)" }}>{k}</span>
                <span className="gt-num" style={{ flex: 1, fontSize: "var(--body-tabular-size)", color: "var(--text-body)" }}>{v}</span>
                {c < 0.55 ? <Badge tone="amber" uppercase={false}>Needs review</Badge> : <ConfidenceMeter value={c} showValue={false} width={36} />}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
            <Button size="sm" iconLeft="check" onClick={() => onConfirm(item.id)}>Add to pipeline</Button>
            <Button size="sm" variant="quiet" iconLeft="pencil">Edit fields</Button>
            <Button size="sm" variant="ghost" onClick={() => onDismiss(item.id)}>Not an application</Button>
            <span style={{ flex: 1 }} />
            <StageBadge stage={item.fields[2][1].toLowerCase().indexOf("interview") === 0 ? "interview" : item.fields[2][1].toLowerCase().indexOf("assessment") === 0 ? "assessment" : "applied"} size="sm" />
          </div>
        </Card>
      ))}
    </div>
  );
}
Object.assign(window, { ReviewView });
