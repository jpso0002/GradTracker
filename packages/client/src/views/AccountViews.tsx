import { useEffect, useId, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { AuthSessionResponse } from "@gradtracker/shared";
import { Button, Input, Wordmark } from "../ds";
import { api, ApiError, NetworkError } from "../api/client";

/**
 * Create your account and Sign in — the presentation demo's own accounts
 * (D40). The product signs in with Google (T4.1–T4.3, deferred) and stores no
 * credential; these accounts live outside its database, for the demo only.
 *
 * The demo: create a fresh account in front of the room, see its empty
 * dashboard, sign out, and sign in to the demo inbox's account.
 */

/** Where a signed-in student goes next: the demo inbox's account to its first
 *  scan, everyone else — and the inbox once scanned — to the dashboard. */
export function nextPath(session: AuthSessionResponse): string {
  if (!session.user) return "/signin";
  return session.canConnectInbox && !session.scanned ? "/connect" : "/pipeline";
}

/** A signed-out screen: centred, no navigation. */
export function CenteredPage({ title, children }: { title: string; children: ReactNode }) {
  useEffect(() => {
    document.title = `${title} · GradTracker`;
  }, [title]);
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
      <div
        style={{
          width: "100%",
          maxWidth: "calc(var(--container-max) / 2.6)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-xl)",
        }}
      >
        <Wordmark size={24} />
        {children}
      </div>
    </main>
  );
}

function Heading({ title, lead }: { title: string; lead: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
      <h1 style={{ margin: 0, fontSize: "var(--heading-lg-size)", lineHeight: "var(--heading-lg-lh)" }}>{title}</h1>
      <p style={{ margin: 0, color: "var(--text-secondary)" }}>{lead}</p>
    </div>
  );
}

function Footnote({ children }: { children: ReactNode }) {
  return (
    <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "var(--caption-size)", textAlign: "center" }}>
      {children}
    </p>
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
    <p role="alert" style={{ margin: 0, color: "var(--ruby-deep)", fontSize: "var(--caption-size)" }}>
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
    <CenteredPage title="Create your account">
      <Heading title="Create your account" lead="Every graduate application, one ranked list of what’s due next." />

      <form noValidate onSubmit={(e) => void submit(e)} style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
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
          // A placeholder, not a hint: this design system puts the hint inside
          // the label, which would make it part of the field's name.
          placeholder="At least 8 characters"
          value={values.password}
          onChange={set("password")}
          {...shown("password")}
        />
        {failure && !failure.field ? <FormError text={failure.text} /> : null}
        <Button type="submit" size="lg" fullWidth disabled={busy}>
          {busy ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <Footnote>
        Already have an account? <Link to="/signin">Sign in</Link>
      </Footnote>
      <Footnote>Demo accounts: kept on this computer for the presentation, never in GradTracker’s database.</Footnote>
    </CenteredPage>
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
    <CenteredPage title="Sign in">
      <Heading title="Sign in" lead="Welcome back." />

      <form noValidate onSubmit={(e) => void submit(e)} style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
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
        <Button type="submit" size="lg" fullWidth disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <Footnote>
        New to GradTracker? <Link to="/signup">Create an account</Link>
      </Footnote>
    </CenteredPage>
  );
}
