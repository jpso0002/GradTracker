const { Card, Button, Wordmark, Icon, Checkbox, Badge } = window.GradTrackerDesignSystem_b026b0;

function ConnectView({ onConnect }) {
  const [ok, setOk] = React.useState(true);
  return (
    <div style={{ minHeight: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: "var(--space-huge) var(--space-xl)", background: "var(--surface-sunken)" }}>
      <Card padding="regular" elevation={2} style={{ width: 420, display: "flex", flexDirection: "column", gap: "var(--space-xl)" }}>
        <Wordmark size={22} />
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
          <span style={{ fontSize: "var(--display-md-size)", lineHeight: "var(--display-md-lh)", letterSpacing: "var(--display-md-ls)", fontWeight: 300, color: "var(--text-heading)" }}>Connect Gmail to build your pipeline</span>
          <span style={{ fontSize: "var(--body-md-size)", color: "var(--text-muted)" }}>It takes about a minute. GradTracker only reads mail — it never sends anything on your behalf.</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
          {[["mail-search","Finds application emails across every job board"],["wand-sparkles","Extracts company, role, stage, and deadline"],["lock","Read-only access you can revoke any time"]].map(([icon, text]) => (
            <span key={text} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: "var(--body-tabular-size)", letterSpacing: "var(--body-tabular-ls)", color: "var(--text-secondary)" }}>
              <span style={{ color: "var(--accent-primary)", display: "flex", marginTop: 1 }}><Icon name={icon} size={15} /></span>{text}
            </span>
          ))}
        </div>
        <Checkbox checked={ok} onChange={setOk} label="I understand GradTracker reads my inbox" description="Only emails it identifies as applications are stored." />
        <Button size="lg" fullWidth iconLeft="mail" disabled={!ok} onClick={onConnect}>Continue with Google</Button>
        <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "var(--micro-size)", color: "var(--text-muted)" }}>
          <Badge tone="neutral">Student</Badge> Free while you're at university.
        </span>
      </Card>
    </div>
  );
}
Object.assign(window, { ConnectView });
