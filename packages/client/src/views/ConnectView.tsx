import { useEffect, useId, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { AuthSessionResponse, DemoScanResponse, Job } from "@gradtracker/shared";
import { Button, Card, Icon } from "../ds";
import { api, ApiError } from "../api/client";
import { useAsync } from "../hooks/useAsync";
import { useToast } from "../shell/ToastHost";
import { CenteredPage } from "./AccountViews";

/**
 * Connect your Gmail — the demo inbox's account's first sign-in (D35, D40).
 * Hosted OAuth is deferred (T4.1–T4.3): `gmail.readonly` is a restricted
 * scope, and opening it beyond 100 test users needs a paid security assessment.
 * This shows how connecting would work, without Google's own screens:
 *
 *   1. Connect — what GradTracker does and does not access (app-flow.md §5.1).
 *   2. A stand-in for Google's consent screen: read-only Gmail access only.
 *   3. The scan: the demo inbox read over IMAP (D37), or the sample mailbox,
 *      then the dashboard.
 *
 * Each step says what is simulated. A demo that looks like a working Google
 * sign-in is a demo that misleads (P5).
 */

/** The least time the scan screen shows, so the room can read it. */
export const SCAN_MS = 4000;

type Step = "connect" | "consent" | "scanning";

const TITLES: Record<Step, string> = {
  connect: "Connect your Gmail",
  consent: "Connect your Gmail",
  scanning: "Scanning your inbox",
};

export function ConnectView({ session, onScanned }: { session: AuthSessionResponse; onScanned?: () => void }) {
  const [step, setStep] = useState<Step>("connect");
  const name = session.user?.name ?? "Student";

  return (
    <CenteredPage title={TITLES[step]}>
      {step === "connect" ? <Connect name={name} onContinue={() => setStep("consent")} /> : null}
      {step === "consent" ? (
        <Consent
          name={name}
          // The Gmail connected is the demo inbox — the one the scan reads.
          email={session.inbox ?? session.user?.email ?? ""}
          onCancel={() => setStep("connect")}
          onAllow={() => setStep("scanning")}
        />
      ) : null}
      {step === "scanning" ? <Scan onScanned={onScanned} /> : null}
    </CenteredPage>
  );
}

// ── 1. Connect ──────────────────────────────────────────────────────────────

function Connect({ name, onContinue }: { name: string; onContinue: () => void }) {
  const first = name.trim().split(/\s+/)[0] || name;
  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
        <h1 style={{ margin: 0, fontSize: "var(--heading-lg-size)", lineHeight: "var(--heading-lg-lh)" }}>
          {`Welcome, ${first}. Connect your Gmail`}
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
        Demo walkthrough: the Google step is simulated, and the inbox connected is the team’s demo mailbox.
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

function Consent({
  name,
  email,
  onCancel,
  onAllow,
}: {
  name: string;
  email: string;
  onCancel: () => void;
  onAllow: () => void;
}) {
  const headingId = useId();

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
        <p style={{ marginTop: 0 }}>{mailbox.error.message || "GradTracker could not read the mailbox."}</p>
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
