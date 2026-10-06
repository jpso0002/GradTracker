import { useEffect, useId, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Job } from "@gradtracker/shared";
import { Button, Card, Icon, Wordmark } from "../ds";
import { api } from "../api/client";
import { useAsync } from "../hooks/useAsync";
import { useToast } from "../shell/ToastHost";
import { signIn } from "../session";

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

type Step = "connect" | "consent" | "scanning";

export function ConnectView() {
  const [step, setStep] = useState<Step>("connect");

  useEffect(() => {
    document.title = `${step === "scanning" ? "Scanning your inbox" : "Connect your Gmail"} · GradTracker`;
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
        {step === "connect" ? <Connect onContinue={() => setStep("consent")} /> : null}
        {step === "consent" ? <Consent onCancel={() => setStep("connect")} onAllow={() => setStep("scanning")} /> : null}
        {step === "scanning" ? <Scan /> : null}
      </div>
    </main>
  );
}

// ── 1. Connect ──────────────────────────────────────────────────────────────

function Connect({ onContinue }: { onContinue: () => void }) {
  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
        <h1 style={{ margin: 0, fontSize: "var(--heading-lg-size)", lineHeight: "var(--heading-lg-lh)" }}>
          Connect your Gmail
        </h1>
        <p style={{ margin: 0, color: "var(--text-secondary)" }}>
          Twenty applications, one ranked list of what’s due next.
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
        Demo walkthrough: this sign-in is simulated and the inbox is a sample mailbox. No Google account is
        contacted.
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
  const name = me.data?.displayName ?? "Sample student";
  const email = me.data?.email ?? "student@student.monash.edu";

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

// ── 3. Scan — the sample mailbox's own numbers, counted up ──────────────────

interface Mailbox {
  emails: number;
  applications: Job[];
  toReview: number;
}

async function readMailbox(): Promise<Mailbox> {
  const [active, archived, review] = await Promise.all([
    api.listJobs({ status: "active" }),
    api.listJobs({ status: "archived" }),
    api.listReview(),
  ]);
  const applications = [...active.jobs, ...archived.jobs];
  return {
    // A database filled without a sync records no count; then the scan reads
    // at least what it found.
    emails: Math.max(active.stats.emailsRead, applications.length + review.items.length),
    applications,
    toReview: review.items.length,
  };
}

function Scan() {
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
      navigate("/pipeline", { replace: true });
    }, 50);
    return () => window.clearInterval(timer);
  }, [mailbox.data, navigate, show]);

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
        Simulated scan of a sample mailbox: nothing is read from Gmail.
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
