import { useEffect, useState } from "react";

type View = "connect" | "pipeline" | "review" | "settings";
type IconName =
  | "archive"
  | "arrow"
  | "briefcase"
  | "calendar"
  | "check"
  | "chevron"
  | "close"
  | "gear"
  | "inbox"
  | "lock"
  | "mail"
  | "moon"
  | "refresh"
  | "search"
  | "sparkles"
  | "sun"
  | "user";

function Icon({ name, size = 18, className = "" }: { name: IconName; size?: number; className?: string }) {
  const paths: Record<IconName, React.ReactNode> = {
    archive: <><rect x="3" y="5" width="18" height="4" rx="1" /><path d="M5 9v10h14V9M10 13h4" /></>,
    arrow: <><path d="M5 12h14M14 7l5 5-5 5" /></>,
    briefcase: <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M9 7V4h6v3M3 12h18M10 12v2h4v-2" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    chevron: <path d="m9 18 6-6-6-6" />,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    gear: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21h-4v-.09A1.7 1.7 0 0 0 8.94 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15 1.7 1.7 0 0 0 3 14H3v-4h.09A1.7 1.7 0 0 0 4.6 8.94a1.7 1.7 0 0 0-.34-1.88L4.2 7l2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10 3h4v.09A1.7 1.7 0 0 0 15.06 4.6a1.7 1.7 0 0 0 1.88-.34L17 4.2 19.83 7l-.06.06A1.7 1.7 0 0 0 19.4 9c.17.62.8 1.02 1.51 1.02H21v4h-.09c-.7 0-1.34.4-1.51 1Z" /></>,
    inbox: <><path d="M4 5h16l2 9v5H2v-5l2-9Z" /><path d="M2 14h5l2 3h6l2-3h5" /></>,
    lock: <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
    moon: <path d="M20 15.2A8 8 0 0 1 8.8 4 8 8 0 1 0 20 15.2Z" />,
    refresh: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M6.1 9A7 7 0 0 1 18.4 7.4L20 12M4 12l1.6 4.6A7 7 0 0 0 17.9 15" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    sparkles: <><path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2L12 3Z" /><path d="m5 14 .8 2.2L8 17l-2.2.8L5 20l-.8-2.2L2 17l2.2-.8L5 14ZM19 13l.7 1.3L21 15l-1.3.7L19 17l-.7-1.3L17 15l1.3-.7L19 13Z" /></>,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  };
  return <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

const jobs = [
  { id: 1, initials: "DE", company: "Deloite", role: "Strategy Analyst", stage: "Interview", action: "Prepare case study", deadline: "2 days", tone: "purple", edited: false },
  { id: 2, initials: "ST", company: "Stripe", role: "New Grad, Product", stage: "Assessment", action: "Complete take-home", deadline: "4 days", tone: "blue", edited: true },
  { id: 3, initials: "NO", company: "Notion", role: "Associate PM", stage: "Applied", action: "Follow up with recruiter", deadline: "Follow up", tone: "amber", edited: false },
  { id: 4, initials: "AR", company: "Arc'teryx", role: "Digital Strategy Intern", stage: "Offer", action: "Review offer details", deadline: "8 days", tone: "green", edited: true },
  { id: 5, initials: "FI", company: "Figma", role: "Product Designer, Early Career", stage: "Applied", action: "No action needed", deadline: "18 days", tone: "coral", edited: false },
];

function Logo({ compact = false }: { compact?: boolean }) {
  return <div className="logo-wrap">
    <div className="logo-mark"><span /><span /><span /></div>
    {!compact && <span className="wordmark">GradTracker</span>}
  </div>;
}

function Connect({ onConnect }: { onConnect: () => void }) {
  return <main className="connect-page">
    <header className="connect-header"><Logo /><span className="tiny-link">Privacy first, always</span></header>
    <section className="connect-card">
      <div className="eyebrow"><Icon name="sparkles" size={15} /> YOUR APPLICATION COPILOT</div>
      <h1>Twenty applications.<br /><em>One clear next step.</em></h1>
      <p className="connect-lede">GradTracker turns your inbox into a ranked, up-to-date application pipeline — so you always know what needs attention next.</p>
      <button className="google-button" onClick={onConnect}>
        <span className="google-g">G</span>Continue with Google<Icon name="arrow" size={18} />
      </button>
      <p className="terms">By continuing, you agree to our <u>Terms</u> and <u>Privacy Policy</u>.</p>
    </section>
    <section className="permission-card">
      <div className="permission-icon"><Icon name="lock" size={21} /></div>
      <div><h3>Your inbox stays yours</h3><p>GradTracker uses read-only access to find application updates.</p></div>
      <div className="permission-list">
        <span><Icon name="check" size={15} /> Never stores your password</span>
        <span><Icon name="check" size={15} /> Never keeps email content</span>
        <span><Icon name="check" size={15} /> Never sends or modifies email</span>
      </div>
    </section>
    <footer className="connect-footer">Built for the job search, not for your data.</footer>
  </main>;
}

function Sidebar({ view, setView, reviewCount, dark, setDark }: { view: View; setView: (v: View) => void; reviewCount: number; dark: boolean; setDark: (v: boolean) => void }) {
  const nav: { id: View; label: string; icon: IconName; badge?: number }[] = [
    { id: "pipeline", label: "Pipeline", icon: "briefcase" },
    { id: "review", label: "Needs review", icon: "inbox", badge: reviewCount },
  ];
  return <aside className="sidebar">
    <Logo />
    <nav>
      <p className="nav-label">WORKSPACE</p>
      {nav.map(item => <button key={item.id} className={`nav-item ${view === item.id ? "active" : ""}`} onClick={() => setView(item.id)}>
        <Icon name={item.icon} size={18} /><span>{item.label}</span>{item.badge ? <b>{item.badge}</b> : null}
      </button>)}
      <p className="nav-label second">ACCOUNT</p>
      <button className={`nav-item ${view === "settings" ? "active" : ""}`} onClick={() => setView("settings")}><Icon name="gear" size={18} /><span>Settings</span></button>
    </nav>
    <div className="sidebar-bottom">
      <div className="theme-switch"><button className={!dark ? "selected" : ""} onClick={() => setDark(false)}><Icon name="sun" size={15} />Light</button><button className={dark ? "selected" : ""} onClick={() => setDark(true)}><Icon name="moon" size={15} />Dark</button></div>
      <div className="profile"><div className="avatar small">JM</div><div><strong>Jamie Morgan</strong><span>jamie@gmail.com</span></div><button>•••</button></div>
    </div>
  </aside>;
}

function Topbar({ title, syncing, onSync, query, setQuery }: { title: string; syncing: boolean; onSync: () => void; query: string; setQuery: (value: string) => void }) {
  return <header className="topbar">
    <h2>{title}</h2>
    <div className="top-actions">
      <label className="search"><Icon name="search" size={17} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search applications…" /></label>
      <div className="sync-meta"><span>Last synced</span><strong>{syncing ? "Updating now" : "Today, 9:41 AM"}</strong></div>
      <button className={`sync-button ${syncing ? "syncing" : ""}`} onClick={onSync}><Icon name="refresh" size={16} />{syncing ? "Syncing…" : "Sync inbox"}</button>
    </div>
  </header>;
}

function Stage({ children }: { children: React.ReactNode }) {
  return <span className={`stage stage-${String(children).toLowerCase()}`}><i />{children}</span>;
}

function Pipeline({ openDetail, scan, jobNames, query }: { openDetail: (id: number) => void; scan: boolean; jobNames: Record<number, string>; query: string }) {
  const [tab, setTab] = useState("Active");
  const [filter, setFilter] = useState("All");
  const shownJobs = jobs
    .map(job => ({ ...job, company: jobNames[job.id] || job.company }))
    .filter(j => filter === "All" || j.stage === filter)
    .filter(j => `${j.company} ${j.role} ${j.stage}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="page-content">
    {scan && <div className="scan-banner"><div className="scan-orbit"><Icon name="sparkles" size={18} /></div><div><strong>Reading your inbox</strong><span>Applications appear as we find them</span></div><div className="scan-count"><strong>341</strong><span>of 1,204 emails</span></div><div className="scan-line"><i /></div></div>}
    <section className="welcome"><div><p>MONDAY, 20 MAY</p><h1>Good morning, Jamie.</h1><span>Here’s what needs your attention today.</span></div><div className="flow-hint"><span>DEMO FLOW</span><strong>Click Deloitte to inspect & edit</strong><Icon name="arrow" size={16} /></div></section>
    <section className="stats">
      <div><span className="stat-icon lilac"><Icon name="briefcase" /></span><p>LIVE APPLICATIONS</p><strong>23</strong><em>+3 this week</em></div>
      <div><span className="stat-icon peach"><Icon name="calendar" /></span><p>DUE THIS WEEK</p><strong>3</strong><em>2 urgent</em></div>
      <div><span className="stat-icon yellow"><Icon name="inbox" /></span><p>NEEDS REVIEW</p><strong>4</strong><em>Check now</em></div>
      <div><span className="stat-icon mint"><Icon name="mail" /></span><p>EMAILS READ</p><strong>1,204</strong><em>Since 6 May</em></div>
      <div><span className="stat-icon lilac"><Icon name="sparkles" /></span><p>MEDIAN ACCURACY</p><strong>87%</strong><em style={{color: "#6f5ac7"}}>Across 23 emails</em></div>
    </section>
    <section className="pipeline-section">
      <div className="pipeline-heading">
        <div><h2>Your pipeline</h2><p>Ranked by what needs attention first</p></div>
        <div className="tabs">{["Active", "Archived"].map(x => <button className={tab === x ? "active" : ""} onClick={() => setTab(x)} key={x}>{x}<span>{x === "Active" ? 23 : 5}</span></button>)}</div>
      </div>
      <div className="filters">{["All", "Applied", "Assessment", "Interview", "Offer"].map((x, i) => <button className={filter === x ? "active" : ""} onClick={() => setFilter(x)} key={x}>{x}<span>{[23, 11, 5, 4, 3][i]}</span></button>)}</div>
      {tab === "Archived" ? <Blank icon="archive" title="Nothing archived" text="Withdrawn and closed applications will appear here." /> :
      <div className="jobs-table">
        <div className="table-header"><span>COMPANY & ROLE</span><span>STAGE</span><span>NEXT ACTION</span><span>DEADLINE</span><span /></div>
        {shownJobs.map((job, index) => <button className="job-row" key={job.id} onClick={() => openDetail(job.id)}>
          <span className={`company-logo logo-${job.tone}`}>{job.initials}</span>
          <span className="company-cell"><strong>{job.company}</strong><small>{job.role}</small></span>
          <span><Stage>{job.stage}</Stage></span>
          <span className="action-cell"><strong>{job.action}</strong><small>{index === 0 ? "Interview · 24 May" : index === 2 ? "Last update 15 days ago" : "From latest email"}</small></span>
          <span className={`deadline ${job.deadline === "2 days" ? "urgent" : job.deadline === "4 days" ? "soon" : ""}`}><strong>{job.deadline}</strong><small>{index < 2 ? "May " + (22 + index * 2) : index === 4 ? "Jun 7" : ""}</small></span>
          <span className="row-arrow"><Icon name="chevron" size={17} /></span>
        </button>)}
        {!shownJobs.length && <div className="table-empty"><Icon name="search" size={20} /><strong>No applications found</strong><span>Try another search or clear your filters.</span></div>}
      </div>}
    </section>
  </div>;
}

function DetailPanel({ close, job, saveCompany, withdraw }: { close: () => void; job: (typeof jobs)[number]; saveCompany: (v: string) => void; withdraw: () => void }) {
  const [editing, setEditing] = useState(job.id === 1 && job.company === "Deloite");
  const [value, setValue] = useState(job.company);
  return <div className="overlay" onMouseDown={e => e.target === e.currentTarget && close()}>
    <aside className="detail-panel">
      <div className="panel-top"><span>APPLICATION DETAILS</span><button onClick={close}><Icon name="close" /></button></div>
      <div className="detail-head">
        <div className={`company-logo logo-${job.tone} large`}>{job.initials}</div>
        <div>{editing ? <div className="edit-field"><input autoFocus value={value} onChange={e => setValue(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && value.trim()) { saveCompany(value); setEditing(false); } if (e.key === "Escape") setEditing(false); }} /><span>Press Enter to save · Escape to cancel</span></div> : <h2 onClick={() => setEditing(true)} title="Click to edit">{job.company}<small className="edited-tag"><Icon name="check" size={11} />{job.edited || job.id === 1 ? "Edited" : "Edit"}</small></h2>}<p>{job.role}</p></div>
      </div>
      <div className="next-card"><p>NEXT ACTION</p><strong>{job.action}</strong><span><Icon name="calendar" size={15} /> {job.deadline === "Follow up" ? "Follow-up is overdue" : `Due in ${job.deadline}`}</span></div>
      <div className="panel-section">
        <h3>Application details</h3>
        <div className="field-row"><span>Stage</span><Stage>{job.stage}</Stage></div>
        <div className="field-row"><span>Deadline</span><strong className={job.deadline === "2 days" ? "red-text" : ""}>{job.deadline}</strong></div>
        <div className="field-row"><span>Location</span><strong>Toronto, Canada</strong></div>
        <div className="field-row"><span>Source</span><strong>Greenhouse</strong></div>
      </div>
      <div className="panel-section timeline">
        <h3>Activity</h3>
        <div className="event"><i /><div><strong>Interview scheduled</strong><p>From recruiting@deloitte.com</p><span>18 May · 10:42 AM</span></div><a>View in Gmail ↗</a></div>
        <div className="event"><i /><div><strong>Application received</strong><p>From no-reply@greenhouse.io</p><span>4 May · 2:17 PM</span></div></div>
      </div>
      <div className="ai-note"><Icon name="sparkles" size={17} /><p><strong>Why am I seeing this?</strong><span>Details were detected from email metadata. GradTracker never stores the content of your emails.</span></p></div>
      <button className="withdraw" onClick={withdraw}>Withdraw application</button>
    </aside>
  </div>;
}

function Review({ count, confirm, dismiss }: { count: number; confirm: () => void; dismiss: () => void }) {
  const [editingField, setEditingField] = useState<number | null>(null);
  const [fieldValues, setFieldValues] = useState(["Ramp", "New Grad Product Manager", "Assessment", "27 May 2025"]);
  const updateField = (index: number, value: string) => setFieldValues(values => values.map((item, i) => i === index ? value : item));
  if (!count) return <div className="page-content review-page"><Blank icon="check" title="Nothing to review" text="GradTracker was confident about everything it found." /></div>;
  return <div className="page-content review-page">
    <section className="review-head"><div><p>INBOX CHECK</p><h1>A few things need your eye.</h1><span>These emails look like applications. Confirm what GradTracker read, or dismiss the ones that aren't.</span></div><div className="review-progress"><strong>{count}</strong><span>left to review</span></div></section>
    <div className="review-layout">
      <aside className="review-queue"><p>REVIEW QUEUE</p>{["Ramp", "Airbnb", "KPMG", "Wealthsimple"].slice(0, count).map((x, i) => <button className={i === 0 ? "selected" : ""} key={x}><span className={`company-logo ${i ? "logo-blue" : "logo-coral"}`}>{x.slice(0, 2).toUpperCase()}</span><span><strong>{x}</strong><small>{i ? "Possible application" : "3 fields detected"}</small></span><Icon name="chevron" size={16} /></button>)}</aside>
      <article className="review-card">
        <div className="source-line"><div className="company-logo logo-coral large">RA</div><div><p>DETECTED FROM</p><strong>Greenhouse email</strong><span>18 May · 8:14 AM</span></div><a>View email ↗</a></div>
        <div className="confidence-note"><Icon name="sparkles" size={17} /><span>We’re <strong>82% confident</strong> this is an application update. Please check the details below.</span></div>
        <div className="detected-fields">
          <p>DETECTED DETAILS</p>
          {["Company", "Role", "Stage", "Deadline"].map((label, index) => <label key={label}>
            <span>{label} <i className={index === 2 ? "low" : ""}>{[96, 88, 62, 91][index]}% confident</i></span>
            <div>{editingField === index
              ? <input autoFocus value={fieldValues[index]} onChange={e => updateField(index, e.target.value)} onKeyDown={e => { if (e.key === "Enter" || e.key === "Escape") setEditingField(null); }} />
              : fieldValues[index]}
              <button onClick={() => setEditingField(editingField === index ? null : index)}>{editingField === index ? "Done" : "Edit"}</button>
            </div>
          </label>)}
        </div>
        <div className="review-actions"><button className="not-app" onClick={dismiss}>Not an application</button><button className="confirm" onClick={confirm}><Icon name="check" size={17} />Confirm application</button></div>
      </article>
    </div>
  </div>;
}

function Settings() {
  const [threshold, setThreshold] = useState(78);
  return <div className="page-content settings-page">
    <section className="settings-head"><p>ACCOUNT & PREFERENCES</p><h1>Settings</h1><span>Manage how GradTracker connects, detects, and reminds you.</span></section>
    <div className="settings-grid">
      <aside><button className="active">Gmail connection</button><button>Detection</button><button>Reminders</button><button>Profile</button><button>Appearance</button></aside>
      <div className="settings-main">
        <section><div className="section-title"><div><h2>Gmail connection</h2><p>Your application pipeline updates from this inbox.</p></div><span className="connected"><i />Connected</span></div>
          <div className="account-card"><div className="avatar">JM</div><div><strong>jamie.morgan@gmail.com</strong><span>Last synced today at 9:41 AM</span></div><button>Disconnect</button></div>
          <div className="privacy-row"><Icon name="lock" size={18} /><p><strong>Read-only access</strong><span>GradTracker can read email metadata but can’t send, delete, or modify your mail.</span></p></div>
        </section>
        <section><div className="section-title"><div><h2>Detection confidence</h2><p>How sure GradTracker must be before adding an application automatically.</p></div></div>
          <div className="slider-head"><span>Review threshold</span><strong>{threshold}%</strong></div>
          <input className="range" type="range" min="50" max="95" value={threshold} onChange={e => setThreshold(Number(e.target.value))} style={{ "--value": `${((threshold - 50) / 45) * 100}%` } as React.CSSProperties} />
          <div className="range-labels"><span>More automatic</span><span>More review</span></div>
          <div className="threshold-note"><Icon name="sparkles" size={16} /><span>Items below {threshold}% confidence go to Needs review. This only affects future syncs.</span></div>
        </section>
      </div>
    </div>
  </div>;
}

function Blank({ icon, title, text }: { icon: IconName; title: string; text: string }) {
  return <div className="blank"><span><Icon name={icon} size={24} /></span><h3>{title}</h3><p>{text}</p></div>;
}

export default function App() {
  const [view, setView] = useState<View>("connect");
  const [detail, setDetail] = useState(false);
  const [dark, setDark] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [jobNames, setJobNames] = useState<Record<number, string>>({ 1: "Deloite" });
  const [reviewCount, setReviewCount] = useState(4);
  const [toast, setToast] = useState("");
  const [query, setQuery] = useState("");
  const [selectedJobId, setSelectedJobId] = useState(1);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDetail(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (view === "connect") return <Connect onConnect={() => { setView("pipeline"); setScanning(true); setTimeout(() => { setScanning(false); setToast("23 applications found · 4 need review"); }, 2500); }} />;
  const titles: Record<View, string> = { connect: "", pipeline: "Pipeline", review: "Needs review", settings: "Settings" };
  const selectedJob = jobs.map(job => ({ ...job, company: jobNames[job.id] || job.company })).find(job => job.id === selectedJobId) || jobs[0];
  const sync = () => { if (syncing) return; setSyncing(true); setTimeout(() => { setSyncing(false); setToast("3 new emails · 1 stage change"); }, 1800); };
  return <div className={`app-shell ${dark ? "dark" : ""}`}>
    <Sidebar view={view} setView={v => { setView(v); setDetail(false); }} reviewCount={reviewCount} dark={dark} setDark={setDark} />
    <main className="main-area">
      <Topbar title={titles[view]} syncing={syncing} onSync={sync} query={query} setQuery={setQuery} />
      {view === "pipeline" && <Pipeline openDetail={id => { setSelectedJobId(id); setDetail(true); }} scan={scanning} jobNames={jobNames} query={query} />}
      {view === "review" && <Review count={reviewCount} confirm={() => { setReviewCount(x => Math.max(0, x - 1)); setToast("Application confirmed"); }} dismiss={() => { setReviewCount(x => Math.max(0, x - 1)); setToast("Email dismissed · It won’t resurface"); }} />}
      {view === "settings" && <Settings />}
    </main>
    {detail && <DetailPanel close={() => setDetail(false)} job={selectedJob} saveCompany={v => { setJobNames(names => ({ ...names, [selectedJobId]: v })); setToast("Company updated"); }} withdraw={() => { setDetail(false); setToast("Application withdrawn · Undo"); }} />}
    {toast && <div className="toast"><Icon name="check" size={16} />{toast}</div>}
  </div>;
}
