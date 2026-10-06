import { useEffect, useId, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, EmptyState, Switch, TopBar } from "../ds";
import { isSignedIn, signOut } from "../session";
import { api, NetworkError } from "../api/client";
import { useAsync } from "../hooks/useAsync";
import { useToast } from "../shell/ToastHost";
import { useTheme } from "../theme/theme";
import { ViewTitle } from "../shell/ViewTitle";
import { useShortcuts } from "../preferences";

/**
 * Settings (T6.4).
 *
 * The review threshold (D28): how sure the model must be before an application
 * enters the pipeline without asking. A change applies to **new mail only** —
 * re-routing mail already processed would un-assert applications the student
 * may have acted on — and the copy says so. The maximum means "review
 * everything".
 *
 * Gmail connection and Disconnect are deferred with sign-in (T4.1–T4.3): in
 * demo mode there is no stored token to disconnect, and the page says that
 * rather than offering a control that does nothing.
 */

/** Long enough that dragging the slider saves once, not once per step. */
const SAVE_AFTER_MS = 400;

const percent = (value: number) => Math.round(value * 100);

/** Steps of 0.05 arrive as 0.6500000000000001; the setting is a percentage. */
const toHundredths = (value: number) => Math.round(value * 100) / 100;

function consequence(threshold: number): string {
  if (threshold >= 1) return "Every application email waits in Needs review for you to confirm.";
  if (threshold <= 0) return "No email waits in Needs review for being unsure.";
  return `Emails GradTracker is less than ${percent(threshold)}% sure about wait in Needs review for you to confirm.`;
}

export function SettingsView() {
  const settings = useAsync(() => api.getSettings(), []);
  const toast = useToast();
  const { theme, toggle } = useTheme();
  const [shortcuts, setShortcuts] = useShortcuts();
  const navigate = useNavigate();
  const signedIn = isSignedIn();
  const sliderId = useId();
  const helpId = useId();
  // The value last saved, once the student has saved one this visit.
  const [saved, setSaved] = useState<number | null>(null);
  // The value while the student is moving the slider and it is not yet saved.
  const [moving, setMoving] = useState<number | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const stored = saved ?? settings.data?.reviewThreshold ?? null;
  const threshold = moving ?? stored;

  const move = (next: number) => {
    setMoving(next);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      void (async () => {
        try {
          const result = await api.updateSettings({ reviewThreshold: next });
          setSaved(result.reviewThreshold);
          toast.show("Review threshold saved — it applies to new mail");
        } catch (cause) {
          toast.show(
            cause instanceof NetworkError
              ? "You are offline — the review threshold was not saved."
              : "Could not save the review threshold.",
            "error",
          );
        } finally {
          // On failure this puts the slider back where it was saved.
          setMoving(null);
        }
      })();
    }, SAVE_AFTER_MS);
  };

  return (
    <>
      <ViewTitle title="Settings" />
      <TopBar title="Settings" />
      <div
        style={{
          padding: "var(--space-xl)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-xxl)",
          maxWidth: "calc(var(--container-max) / 2)",
        }}
      >
        <Section title="Review">
          {settings.loading && !settings.data ? (
            <p style={{ margin: 0, color: "var(--text-muted)" }}>Loading…</p>
          ) : settings.error || threshold === null ? (
            <EmptyState
              icon={settings.offline ? "wifi-off" : "triangle-alert"}
              title={settings.offline ? "You are offline" : "Could not load your settings"}
              description={settings.error?.message ?? "No settings were returned."}
              action={<Button onClick={settings.reload}>Try again</Button>}
              compact
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
              <label htmlFor={sliderId} style={{ color: "var(--text-body)" }}>
                How sure GradTracker must be before adding an application automatically
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)" }}>
                <input
                  id={sliderId}
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={threshold}
                  aria-valuetext={`${percent(threshold)}%`}
                  aria-describedby={helpId}
                  onChange={(e) => move(toHundredths(Number(e.target.value)))}
                  style={{ flex: 1, margin: 0, accentColor: "var(--accent-primary)" }}
                />
                {/* The slider announces its own value; this is the sighted copy. */}
                <span aria-hidden="true" className="gt-num" style={{ minWidth: "4ch", textAlign: "right" }}>
                  {percent(threshold)}%
                </span>
              </div>
              <p id={helpId} style={{ margin: 0, color: "var(--text-muted)", fontSize: "var(--caption-size)" }}>
                {consequence(threshold)} Applies to new mail only — applications already in your pipeline stay
                where they are.
              </p>
            </div>
          )}
        </Section>

        <Section title="Appearance">
          {/* `gt-switch`: the design system hides the checkbox at zero size,
              so app.css draws the focus ring on the track instead (T6.5). */}
          <span className="gt-switch">
            <Switch
              checked={theme === "dark"}
              onChange={() => toggle()}
              label="Dark theme"
              description="GradTracker follows your system setting until you choose."
            />
          </span>
        </Section>

        <Section title="Keyboard">
          <span className="gt-switch">
            <Switch
              checked={shortcuts}
              onChange={(on) => setShortcuts(on)}
              label="Press / to search"
              description="Turn this off if you use speech input or switch control — a stray slash would jump to the search box."
            />
          </span>
        </Section>

        <Section title="Gmail">
          <p style={{ margin: 0, color: "var(--text-muted)" }}>
            Demo mode: the sign-in is a walkthrough, not a real Google connection, and mail reaches
            GradTracker through the local import. Sign out to start the walkthrough again.
          </p>
          {signedIn ? (
            <div>
              <Button
                variant="quiet"
                onClick={() => {
                  signOut();
                  navigate("/connect");
                }}
              >
                Sign out
              </Button>
            </div>
          ) : null}
        </Section>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
      <h2
        id={headingId}
        style={{
          margin: 0,
          fontSize: "var(--micro-cap-size)",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--text-muted)",
          fontWeight: "var(--weight-medium)",
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}
