import { useEffect, useId, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, EmptyState, Icon, Switch, TopBar } from "../ui";
import { nextPath } from "./AccountViews";
import { api, ApiError, NetworkError } from "../api/client";
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

export function SettingsView({ onReset }: { onReset?: () => void } = {}) {
  const settings = useAsync(() => api.getSettings(), []);
  const toast = useToast();
  const { theme, toggle } = useTheme();
  const [shortcuts, setShortcuts] = useShortcuts();
  const navigate = useNavigate();
  // Who is signed in (D40). A 404 means there are no demo accounts here — the
  // dev server's single local user — and the Account section is left out.
  const session = useAsync(() => api.session(), []);
  const account = session.data?.user ?? null;
  const [resetting, setResetting] = useState(false);

  const signOut = async () => {
    try {
      await api.signOut();
    } finally {
      navigate("/signin", { replace: true });
    }
  };

  // Back to the start of the presentation (D36, D40): this account's dashboard
  // emptied and its threshold at the default. The demo inbox's account then
  // scans again; mail already shown has to be sent again.
  const resetDemo = async () => {
    setResetting(true);
    try {
      await api.resetDemo();
      onReset?.();
      navigate(nextPath(await api.session()), { replace: true });
      setResetting(false);
    } catch (error) {
      setResetting(false);
      toast.show(
        error instanceof ApiError && error.status === 404
          ? "Reset works only in the presentation demo (npm run demo)."
          : error instanceof Error ? error.message : "Could not reset the demo",
        "error",
      );
    }
  };
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

  const user = account;
  const inbox = session.data?.canConnectInbox ? session.data.inbox ?? user?.email ?? null : null;
  const connected = Boolean(inbox && session.data?.scanned);

  return (
    <>
      <ViewTitle title="Settings" />
      <TopBar title="Settings" />
      <div className="gt-page" style={{ maxWidth: 1000 }}>
        <section className="gt-page-head" aria-label="About settings" style={{ paddingBottom: 24, borderBottom: "1px solid var(--line)", marginBottom: 0 }}>
          <div>
            <p className="gt-eyebrow">Account &amp; preferences</p>
            <h2>Settings</h2>
            <span className="lede">Manage how GradTracker connects, detects, and looks.</span>
          </div>
        </section>

        <div className="gt-settings-grid">
          <nav className="gt-settings-nav" aria-label="Settings sections">
            <a href="#settings-gmail">Gmail connection</a>
            <a href="#settings-detection">Detection</a>
            {user ? <a href="#settings-profile">Profile</a> : null}
            <a href="#settings-appearance">Appearance</a>
          </nav>

          <div className="gt-settings-main">
            <Section
              id="settings-gmail"
              title="Gmail connection"
              description="Your application pipeline updates from this inbox."
              badge={
                <span className={`gt-connected${connected ? "" : " off"}`}>
                  <i aria-hidden="true" />
                  {connected ? "Connected" : "Not connected"}
                </span>
              }
            >
              {inbox ? (
                <div className="gt-account-card">
                  <span className="gt-avatar large" aria-hidden="true">
                    {(inbox[0] ?? "?").toUpperCase()}
                  </span>
                  <span className="text">
                    <strong>{inbox}</strong>
                    <span>{connected ? "Read by GradTracker in this demo" : "Connect it from the sign-in walkthrough"}</span>
                  </span>
                  {user ? (
                    <Button variant="danger" size="sm" disabled={resetting} onClick={() => void resetDemo()}>
                      {resetting ? "Resetting…" : "Reset demo"}
                    </Button>
                  ) : null}
                </div>
              ) : (
                <div className="gt-account-card">
                  <span className="text">
                    <strong>No Gmail connected</strong>
                    <span>
                      {session.data?.inbox
                        ? `In the demo, only ${session.data.inbox} can connect Gmail, so this account's dashboard stays empty.`
                        : "In the demo, the inbox is the demo mailbox."}
                    </span>
                  </span>
                  {user ? (
                    <Button variant="quiet" size="sm" disabled={resetting} onClick={() => void resetDemo()}>
                      {resetting ? "Resetting…" : "Reset demo"}
                    </Button>
                  ) : null}
                </div>
              )}
              <div className="gt-note-row">
                <Icon name="lock" size={18} />
                <p>
                  <strong>Read-only access</strong>
                  <span>
                    GradTracker can read your email but can’t send, delete, or change it. Demo mode: the Google step is a
                    walkthrough, and Sync inbox reads the demo inbox. Reset demo empties this dashboard.
                  </span>
                </p>
              </div>
            </Section>

            <Section
              id="settings-detection"
              title="Detection confidence"
              description={
                <label htmlFor={sliderId}>How sure GradTracker must be before adding an application automatically</label>
              }
            >
              {settings.loading && !settings.data ? (
                <p style={{ margin: 0, color: "var(--muted)" }}>Loading…</p>
              ) : settings.error || threshold === null ? (
                <EmptyState
                  icon={settings.offline ? "wifi-off" : "triangle-alert"}
                  title={settings.offline ? "You are offline" : "Could not load your settings"}
                  description={settings.error?.message ?? "No settings were returned."}
                  action={<Button onClick={settings.reload}>Try again</Button>}
                  compact
                />
              ) : (
                <>
                  <div className="gt-slider-head">
                    <span aria-hidden="true">Review threshold</span>
                    {/* The slider announces its own value; this is the sighted copy. */}
                    <strong aria-hidden="true">{percent(threshold)}%</strong>
                  </div>
                  <input
                    id={sliderId}
                    className="gt-range"
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={threshold}
                    aria-valuetext={`${percent(threshold)}%`}
                    aria-describedby={helpId}
                    onChange={(e) => move(toHundredths(Number(e.target.value)))}
                  />
                  <div className="gt-range-labels" aria-hidden="true">
                    <span>More automatic</span>
                    <span>More review</span>
                  </div>
                  <div className="gt-note-row" style={{ marginTop: 16, alignItems: "center" }}>
                    <Icon name="sparkles" size={16} />
                    <p id={helpId}>
                      {consequence(threshold)} Applies to new mail only — applications already in your pipeline stay where
                      they are.
                    </p>
                  </div>
                </>
              )}
            </Section>

            {user ? (
              <Section id="settings-profile" title="Profile" description="The account you're signed in with.">
                <div className="gt-account-card" style={{ marginBottom: 0 }}>
                  <span className="gt-avatar large" aria-hidden="true">
                    {user.name
                      .trim()
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((w) => w[0]?.toUpperCase() ?? "")
                      .join("")}
                  </span>
                  <span className="text">
                    <strong>{user.name}</strong>
                    <span>Signed in as {user.email}</span>
                  </span>
                  <Button variant="quiet" size="sm" iconLeft="log-out" onClick={() => void signOut()}>
                    Sign out
                  </Button>
                </div>
              </Section>
            ) : null}

            <Section id="settings-appearance" title="Appearance" description="How GradTracker looks on this device.">
              <div style={{ display: "grid", gap: 18 }}>
                <Switch
                  checked={theme === "dark"}
                  onChange={() => toggle()}
                  label="Dark theme"
                  description="Light until you choose — the switch in the sidebar does the same."
                />
                <Switch
                  checked={shortcuts}
                  onChange={(on) => setShortcuts(on)}
                  label="Press / to search"
                  description="Turn this off if you use speech input or switch control — a stray slash would jump to the search box."
                />
              </div>
            </Section>
          </div>
        </div>
      </div>
    </>
  );
}

function Section({
  id,
  title,
  description,
  badge,
  children,
}: {
  id: string;
  title: string;
  description?: React.ReactNode;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  const headingId = useId();
  return (
    <section id={id} aria-labelledby={headingId} className="gt-card">
      <div className="gt-card-title">
        <div>
          <h2 id={headingId}>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
        {badge}
      </div>
      {children}
    </section>
  );
}
