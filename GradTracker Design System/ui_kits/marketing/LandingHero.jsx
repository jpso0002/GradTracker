const { GradientMesh, Button, Badge } = window.GradTrackerDesignSystem_b026b0;

function LandingHero({ onCta }) {
  return (
    <GradientMesh height={520}>
      <SiteHeader onCta={onCta} />
      <div style={{ maxWidth: "var(--container-max)", margin: "0 auto", padding: "var(--space-huge) var(--space-xl) var(--space-xxl)", display: "flex", flexDirection: "column", gap: "var(--space-xl)" }}>
        <Badge tone="ai" style={{ alignSelf: "flex-start" }}>Reads your inbox, not your CV</Badge>
        <h1 style={{ margin: 0, maxWidth: 760, fontSize: "var(--display-xxl-size)", lineHeight: "var(--display-xxl-lh)", letterSpacing: "var(--display-xxl-ls)", fontWeight: 300, color: "var(--text-heading)" }}>
          Twenty applications, one ranked list of what's due next.
        </h1>
        <p style={{ margin: 0, maxWidth: 540, fontSize: "var(--body-lg-size)", lineHeight: 1.5, color: "var(--text-secondary)" }}>
          GradTracker connects to your Gmail, works out which emails are applications, and pulls out the company, role, stage, and deadline. No spreadsheet. No forgotten assessment.
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)" }}>
          <Button size="lg" iconLeft="mail" onClick={onCta}>Connect Gmail</Button>
          <Button size="lg" variant="secondary" iconRight="arrow-right">See a live pipeline</Button>
        </div>
        <span className="gt-num" style={{ fontSize: "var(--caption-size)", letterSpacing: "var(--caption-ls)", color: "var(--text-muted)" }}>Free for students · read-only access · 41,200 applications tracked this season</span>
        <div style={{ marginTop: "var(--space-xl)" }}><MockupComposite /></div>
      </div>
    </GradientMesh>
  );
}
Object.assign(window, { LandingHero });
