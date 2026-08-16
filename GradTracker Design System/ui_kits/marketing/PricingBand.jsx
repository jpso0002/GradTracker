const { Card, Button, Icon, Badge } = window.GradTrackerDesignSystem_b026b0;

function PricingBand({ onCta }) {
  const tiers = [
    { name: "Student", price: "Free", note: "While you're enrolled", featured: false, cta: "Connect Gmail",
      features: ["Unlimited applications", "Gmail detection every 15 minutes", "Deadline reminders", "Six-stage pipeline"] },
    { name: "Student Plus", price: "£4", note: "per month, cancel any time", featured: true, cta: "Start free trial",
      features: ["Everything in Student", "Calendar sync for interviews", "Offer comparison view", "CV version per application", "Priority inbox scanning"] },
    { name: "Careers service", price: "Talk to us", note: "For university teams", featured: false, cta: "Book a walkthrough",
      features: ["Cohort dashboards", "Anonymised outcome reporting", "SSO", "Bulk student onboarding"] },
  ];
  return (
    <section style={{ background: "var(--surface-sunken)", borderTop: "1px solid var(--border-hairline)" }}>
      <div style={{ maxWidth: "var(--container-max)", margin: "0 auto", padding: "var(--section-pad-marketing) var(--space-xl)", display: "flex", flexDirection: "column", gap: "var(--space-xxl)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)", maxWidth: 560 }}>
          <span style={{ fontSize: "var(--micro-cap-size)", letterSpacing: ".08em", textTransform: "uppercase", color: "var(--text-muted)" }}>Pricing</span>
          <h2 style={{ margin: 0, fontSize: "var(--display-xl-size)", lineHeight: "var(--display-xl-lh)", letterSpacing: "var(--display-xl-ls)", fontWeight: 300, color: "var(--text-heading)" }}>Free while you're a student.</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "var(--space-xl)", alignItems: "stretch" }}>
          {tiers.map(t => (
            <Card key={t.name} surface={t.featured ? "inverse" : "card"} padding="regular" elevation={t.featured ? 2 : 0}
              style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "var(--heading-lg-size)", lineHeight: "var(--heading-lg-lh)", letterSpacing: "var(--heading-lg-ls)", fontWeight: 300, color: t.featured ? "#fff" : "var(--text-heading)" }}>{t.name}</span>
                {t.featured ? <Badge tone="indigo">Most picked</Badge> : null}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span className="gt-num" style={{ fontSize: "var(--display-md-size)", lineHeight: "var(--display-md-lh)", letterSpacing: "var(--display-md-ls)", fontWeight: 300, color: t.featured ? "#fff" : "var(--text-heading)" }}>{t.price}</span>
                <span style={{ fontSize: "var(--caption-size)", letterSpacing: "var(--caption-ls)", color: t.featured ? "rgba(255,255,255,.66)" : "var(--text-muted)" }}>{t.note}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)", flex: 1 }}>
                {t.features.map(fe => (
                  <span key={fe} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: "var(--body-tabular-size)", letterSpacing: "var(--body-tabular-ls)", color: t.featured ? "rgba(255,255,255,.8)" : "var(--text-secondary)" }}>
                    <span style={{ color: t.featured ? "var(--indigo-300)" : "var(--accent-primary)", display: "flex", marginTop: 2 }}><Icon name="check" size={14} /></span>{fe}
                  </span>
                ))}
              </div>
              <Button fullWidth variant={t.featured ? "primary" : "secondary"} onClick={onCta}>{t.cta}</Button>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
Object.assign(window, { PricingBand });
