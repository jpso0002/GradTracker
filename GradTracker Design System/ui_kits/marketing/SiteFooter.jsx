const { Wordmark, Icon } = window.GradTrackerDesignSystem_b026b0;

function SiteFooter() {
  const cols = [
    ["Product", ["How it works", "Six stages", "Reminders", "Pricing"]],
    ["Students", ["Getting started", "Privacy & permissions", "Deadline calendar", "Help centre"]],
    ["Universities", ["Careers services", "Cohort reporting", "Book a walkthrough"]],
    ["Company", ["About", "Blog", "Status", "Contact"]],
  ];
  return (
    <footer style={{ borderTop: "1px solid var(--border-hairline)", background: "var(--surface-page)" }}>
      <div style={{ maxWidth: "var(--container-max)", margin: "0 auto", padding: "var(--space-huge) var(--space-xl)", display: "grid", gridTemplateColumns: "1.4fr repeat(4,1fr)", gap: "var(--space-xxl)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
          <Wordmark size={19} />
          <span style={{ fontSize: "var(--caption-size)", letterSpacing: "var(--caption-ls)", color: "var(--text-muted)", maxWidth: 220 }}>Built for application season, in Manchester.</span>
          <div style={{ display: "flex", gap: "var(--space-md)", color: "var(--text-muted)" }}>
            {["github", "linkedin", "instagram"].map(i => <a key={i} href="#" style={{ color: "inherit", display: "flex" }}><Icon name={i} size={16} /></a>)}
          </div>
        </div>
        {cols.map(([head, links]) => (
          <div key={head} style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
            <span style={{ fontSize: "var(--micro-cap-size)", letterSpacing: ".08em", textTransform: "uppercase", color: "var(--text-muted)" }}>{head}</span>
            {links.map(l => <a key={l} href="#" style={{ fontSize: "var(--caption-size)", letterSpacing: "var(--caption-ls)", color: "var(--text-secondary)", textDecoration: "none" }}>{l}</a>)}
          </div>
        ))}
      </div>
      <div style={{ maxWidth: "var(--container-max)", margin: "0 auto", padding: "0 var(--space-xl) var(--space-xxl)", display: "flex", gap: "var(--space-xl)", fontSize: "var(--micro-size)", color: "var(--text-muted)" }}>
        <span>© 2026 GradTracker Ltd</span><a href="#" style={{ color: "inherit", textDecoration: "none" }}>Privacy</a><a href="#" style={{ color: "inherit", textDecoration: "none" }}>Terms</a><a href="#" style={{ color: "inherit", textDecoration: "none" }}>Cookie choices</a>
      </div>
    </footer>
  );
}
Object.assign(window, { SiteFooter });
