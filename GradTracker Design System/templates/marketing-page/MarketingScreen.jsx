/* Generated from ui_kits/marketing/ — screen source for the MarketingScreen template.
   All declarations live inside __init() so the design-system bundle can finish loading first. */
let __Root = null;
function __init() {
  const { Wordmark, Button, Card, StageBadge, DeadlinePill, Badge, ConfidenceMeter, GradientMesh, Icon, Dialog, Input, Checkbox, Toast } = window.GradTrackerDesignSystem_b026b0;

/* SiteHeader.jsx */
  
  function SiteHeader({ onCta }) {
    const links = ["How it works", "For students", "Universities", "Pricing"];
    return (
      <header style={{ display: "flex", alignItems: "center", gap: "var(--space-xxl)", padding: "var(--space-lg) var(--space-xl)", maxWidth: "var(--container-max)", margin: "0 auto" }}>
        <Wordmark size={20} />
        <nav style={{ display: "flex", gap: "var(--space-xl)", flex: 1 }}>
          {links.map(l => <a key={l} href="#" style={{ fontSize: "var(--body-md-size)", color: "var(--text-nav)", textDecoration: "none" }}>{l}</a>)}
        </nav>
        <a href="#" style={{ fontSize: "var(--body-md-size)", color: "var(--text-nav)", textDecoration: "none" }}>Sign in</a>
        <Button size="sm" onClick={onCta}>Connect Gmail</Button>
      </header>
    );
  }
  Object.assign(window, { SiteHeader });
  

/* MockupComposite.jsx */
  
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
  

/* LandingHero.jsx */
  
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
  

/* FeatureBands.jsx */
  
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
  

/* PricingBand.jsx */
  
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
  

/* SiteFooter.jsx */
  
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
  

/* LandingPage.jsx */
  
  function LandingPage() {
    const [open, setOpen] = React.useState(false);
    const [done, setDone] = React.useState(false);
    return (
      <div style={{ background: "var(--surface-page)", position: "relative", minHeight: "100%" }}>
        <LandingHero onCta={() => setOpen(true)} />
        <FeatureBands />
        <PricingBand onCta={() => setOpen(true)} />
        <SiteFooter />
        <Dialog open={open} title="Connect your university Gmail" description="Read-only access. GradTracker never sends mail on your behalf."
          onClose={() => setOpen(false)} width={420}
          footer={<><Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button><Button size="sm" iconLeft="mail" onClick={() => { setOpen(false); setDone(true); window.setTimeout(() => setDone(false), 3200); }}>Continue with Google</Button></>}>
          <Input label="University email" iconLeft="mail" value="ana.silva@uni.ac.uk" />
          <Checkbox checked label="Send me a morning digest of what's due" />
        </Dialog>
        {done ? <div style={{ position: "fixed", left: 24, bottom: 24, zIndex: 70 }}><Toast tone="success">Gmail connected · building your pipeline</Toast></div> : null}
      </div>
    );
  }
  Object.assign(window, { LandingPage });
  

  __Root = LandingPage;
}
function MarketingScreen() {
  const R = (typeof React !== "undefined" ? React : window.React);
  const [ready, setReady] = R.useState(() => !!window.GradTrackerDesignSystem_b026b0);
  R.useEffect(() => {
    if (ready) return;
    const t = setInterval(() => { if (window.GradTrackerDesignSystem_b026b0) { clearInterval(t); setReady(true); } }, 30);
    return () => clearInterval(t);
  }, [ready]);
  if (!ready) return null;
  if (!__Root) __init();
  return R.createElement(__Root);
}

if (typeof module !== "undefined") module.exports = { MarketingScreen };
if (typeof window !== "undefined") window.MarketingScreen = MarketingScreen;
