import { useEffect, useId, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { AuthSessionResponse } from "@gradtracker/shared";
import { Button, Icon, Input, Wordmark } from "../ui";
import { api, ApiError, NetworkError } from "../api/client";

/**
 * Create your account and Sign in — the presentation demo's own accounts
 * (D40) — in the style of Will's Connect page (D41).
 *
 * The product signs in with Google (T4.1–T4.3, deferred) and stores no
 * credential; these accounts live outside its database, for the demo only.
 */

/** Where a signed-in student goes next: the demo inbox's account to its first
 *  scan, everyone else — and the inbox once scanned — to the dashboard. */
export function nextPath(session: AuthSessionResponse): string {
  if (!session.user) return "/signin";
  return session.canConnectInbox && !session.scanned ? "/connect" : "/pipeline";
}

/**
 * A signed-out screen, as Will drew Connect: the logo and a quiet promise
 * across the top, the pitch on the left, the card on the right, the rings
 * behind. `title` is the document title.
 */
export function ConnectLayout({ title, copy, card }: { title: string; copy: ReactNode; card: ReactNode }) {
  useEffect(() => {
    document.title = `${title} · GradTracker`;
  }, [title]);
  return (
    <main className="gt-connect-page">
      <header className="gt-connect-header">
        <Wordmark size={20} />
        <span className="gt-tiny-link">Privacy first, always</span>
      </header>
      <section className="gt-connect-copy">{copy}</section>
      <section className="gt-connect-card">{card}</section>
      <footer className="gt-connect-footer">Built for the job search, not for your data.</footer>
    </main>
  );
}

/** Will's pitch: the eyebrow, the two-line headline, the lede. */
export function Pitch({
  eyebrow = "Your application copilot",
  line,
  emphasis,
  lede,
  children,
  heading = false,
}: {
  eyebrow?: string;
  line: string;
  emphasis: string;
  lede: string;
  children?: ReactNode;
  /** True when the headline is the page's heading, not decoration beside it. */
  heading?: boolean;
}) {
  // The space before the break keeps the two lines apart when read as one name.
  const headline = (
    <>
      {line} <br />
      <em>{emphasis}</em>
    </>
  );
  return (
    <>
      <div className="gt-connect-eyebrow">
        <Icon name="sparkles" size={15} />
        {eyebrow}
      </div>
      {heading ? <h1>{headline}</h1> : <p className="gt-display">{headline}</p>}
      <p className="gt-connect-lede">{lede}</p>
      {children}
    </>
  );
}

const PITCH = {
  line: "Endless applications.",
  emphasis: "One clear next step.",
  lede: "GradTracker turns your inbox into a ranked, up-to-date application pipeline, so you always know what needs attention next.",
};

function CardHeading({ title, sub }: { title: string; sub: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <h1 style={{ fontSize: 24, margin: 0, letterSpacing: "-0.5px" }}>{title}</h1>
      <p className="sub">{sub}</p>
    </div>
  );
}

type Field = "name" | "email" | "password";

function message(cause: unknown): { text: string; field?: Field } {
  if (cause instanceof NetworkError) return { text: "GradTracker can't be reached. Is the demo server running?" };
  if (cause instanceof ApiError) {
    const field = cause.field === "name" || cause.field === "email" || cause.field === "password" ? cause.field : undefined;
    return field ? { text: cause.message, field } : { text: cause.message };
  }
  return { text: "Something went wrong. Try again." };
}

function FormError({ text }: { text: string }) {
  return (
    <p role="alert" className="gt-form-error">
      {text}
    </p>
  );
}

// ── Create your account ─────────────────────────────────────────────────────

export function SignUpView() {
  const navigate = useNavigate();
  const ids = { name: useId(), email: useId(), password: useId() };
  const [values, setValues] = useState({ name: "", email: "", password: "" });
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<{ text: string; field?: Field } | null>(null);

  // The same rules the server checks, so the form answers at once.
  const errors: Record<Field, string | undefined> = {
    name: values.name.trim() === "" ? "Enter your name" : undefined,
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())
      ? undefined
      : "Enter an email address, like sam@student.monash.edu",
    password: values.password.length >= 8 ? undefined : "Use at least 8 characters",
  };
  const shown = (field: Field) => {
    const text = (tried ? errors[field] : undefined) ?? (failure?.field === field ? failure.text : undefined);
    return text ? { error: text, "aria-invalid": true as const } : {};
  };
  const set = (field: Field) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setValues((v) => ({ ...v, [field]: e.target.value }));
    if (failure?.field === field) setFailure(null);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (errors.name || errors.email || errors.password) return;
    setBusy(true);
    setFailure(null);
    try {
      const session = await api.signUp(values);
      navigate(nextPath(session), { replace: true });
    } catch (cause) {
      setFailure(message(cause));
      setBusy(false);
    }
  };

  return (
    <ConnectLayout
      title="Create your account"
      copy={<Pitch {...PITCH} />}
      card={
        <>
          <CardHeading title="Create your account" sub="Free for students. Takes a minute." />
          <form noValidate onSubmit={(e) => void submit(e)} className="gt-form">
            <Input id={ids.name} label="Full name" autoComplete="name" value={values.name} onChange={set("name")} {...shown("name")} />
            <Input
              id={ids.email}
              type="email"
              label="Email"
              autoComplete="email"
              value={values.email}
              onChange={set("email")}
              {...shown("email")}
            />
            <Input
              id={ids.password}
              type="password"
              label="Password"
              autoComplete="new-password"
              // A placeholder, not a hint: the field's hint sits inside its
              // label, which would make it part of the field's name.
              placeholder="At least 8 characters"
              value={values.password}
              onChange={set("password")}
              {...shown("password")}
            />
            {failure && !failure.field ? <FormError text={failure.text} /> : null}
            <Button type="submit" variant="ink" size="lg" fullWidth disabled={busy} iconRight="arrow-right">
              {busy ? "Creating account…" : "Create account"}
            </Button>
          </form>
          <p className="sub" style={{ textAlign: "center" }}>
            Already have an account? <Link to="/signin">Sign in</Link>
          </p>
          <p className="sub" style={{ fontSize: 12, textAlign: "center" }}>
            Demo accounts: kept on this computer for the presentation, never in GradTracker’s database.
          </p>
        </>
      }
    />
  );
}

// ── Sign in ─────────────────────────────────────────────────────────────────

export function SignInView() {
  const navigate = useNavigate();
  const ids = { email: useId(), password: useId() };
  const [values, setValues] = useState({ email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (values.email.trim() === "" || values.password === "") {
      setFailure("Enter your email and password.");
      return;
    }
    setBusy(true);
    setFailure(null);
    try {
      const session = await api.signIn(values);
      navigate(nextPath(session), { replace: true });
    } catch (cause) {
      setFailure(message(cause).text);
      setBusy(false);
    }
  };

  return (
    <ConnectLayout
      title="Sign in"
      copy={<Pitch {...PITCH} />}
      card={
        <>
          <CardHeading title="Sign in" sub="Welcome back." />
          <form noValidate onSubmit={(e) => void submit(e)} className="gt-form">
            <Input
              id={ids.email}
              type="email"
              label="Email"
              autoComplete="email"
              value={values.email}
              onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
            />
            <Input
              id={ids.password}
              type="password"
              label="Password"
              autoComplete="current-password"
              value={values.password}
              onChange={(e) => setValues((v) => ({ ...v, password: e.target.value }))}
            />
            {failure ? <FormError text={failure} /> : null}
            <Button type="submit" variant="ink" size="lg" fullWidth disabled={busy} iconRight="arrow-right">
              {busy ? "Signing in…" : "Sign in"}
            </Button>
          </form>
          <p className="sub" style={{ textAlign: "center" }}>
            New to GradTracker? <Link to="/signup">Create an account</Link>
          </p>
        </>
      }
    />
  );
}
