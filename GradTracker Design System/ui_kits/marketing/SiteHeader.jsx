const { Wordmark, Button } = window.GradTrackerDesignSystem_b026b0;

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
