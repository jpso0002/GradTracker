import { useEffect, useId, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import type { DemoScanResponse, Job } from "@gradtracker/shared";
import { Button, Card, Icon, Input, Wordmark } from "../ds";
import { api, ApiError } from "../api/client";
import { useAsync } from "../hooks/useAsync";
import { useToast } from "../shell/ToastHost";
import { readProfile, saveProfile, signIn } from "../session";

/**
 * The Connect screen, and a **simulated** Google sign-in, for the presentation
 * (D35). Hosted OAuth is deferred (T4.1–T4.3): `gmail.readonly` is a restricted
 * scope, and opening it beyond 100 test users needs a paid security assessment.
 * This shows how sign-in would work, end to end, without contacting Google:
 *
 *   1. Connect — what GradTracker does and does not access (app-flow.md §5.1).
 *   2. A stand-in for Google's consent screen: read-only Gmail access only.
 *   3. A scan of the mailbox the API is serving — the sample mailbox under
 *      `npm run demo` — counting that database's own numbers, then the
 *      dashboard.
 *
 * Each step says it is simulated. A demo that looks like a working sign-in is
 * a demo that misleads (P5).
 */

/** How long the simulated scan takes to "read" the sample mailbox. */
export const SCAN_MS = 4000;

type Step = "create" | "connect" | "consent" | "scanning";

const TITLES: Record<Step, string> = {
  create: "Create your account",
  connect: "Connect your Gmail",
  consent: "Connect your Gmail",
  scanning: "Scanning your inbox",
};

export function ConnectView({ onScanned }: { onScanned?: () => void } = {}) {
  // A profile from earlier in this tab means the account step is done (D39).
  const [step, setStep] = useState<Step>(() => (readProfile() ? "connect" : "create"));

  useEffect(() => {
    document.title = `${TITLES[step]} · GradTracker`;
  }, [step]);

  return (
    <main
      style={{
        minHeight: "100vh",
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--space-xl) var(--space-lg)",
        background: "var(--surface-page)",
      }}
    >
      <div style={{ width: "100%", maxWidth: "calc(var(--container-max) / 2.6)", display: "flex", flexDirection: "column", gap: "var(--space-xl)" }}>
        <Wordmark size={24} />
        {step === "create" ? <CreateAccount onCreated={() => setStep("connect")} /> : null}
        {step === "connect" ? <Connect onContinue={() => setStep("consent")} /> : null}
        {step === "consent" ? <Consent onCancel={() => setStep("connect")} onAllow={() => setStep("scanning")} /> : null}
        {step === "scanning" ? <Scan onScanned={onScanned} /> : null}
      </div>
    </main>
  );
}

// ── 0. Create an account — a mock (D39) ─────────────────────────────────────

/**
 * A mock sign-up: name, email and password, as a real product would ask. No
 * account is created and nothing leaves the browser — the name and email are
 * kept for this tab to greet the student, the password not at all. Whatever
 * email is typed, the Gmail connected next is the demo inbox.
 */
function CreateAccount({ onCreated }: { onCreated: () => void }) {
  const nameId = useId();
  const emailId = useId();
  const passwordId = useId();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tried, setTried] = useState(false);

  const errors = {
    name: name.trim() === "" ? "Enter your name" : undefined,
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? undefined : "Enter an email address, like sam@student.monash.edu",
    password: password.length >= 8 ? undefined : "Use at least 8 characters",
  };
  const shown = (message: string | undefined) =>
    tried && message ? { error: message, "aria-invalid": true as const } : {};

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (errors.name || errors.email || errors.password) return;
    saveProfile({ name: name.trim(), email: email.trim() });
    setPassword("");
    onCreated();
  };

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
        <h1 style={{ margin: 0, fontSize: "var(--heading-lg-size)", lineHeight: "var(--heading-lg-lh)" }}>
          Create your account
        </h1>
        <p style={{ margin: 0, color: "var(--text-secondary)" }}>
          Every graduate application, one ranked list of what’s due next.
        </p>
      </div>

      <form noValidate onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
        <Input
          id={nameId}
          label="Full name"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          {...shown(errors.name)}
        />
        <Input
          id={emailId}
          type="email"
          label="Email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          {...shown(errors.email)}
        />
        <Input
          id={passwordId}
          type="password"
          label="Password"
          autoComplete="new-password"
          // A placeholder, not a hint: this design system puts the hint inside
          // the label, which would make it part of the field's name.
          placeholder="At least 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          {...shown(errors.password)}
        />
        <Button type="submit" size="lg" fullWidth>
          Create account
        </Button>
      </form>

      <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "var(--caption-size)", textAlign: "center" }}>
        Demo walkthrough: no account is created, and nothing you type leaves this browser.
      </p>
    </>
  );
}

// ── 1. Connect ──────────────────────────────────────────────────────────────

function Connect({ onContinue }: { onContinue: () => void }) {
  const profile = readProfile();
  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
        {profile ? (
          <p style={{ margin: 0, display: "flex", alignItems: "center", gap: "var(--space-xs)", color: "var(--text-secondary)" }}>
            <Icon name="check" size={16} />
            Account created for {profile.email}
          </p>
        ) : null}
        <h1 style={{ margin: 0, fontSize: "var(--heading-lg-size)", lineHeight: "var(--heading-lg-lh)" }}>
          {profile ? `Welcome, ${profile.name.split(/\s+/)[0]}. Connect your Gmail` : "Connect your Gmail"}
        </h1>
        <p style={{ margin: 0, color: "var(--text-secondary)" }}>
          GradTracker finds your applications in your inbox, so you never type one in.
        </p>
      </div>

      <Card padding="compact" elevation={1}>
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "var(--space-lg)" }}>
          <Assurance
            title="Reads your Gmail, read-only"
            detail="GradTracker can never send, delete or change an email."
          />
          <Assurance title="Never stores your password" detail="Google signs you in. GradTracker never sees your password." />
          <Assurance
            title="Never keeps email content"
            detail="Only the company, role, stage, deadline, next action and the sender’s domain are kept."
          />
        </ul>
      </Card>

      <Button size="lg" fullWidth onClick={onContinue}>
        Continue with Google
      </Button>

      <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "var(--caption-size)", textAlign: "center" }}>
        Demo walkthrough: this Google sign-in is simulated, and the inbox connected is the team’s demo
        mailbox, not your own.
      </p>
    </>
  );
}

function Assurance({ title, detail }: { title: string; detail: string }) {
  return (
    <li style={{ display: "flex", gap: "var(--space-md)", alignItems: "flex-start" }}>
      <span style={{ color: "var(--accent-primary)", display: "flex", paddingTop: 2 }}>
        <Icon name="lock" size={16} />
      </span>
      <span style={{ display: "flex", flexDirection: "column", gap: "var(--space-xxs)" }}>
        <span style={{ color: "var(--text-heading)" }}>{title}</span>
        <span style={{ color: "var(--text-secondary)", fontSize: "var(--caption-size)" }}>{detail}</span>
      </span>
    </li>
  );
}

// ── 2. Consent — a stand-in for Google's own screen ─────────────────────────

function Consent({ onCancel, onAllow }: { onCancel: () => void; onAllow: () => void }) {
  const headingId = useId();
  const me = useAsync(() => api.me(), []);
  const profile = readProfile();
  // The Gmail account connected is the demo inbox whatever email the account
  // was made with (D39) — the one the scan then reads.
  const name = profile?.name ?? me.data?.displayName ?? "Sample student";
  const email = me.data?.mailbox ?? me.data?.email ?? "student@student.monash.edu";

  return (
    <section
      aria-labelledby={headingId}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-lg)",
        padding: "var(--card-pad-compact)",
        background: "var(--surface-card)",
        border: "1px solid var(--border-hairline)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-2)",
      }}
    >
      <div>
        <h1 id={headingId} style={{ margin: 0, fontSize: "var(--heading-md-size)", lineHeight: "var(--heading-md-lh)" }}>
          Sign in with Google
        </h1>
        <p style={{ margin: 0, color: "var(--text-secondary)" }}>to continue to GradTracker</p>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)" }}>
        <span
          aria-hidden="true"
          style={{
            width: "var(--control-h)",
            height: "var(--control-h)",
            borderRadius: "var(--radius-pill)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--accent-primary-wash)",
            color: "var(--text-heading)",
          }}
        >
          {name.slice(0, 1)}
        </span>
        <span style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ color: "var(--text-heading)" }}>{name}</span>
          <span style={{ color: "var(--text-secondary)", fontSize: "var(--caption-size)" }}>{email}</span>
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
        <p style={{ margin: 0, color: "var(--text-body)" }}>GradTracker wants to:</p>
        <p style={{ margin: 0, display: "flex", gap: "var(--space-sm)", alignItems: "flex-start" }}>
          <Icon name="mail" size={16} />
          <span style={{ display: "flex", flexDirection: "column", gap: "var(--space-xxs)" }}>
            <span style={{ color: "var(--text-heading)" }}>Read your email messages and settings</span>
            <span style={{ color: "var(--text-secondary)", fontSize: "var(--caption-size)" }}>
              Read-only: GradTracker cannot send, delete or change your email.
            </span>
          </span>
        </p>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-sm)" }}>
        <Button variant="quiet" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onAllow}>Allow</Button>
      </div>

      <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "var(--caption-size)" }}>
        Simulated for the demo — this is where Google’s own consent screen would appear.
      </p>
    </section>
  );
}

// ── 3. Scan — the demo inbox read (D37), or the sample mailbox counted up ────

interface Mailbox {
  emails: number;
  applications: Job[];
  toReview: number;
  /** The demo inbox the scan read (D37), or null for the seeded mailbox. */
  inbox: string | null;
  /** Why the seeded mailbox was used instead, when it was. */
  notice: string | null;
}

/**
 * One scan at a time. Reading the inbox takes seconds, and the screen can mount
 * twice while it runs (React's development double-mount, a reload): each would
 * queue a full rescan behind the first and the counts would wait for both.
 */
let inFlight: Promise<DemoScanResponse> | null = null;
function scanOnce(): Promise<DemoScanResponse> {
  inFlight ??= api.demoScan().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function readMailbox(): Promise<Mailbox> {
  // The demo server reads the demo inbox now (D37). Anywhere else there is no
  // scan to run, and what is already loaded is what the scan shows.
  let scan: DemoScanResponse | null = null;
  try {
    scan = await scanOnce();
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 404)) throw error;
  }

  const [active, archived, review] = await Promise.all([
    api.listJobs({ status: "active" }),
    api.listJobs({ status: "archived" }),
    api.listReview(),
  ]);
  const applications = [...active.jobs, ...archived.jobs];
  return {
    // A database filled without a sync records no count; then the scan reads
    // at least what it found.
    emails: Math.max(scan?.emailsRead ?? active.stats.emailsRead, applications.length + review.items.length),
    applications,
    toReview: review.items.length,
    inbox: scan?.source === "inbox" ? scan.inbox : null,
    notice: scan?.notice ?? null,
  };
}

function Scan({ onScanned }: { onScanned?: (() => void) | undefined }) {
  const navigate = useNavigate();
  // `show` is stable; the context object around it is not, and depending on it
  // would restart the scan whenever a toast appeared.
  const { show } = useToast();
  const mailbox = useAsync(readMailbox, []);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const data = mailbox.data;
    if (!data) return;
    const started = Date.now();
    const timer = window.setInterval(() => {
      const done = Math.min(1, (Date.now() - started) / SCAN_MS);
      setProgress(done);
      if (done < 1) return;
      window.clearInterval(timer);
      signIn();
      show(`Inbox scanned — ${data.applications.length} applications found, ${data.toReview} to review`);
      if (data.notice) show(data.notice, "info");
      onScanned?.();
      navigate("/pipeline", { replace: true });
    }, 50);
    return () => window.clearInterval(timer);
  }, [mailbox.data, navigate, show, onScanned]);

  const data = mailbox.data;
  const read = data ? Math.round(data.emails * progress) : 0;
  const found = data ? Math.round(data.applications.length * progress) : 0;
  const toReview = data ? Math.round(data.toReview * progress) : 0;
  const latest = data && found > 0 ? data.applications[found - 1] : undefined;

  if (mailbox.error) {
    return (
      <Card padding="compact">
        <p style={{ marginTop: 0 }}>GradTracker could not reach the sample mailbox. Is the demo server running?</p>
        <Button onClick={mailbox.reload}>Try again</Button>
      </Card>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
      <h1 style={{ margin: 0, fontSize: "var(--heading-lg-size)", lineHeight: "var(--heading-lg-lh)" }}>
        Scanning your inbox
      </h1>

      <div
        role="progressbar"
        aria-label="Scanning your inbox"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
        style={{ height: 6, borderRadius: "var(--radius-pill)", background: "var(--border-hairline)", overflow: "hidden" }}
      >
        <div style={{ width: `${progress * 100}%`, height: "100%", background: "var(--accent-primary)" }} />
      </div>

      <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--space-md)" }}>
        <Count label="Emails read" value={data ? `${read} of ${data.emails}` : "—"} />
        <Count label="Applications" value={data ? String(found) : "—"} />
        <Count label="To review" value={data ? String(toReview) : "—"} />
      </dl>

      <p style={{ margin: 0, minHeight: "1.5em", color: "var(--text-secondary)", fontSize: "var(--caption-size)" }}>
        {latest ? `Found ${latest.company} — ${latest.role}` : "Reading your mail…"}
      </p>

      <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "var(--caption-size)" }}>
        {/* Said once the server has answered: until then it is not known
            whether the demo inbox or the sample mailbox is being read. */}
        {!data
          ? null
          : data.inbox
            ? `Reading ${data.inbox}, the demo inbox: sample emails, classified from their labels — no model is called.`
            : "Simulated scan of a sample mailbox: nothing is read from Gmail."}
      </p>
    </div>
  );
}

function Count({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-xxs)" }}>
      <dt
        style={{
          fontSize: "var(--micro-cap-size)",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--text-secondary)",
        }}
      >
        {label}
      </dt>
      <dd className="gt-num" style={{ margin: 0, fontSize: "var(--heading-md-size)", color: "var(--text-heading)" }}>
        {value}
      </dd>
    </div>
  );
}
