const { Card, Icon, Badge, StageBadge, Button } = window.GradTrackerDesignSystem_b026b0;

function FeatureBands() {
  return (
    <>
      <section style={{ background: "var(--surface-sunken)", borderTop: "1px solid var(--border-hairline)", borderBottom: "1px solid var(--border-hairline)" }}>
        <div style={{ maxWidth: "var(--container-max)", margin: "0 auto", padding: "var(--section-pad-marketing) var(--space-xl)", display: "flex", flexDirection: "column", gap: "var(--space-xxl)" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)", maxWidth: 620 }}>
            <span style={{ fontSize: "var(--micro-cap-size)", letterSpacing: ".08em", textTransform: "uppercase", color: "var(--text-muted)" }}>How it works</span>
            <h2 style={{ margin: 0, fontSize: "var(--display-xl-size)", lineHeight: "var(--display-xl-lh)", letterSpacing: "var(--display-xl-ls)", fontWeight: 300, color: "var(--text-heading)" }}>Three things happen the minute you connect.</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "var(--space-xl)" }}>
            {[["mail-search", "It finds the applications", "Greenhouse, Workday, Lever, or a recruiter typing by hand — the model reads them all and ignores the newsletters."],
              ["wand-sparkles", "It extracts the details", "Company, role, stage, deadline, and the single next action, each with a confidence score you can check."],
              ["list-ordered", "It ranks what matters", "Your pipeline sorts by what closes soonest, so the top row is always the thing to do today."]].map(([icon, title, body]) => (
              <Card key={title} padding="regular" style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
                <span style={{ width: 36, height: 36, borderRadius: "var(--radius-pill)", background: "var(--accent-primary-wash)", color: "var(--accent-primary)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name={icon} size={18} /></span>
                <span style={{ fontSize: "var(--display-md-size)", lineHeight: "var(--display-md-lh)", letterSpacing: "var(--display-md-ls)", fontWeight: 300, color: "var(--text-heading)" }}>{title}</span>
                <span style={{ fontSize: "var(--body-md-size)", lineHeight: 1.5, color: "var(--text-muted)" }}>{body}</span>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section style={{ maxWidth: "var(--container-max)", margin: "0 auto", padding: "var(--section-pad-marketing) var(--space-xl)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-huge)", alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
          <span style={{ fontSize: "var(--micro-cap-size)", letterSpacing: ".08em", textTransform: "uppercase", color: "var(--text-muted)" }}>Six stages</span>
          <h2 style={{ margin: 0, fontSize: "var(--display-lg-size)", lineHeight: "var(--display-lg-lh)", letterSpacing: "var(--display-lg-ls)", fontWeight: 300, color: "var(--text-heading)" }}>You always know where each one stands.</h2>
          <p style={{ margin: 0, fontSize: "var(--body-lg-size)", lineHeight: 1.5, color: "var(--text-muted)" }}>Stage changes are read from the email itself. When GradTracker isn't sure, it asks instead of guessing.</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {["applied","assessment","interview","offer","rejected","withdrawn"].map(s => <StageBadge key={s} stage={s} />)}
          </div>
        </div>
        <Card surface="cream" padding="regular" style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
          <Badge tone="ai">Needs review</Badge>
          <span style={{ fontSize: "var(--display-md-size)", lineHeight: "var(--display-md-lh)", letterSpacing: "var(--display-md-ls)", fontWeight: 300, color: "var(--ink-900)" }}>"Interview confirmation — Wednesday"</span>
          <span style={{ fontSize: "var(--body-md-size)", lineHeight: 1.5, color: "var(--ink-700)" }}>Confidence on the deadline is 52%, so this one waits for you. One tap adds it; one tap says it isn't an application.</span>
          <div style={{ display: "flex", gap: "var(--space-sm)" }}><Button size="sm">Add to pipeline</Button><Button size="sm" variant="secondary">Not an application</Button></div>
        </Card>
      </section>
    </>
  );
}
Object.assign(window, { FeatureBands });
