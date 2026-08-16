/* Generated from ui_kits/app/ — screen source for the AppScreen template.
   All declarations live inside __init() so the design-system bundle can finish loading first. */
let __Root = null;
function __init() {
  const { StatCard, ApplicationRow, Card, Tabs, Tag, EmptyState, Button, StageBadge, DeadlinePill, Badge, IconButton, Select, ConfidenceMeter, Tooltip, Switch, Input, Checkbox, Icon, Toast, Wordmark, SidebarNav, TopBar, SearchField, Dialog } = window.GradTrackerDesignSystem_b026b0;

/* data.jsx */
  const APPLICATIONS = [
    { id:"monzo", company:"Monzo", role:"Backend Engineering Intern", stage:"interview", nextAction:"Confirm Thursday 14:00 slot", deadline:"14 Sep", daysLeft:2, salary:"£38,000", location:"London · Hybrid", source:"Greenhouse", confidence:0.96, score:94,
      timeline:[["11 Aug","Applied via Monzo careers"],["27 Aug","Online assessment passed"],["09 Sep","Interview invitation received"]] },
    { id:"arup", company:"Arup", role:"Graduate Structural Engineer", stage:"assessment", nextAction:"Finish numerical test", deadline:"19 Sep", daysLeft:7, salary:"£31,500", location:"Manchester · On-site", source:"Workday", confidence:0.88, score:87,
      timeline:[["02 Sep","Applied via Workday"],["08 Sep","Numerical test link sent"]] },
    { id:"deloitte", company:"Deloitte", role:"Audit Graduate Scheme", stage:"applied", nextAction:"Wait for screening", deadline:null, daysLeft:null, salary:"£33,000", location:"Birmingham · Hybrid", source:"Gmail", confidence:0.74, score:71,
      timeline:[["29 Aug","Application submitted"]] },
    { id:"revolut", company:"Revolut", role:"Product Analyst Intern", stage:"offer", nextAction:"Reply by 22 Sep", deadline:"22 Sep", daysLeft:10, salary:"£42,000", location:"London · On-site", source:"Greenhouse", confidence:0.98, score:99,
      timeline:[["14 Jul","Applied"],["03 Aug","Two interviews completed"],["11 Sep","Offer received"]] },
    { id:"nhs", company:"NHS Digital", role:"Data Science Placement", stage:"assessment", nextAction:"Book assessment centre", deadline:"16 Sep", daysLeft:4, salary:"£29,800", location:"Leeds · Hybrid", source:"Gmail", confidence:0.81, score:78,
      timeline:[["21 Aug","Applied"],["05 Sep","Invited to assessment centre"]] },
    { id:"ocado", company:"Ocado Technology", role:"Software Engineer Grad", stage:"rejected", nextAction:"Ask for feedback", deadline:null, daysLeft:null, salary:"£40,000", location:"Hatfield · Hybrid", source:"Lever", confidence:0.91, score:32,
      timeline:[["04 Aug","Applied"],["30 Aug","Rejected after tech screen"]] },
    { id:"pwc", company:"PwC", role:"Technology Consulting Grad", stage:"withdrawn", nextAction:"—", deadline:null, daysLeft:null, salary:"£35,000", location:"London · Hybrid", source:"Gmail", confidence:0.69, score:12,
      timeline:[["19 Jul","Applied"],["25 Aug","Withdrawn — accepted other process"]] },
    { id:"bloomberg", company:"Bloomberg", role:"Engineering Summer Intern", stage:"applied", nextAction:"Wait for screening", deadline:"30 Sep", daysLeft:18, salary:"£45,000", location:"London · On-site", source:"Gmail", confidence:0.86, score:64,
      timeline:[["09 Sep","Applied via referral"]] },
  ];
  
  const REVIEW_QUEUE = [
    { id:"r1", subject:"Your application to Stripe — next steps", from:"no-reply@greenhouse.io", received:"12 minutes ago", confidence:0.93,
      fields:[["Company","Stripe",0.97],["Role","Payments Engineering Intern",0.9],["Stage","Assessment pending",0.86],["Deadline","21 Sep, 23:59",0.79]] },
    { id:"r2", subject:"Interview confirmation — Wednesday", from:"talent@wise.com", received:"1 hour ago", confidence:0.71,
      fields:[["Company","Wise",0.95],["Role","Graduate Data Analyst",0.68],["Stage","Interview scheduled",0.88],["Deadline","18 Sep, 10:30",0.52]] },
    { id:"r3", subject:"Thanks for applying to Octopus Energy", from:"careers@octopus.energy", received:"3 hours ago", confidence:0.64,
      fields:[["Company","Octopus Energy",0.94],["Role","Grad Software Engineer",0.6],["Stage","Applied",0.83],["Deadline","—",0.2]] },
  ];
  
  Object.assign(window, { APPLICATIONS, REVIEW_QUEUE });
  

/* PipelineView.jsx */
  
  function PipelineView({ apps, onOpen, selectedId }) {
    const [tab, setTab] = React.useState("all");
    const [filter, setFilter] = React.useState(null);
    const active = ["applied","assessment","interview"];
    let rows = apps;
    if (tab === "active") rows = apps.filter(a => active.includes(a.stage));
    if (tab === "waiting") rows = apps.filter(a => a.stage === "applied" || a.stage === "assessment");
    if (tab === "closed") rows = apps.filter(a => ["rejected","withdrawn","offer"].includes(a.stage));
    if (filter) rows = rows.filter(a => a.stage === filter);
  
    return (
      <div style={{ padding: "var(--space-xl) var(--section-pad-app) var(--space-huge)", display: "flex", flexDirection: "column", gap: "var(--space-xl)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "var(--space-md)" }}>
          <StatCard label="Live applications" value="23" delta="+3 this week" deltaTone="up" icon="layers" />
          <StatCard label="Needs action" value="6" delta="2 due in 48h" deltaTone="down" icon="alarm-clock" />
          <StatCard label="Interviews" value="4" delta="+1 this week" deltaTone="up" icon="calendar-check" />
          <StatCard label="Response rate" value="38%" delta="-4 pts" deltaTone="down" icon="trending-down" />
        </div>
  
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
          <Tabs activeId={tab} onSelect={setTab} tabs={[
            { id: "all", label: "All", count: apps.length },
            { id: "active", label: "Active", count: apps.filter(a => active.includes(a.stage)).length },
            { id: "waiting", label: "Waiting on them", count: apps.filter(a => ["applied","assessment"].includes(a.stage)).length },
            { id: "closed", label: "Closed", count: apps.filter(a => ["rejected","withdrawn","offer"].includes(a.stage)).length },
          ]} />
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", flexWrap: "wrap" }}>
            <span style={{ fontSize: "var(--micro-cap-size)", letterSpacing: ".08em", textTransform: "uppercase", color: "var(--text-muted)", marginRight: 4 }}>Stage</span>
            {[["interview","Interview"],["assessment","Assessment"],["offer","Offer"],["rejected","Rejected"]].map(([k,l]) => (
              <Tag key={k} selected={filter === k} onClick={() => setFilter(filter === k ? null : k)}>{l}</Tag>
            ))}
            <span style={{ flex: 1 }} />
            <span style={{ fontSize: "var(--caption-size)", letterSpacing: "var(--caption-ls)", color: "var(--text-muted)" }}>Ranked by what's due next</span>
          </div>
  
          <Card padding="none" style={{ overflow: "hidden" }}>
            <div style={{
              display: "grid", gridTemplateColumns: "minmax(200px,1.4fr) 170px minmax(160px,1fr) 150px 28px",
              gap: "var(--space-lg)", padding: "8px var(--cell-pad-x)", background: "var(--surface-sunken)",
              borderBottom: "1px solid var(--border-hairline)", fontSize: "var(--micro-cap-size)",
              letterSpacing: ".08em", textTransform: "uppercase", color: "var(--text-muted)",
            }}>
              <span>Company & role</span><span>Stage</span><span>Next action</span><span>Deadline</span><span />
            </div>
            {rows.length ? rows.map(a => (
              <ApplicationRow key={a.id} {...a} selected={a.id === selectedId} onClick={() => onOpen(a)} />
            )) : (
              <EmptyState compact icon="filter-x" title="Nothing in this view" description="Clear the stage filter to see the rest of your pipeline." action={<Button variant="secondary" size="sm" onClick={() => setFilter(null)}>Clear filter</Button>} />
            )}
          </Card>
        </div>
      </div>
    );
  }
  Object.assign(window, { PipelineView });
  

/* DetailPanel.jsx */
  
  function DetailPanel({ app, onClose, onStageChange, onWithdraw }) {
    if (!app) return null;
    const labels = { applied:"Applied", assessment:"Assessment pending", interview:"Interview scheduled", offer:"Offer received", rejected:"Rejected", withdrawn:"Withdrawn" };
    return (
      <aside style={{
        width: 380, flex: "0 0 auto", boxSizing: "border-box", height: "100%", overflowY: "auto",
        borderLeft: "1px solid var(--border-hairline)", background: "var(--surface-card)",
        padding: "var(--space-xl)", display: "flex", flexDirection: "column", gap: "var(--space-xl)",
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-md)" }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: "var(--heading-lg-size)", lineHeight: "var(--heading-lg-lh)", letterSpacing: "var(--heading-lg-ls)", color: "var(--text-heading)" }}>{app.company}</span>
            <span style={{ fontSize: "var(--body-md-size)", color: "var(--text-muted)" }}>{app.role}</span>
            <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
              <StageBadge stage={app.stage} />
              <Tooltip label={"Detected from a " + app.source + " email"}><Badge tone="ai">AI detected</Badge></Tooltip>
            </div>
          </div>
          <IconButton icon="x" label="Close panel" onClick={onClose} />
        </div>
  
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
          <Select label="Stage" value={labels[app.stage]} onChange={onStageChange} options={Object.values(labels)} />
          <div style={{ display: "flex", gap: "var(--space-sm)" }}>
            <Button size="sm" iconLeft="check" style={{ flex: 1 }}>Mark action done</Button>
            <Button size="sm" variant="quiet" iconLeft="bell" style={{ flex: 1 }}>Remind me</Button>
          </div>
        </div>
  
        <Card surface="sunken" padding="cell" border={false} style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
          <span style={{ fontSize: "var(--micro-cap-size)", letterSpacing: ".08em", textTransform: "uppercase", color: "var(--text-muted)" }}>Extracted fields</span>
          {[["Next action", app.nextAction, app.confidence],["Deadline", app.deadline ? app.deadline + " · 23:59" : "None found", app.confidence - 0.1],["Salary", app.salary, app.confidence - 0.05],["Location", app.location, app.confidence - 0.2]].map(([k,v,c]) => (
            <div key={k} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <span style={{ fontSize: "var(--caption-size)", letterSpacing: "var(--caption-ls)", color: "var(--text-muted)", width: 92, flex: "0 0 auto" }}>{k}</span>
              <span className="gt-num" style={{ flex: 1, fontSize: "var(--body-tabular-size)", color: "var(--text-body)" }}>{v}</span>
              <ConfidenceMeter value={Math.max(0.2, c)} showValue={false} width={40} />
            </div>
          ))}
        </Card>
  
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
          <span style={{ fontSize: "var(--micro-cap-size)", letterSpacing: ".08em", textTransform: "uppercase", color: "var(--text-muted)" }}>Timeline</span>
          {app.timeline.map(([date, text], i) => (
            <div key={i} style={{ display: "flex", gap: "var(--space-md)" }}>
              <span className="gt-num" style={{ width: 52, flex: "0 0 auto", fontSize: "var(--caption-size)", color: "var(--text-muted)" }}>{date}</span>
              <span style={{ position: "relative", width: 1, background: "var(--border-hairline)", flex: "0 0 auto" }}>
                <span style={{ position: "absolute", top: 5, left: -2.5, width: 6, height: 6, borderRadius: 99, background: i === app.timeline.length - 1 ? "var(--accent-primary)" : "var(--border-strong)" }} />
              </span>
              <span style={{ fontSize: "var(--body-tabular-size)", letterSpacing: "var(--body-tabular-ls)", color: "var(--text-secondary)", paddingLeft: 8 }}>{text}</span>
            </div>
          ))}
        </div>
  
        {app.deadline ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <DeadlinePill daysLeft={app.daysLeft}>{app.daysLeft <= 2 ? "Due in " + app.daysLeft + " days" : app.deadline}</DeadlinePill>
          </div>
        ) : null}
  
        <Button variant="ghost" size="sm" iconLeft="circle-slash" onClick={onWithdraw} style={{ alignSelf: "flex-start" }}>Withdraw application</Button>
      </aside>
    );
  }
  Object.assign(window, { DetailPanel });
  

/* ReviewView.jsx */
  
  function ReviewView({ queue, onConfirm, onDismiss }) {
    if (!queue.length) return (
      <div style={{ padding: "var(--space-xl) var(--section-pad-app)" }}>
        <Card padding="none"><EmptyState icon="mail-check" title="Inbox is clear" description="Everything GradTracker detected has been confirmed. We'll scan again in 15 minutes." action={<Button variant="secondary" size="sm" iconLeft="refresh-cw">Scan now</Button>} /></Card>
      </div>
    );
    return (
      <div style={{ padding: "var(--space-xl) var(--section-pad-app) var(--space-huge)", display: "flex", flexDirection: "column", gap: "var(--space-lg)", maxWidth: 880 }}>
        <p style={{ margin: 0, fontSize: "var(--body-md-size)", color: "var(--text-muted)", maxWidth: 560 }}>
          These emails look like applications. Confirm what GradTracker read, or dismiss the ones that aren't.
        </p>
        {queue.map(item => (
          <Card key={item.id} padding="compact" elevation={1} style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-md)" }}>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: "var(--heading-sm-size)", color: "var(--text-heading)" }}>{item.subject}</span>
                <span className="gt-num" style={{ fontSize: "var(--caption-size)", letterSpacing: "var(--caption-ls)", color: "var(--text-muted)" }}>{item.from} · {item.received}</span>
              </div>
              <Tooltip label="How sure the model is about this email"><span style={{ display: "flex", alignItems: "center", gap: 8 }}><Badge tone="ai">AI</Badge><ConfidenceMeter value={item.confidence} /></span></Tooltip>
              <IconButton icon="external-link" label="Open in Gmail" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "var(--space-md) var(--space-xl)" }}>
              {item.fields.map(([k, v, c]) => (
                <div key={k} style={{ display: "flex", alignItems: "center", gap: "var(--space-md)", paddingBottom: 8, borderBottom: "1px solid var(--border-hairline)" }}>
                  <span style={{ width: 74, flex: "0 0 auto", fontSize: "var(--caption-size)", letterSpacing: "var(--caption-ls)", color: "var(--text-muted)" }}>{k}</span>
                  <span className="gt-num" style={{ flex: 1, fontSize: "var(--body-tabular-size)", color: "var(--text-body)" }}>{v}</span>
                  {c < 0.55 ? <Badge tone="amber" uppercase={false}>Needs review</Badge> : <ConfidenceMeter value={c} showValue={false} width={36} />}
                </div>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
              <Button size="sm" iconLeft="check" onClick={() => onConfirm(item.id)}>Add to pipeline</Button>
              <Button size="sm" variant="quiet" iconLeft="pencil">Edit fields</Button>
              <Button size="sm" variant="ghost" onClick={() => onDismiss(item.id)}>Not an application</Button>
              <span style={{ flex: 1 }} />
              <StageBadge stage={item.fields[2][1].toLowerCase().indexOf("interview") === 0 ? "interview" : item.fields[2][1].toLowerCase().indexOf("assessment") === 0 ? "assessment" : "applied"} size="sm" />
            </div>
          </Card>
        ))}
      </div>
    );
  }
  Object.assign(window, { ReviewView });
  

/* SettingsView.jsx */
  
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
  

/* ConnectView.jsx */
  
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
  

/* AppShell.jsx */
  
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
  

  __Root = AppShell;
}
function AppScreen() {
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

if (typeof module !== "undefined") module.exports = { AppScreen };
if (typeof window !== "undefined") window.AppScreen = AppScreen;
