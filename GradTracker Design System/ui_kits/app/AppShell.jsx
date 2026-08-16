const { SidebarNav, TopBar, SearchField, Button, IconButton, Dialog, Toast, Card, Badge, Icon, Wordmark } = window.GradTrackerDesignSystem_b026b0;

function AppShell() {
  const [view, setView] = React.useState("connect");
  const [theme, setTheme] = React.useState("light");
  const [apps, setApps] = React.useState(window.APPLICATIONS);
  const [queue, setQueue] = React.useState(window.REVIEW_QUEUE);
  const [selected, setSelected] = React.useState(null);
  const [toast, setToast] = React.useState(null);
  const [confirmWithdraw, setConfirmWithdraw] = React.useState(false);

  React.useEffect(() => { document.documentElement.setAttribute("data-theme", theme); document.body.setAttribute("data-theme", theme); }, [theme]);
  const flash = (msg, tone) => { setToast({ msg, tone: tone || "success" }); window.clearTimeout(window.__gtT); window.__gtT = window.setTimeout(() => setToast(null), 3200); };

  if (view === "connect") return (
    <div data-theme={theme} style={{ height: "100%", background: "var(--surface-sunken)" }}>
      <ConnectView onConnect={() => { setView("pipeline"); flash("Gmail connected · 23 applications found"); }} />
    </div>
  );

  const titles = { pipeline: ["Pipeline", "Synced 4 minutes ago · " + apps.length + " live"], review: ["Needs review", queue.length + " emails GradTracker isn't sure about"], settings: ["Settings", "Detection, reminders, and profile"], calendar: ["Calendar", "Interviews and deadlines"], archive: ["Archive", "Closed applications"] };
  const [title, subtitle] = titles[view] || titles.pipeline;

  return (
    <div data-theme={theme} style={{ display: "flex", height: "100%", background: "var(--surface-page)", color: "var(--text-body)", position: "relative", overflow: "hidden" }}>
      <SidebarNav
        activeId={view} onSelect={(id) => { setView(id); setSelected(null); }}
        items={[
          { id: "pipeline", label: "Pipeline", icon: "layers", count: apps.length },
          { id: "calendar", label: "Calendar", icon: "calendar-days" },
          { section: "Inbox" },
          { id: "review", label: "Needs review", icon: "sparkles", count: queue.length },
          { id: "archive", label: "Archive", icon: "archive", count: 61 },
          { section: "Account" },
          { id: "settings", label: "Settings", icon: "settings" },
        ]}
        footer={
          <Card padding="cell" surface="card" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 26, height: 26, borderRadius: 99, background: "var(--accent-primary)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, flex: "0 0 auto" }}>AS</span>
            <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "var(--caption-size)", color: "var(--text-heading)", overflow: "hidden", textOverflow: "ellipsis" }}>Ana Silva</span>
              <span style={{ fontSize: "var(--micro-size)", color: "var(--text-muted)" }}>Manchester · 2027</span>
            </span>
            <IconButton icon={theme === "light" ? "moon" : "sun"} label="Toggle theme" size="sm" onClick={() => setTheme(theme === "light" ? "dark" : "light")} />
          </Card>
        }
      />

      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <TopBar title={title} subtitle={subtitle}>
          <SearchField width={220} />
          <IconButton icon="bell" label="Notifications" variant="outlined" shape="square" />
          <Button size="sm" iconLeft="sparkles" onClick={() => flash("Scanned 18 new emails · 2 look like applications", "info")}>Scan inbox</Button>
        </TopBar>
        <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
          <div style={{ flex: 1, minWidth: 0, overflowY: "auto" }}>
            {view === "pipeline" ? <PipelineView apps={apps} selectedId={selected && selected.id} onOpen={setSelected} /> : null}
            {view === "review" ? <ReviewView queue={queue} onConfirm={(id) => { setQueue(q => q.filter(x => x.id !== id)); flash("Added to your pipeline"); }} onDismiss={(id) => { setQueue(q => q.filter(x => x.id !== id)); flash("Dismissed · we won't ask again", "info"); }} /> : null}
            {view === "settings" ? <SettingsView /> : null}
            {view === "calendar" || view === "archive" ? (
              <div style={{ padding: "var(--space-huge) var(--section-pad-app)", color: "var(--text-muted)", fontSize: "var(--body-md-size)", display: "flex", gap: 10, alignItems: "center" }}>
                <Icon name="construction" size={18} /> Not part of the supplied brief — intentionally left blank.
              </div>
            ) : null}
          </div>
          {selected && view === "pipeline" ? (
            <DetailPanel app={selected} onClose={() => setSelected(null)}
              onStageChange={() => flash("Stage updated")}
              onWithdraw={() => setConfirmWithdraw(true)} />
          ) : null}
        </div>
      </div>

      <Dialog open={confirmWithdraw} title="Withdraw this application?" description="It moves to Withdrawn and drops out of your ranked pipeline. Nothing is deleted."
        onClose={() => setConfirmWithdraw(false)}
        footer={<><Button variant="ghost" size="sm" onClick={() => setConfirmWithdraw(false)}>Cancel</Button><Button size="sm" onClick={() => { setApps(a => a.map(x => x.id === selected.id ? { ...x, stage: "withdrawn", nextAction: "—" } : x)); setConfirmWithdraw(false); setSelected(null); flash("Moved to Withdrawn"); }}>Withdraw</Button></>} />

      {toast ? <div style={{ position: "absolute", left: 24, bottom: 24, zIndex: 60 }}><Toast tone={toast.tone} onDismiss={() => setToast(null)}>{toast.msg}</Toast></div> : null}
    </div>
  );
}
Object.assign(window, { AppShell });
