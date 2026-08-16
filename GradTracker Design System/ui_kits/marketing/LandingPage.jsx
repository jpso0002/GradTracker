const { Dialog, Button, Input, Checkbox, Toast } = window.GradTrackerDesignSystem_b026b0;

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
