const { Card, Switch, Button, Badge, Input, Select, Checkbox, Icon, Toast } = window.GradTrackerDesignSystem_b026b0;

function SettingsView() {
  const [auto, setAuto] = React.useState(true);
  const [digest, setDigest] = React.useState(true);
  const [urgent, setUrgent] = React.useState(true);
  const [cal, setCal] = React.useState(false);
  const [freq, setFreq] = React.useState("Every 15 minutes");
  return (
    <div style={{ padding: "var(--space-xl) var(--section-pad-app) var(--space-huge)", display: "flex", flexDirection: "column", gap: "var(--space-xl)", maxWidth: 720 }}>
      <Card padding="compact" style={{ display: "flex", alignItems: "center", gap: "var(--space-lg)" }}>
        <span style={{ width: 40, height: 40, borderRadius: "var(--radius-pill)", background: "var(--accent-primary-wash)", color: "var(--accent-primary)", display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 auto" }}><Icon name="mail" size={20} /></span>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
          <span style={{ fontSize: "var(--heading-sm-size)", color: "var(--text-heading)" }}>ana.silva@uni.ac.uk</span>
          <span className="gt-num" style={{ fontSize: "var(--caption-size)", letterSpacing: "var(--caption-ls)", color: "var(--text-muted)" }}>Read-only Gmail access · last scan 4 minutes ago · 612 emails read</span>
        </div>
        <Badge tone="jade">Connected</Badge>
        <Button variant="quiet" size="sm">Disconnect</Button>
      </Card>

      <Card padding="compact" style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
        <span style={{ fontSize: "var(--micro-cap-size)", letterSpacing: ".08em", textTransform: "uppercase", color: "var(--text-muted)" }}>Detection</span>
        <Switch checked={auto} onChange={setAuto} label="Auto-detect applications" description="GradTracker reads new mail and files it into your pipeline." />
        <div style={{ height: 1, background: "var(--border-hairline)" }} />
        <Select label="Scan frequency" value={freq} onChange={setFreq} options={["Every 15 minutes","Hourly","Twice a day","Manually only"]} style={{ maxWidth: 260 }} />
        <Checkbox checked label="Ask before adding low-confidence matches" description="Anything under 55% confidence waits in Needs review." />
      </Card>

      <Card padding="compact" style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
        <span style={{ fontSize: "var(--micro-cap-size)", letterSpacing: ".08em", textTransform: "uppercase", color: "var(--text-muted)" }}>Reminders</span>
        <Switch checked={digest} onChange={setDigest} label="Morning digest" description="One email at 08:00 with what's due today." />
        <div style={{ height: 1, background: "var(--border-hairline)" }} />
        <Switch checked={urgent} onChange={setUrgent} label="Deadline alerts" description="A nudge 48 hours before anything closes." />
        <div style={{ height: 1, background: "var(--border-hairline)" }} />
        <Switch checked={cal} onChange={setCal} label="Add interviews to Google Calendar" description="Creates a calendar event when an interview is confirmed." />
      </Card>

      <Card padding="compact" style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
        <span style={{ fontSize: "var(--micro-cap-size)", letterSpacing: ".08em", textTransform: "uppercase", color: "var(--text-muted)" }}>Profile</span>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-lg)" }}>
          <Input label="Name" value="Ana Silva" />
          <Input label="University" value="University of Manchester" />
          <Input label="Graduating" numeric value="June 2027" />
          <Select label="Looking for" value="Internships & graduate roles" options={["Internships & graduate roles","Internships only","Graduate roles only"]} />
        </div>
      </Card>

      <Toast tone="info">Changes save as you make them.</Toast>
    </div>
  );
}
Object.assign(window, { SettingsView });
