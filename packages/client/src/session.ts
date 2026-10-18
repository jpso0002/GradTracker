/**
 * Whether the student has been through the simulated sign-in this session
 * (D35). Not authentication — demo mode has none (T4.1–T4.3 are deferred) —
 * only where the app opens: on the Connect screen until the walkthrough is
 * done, then on the dashboard. Kept for the browser tab, so a new tab, or
 * "Sign out" in Settings, starts the walkthrough again.
 */

const KEY = "gradtracker.demoSignedIn";

export function isSignedIn(): boolean {
  try {
    return window.sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function signIn(): void {
  try {
    window.sessionStorage.setItem(KEY, "1");
  } catch {
    // Storage refused (a private window): the app still opens; it just asks again.
  }
}

export function signOut(): void {
  try {
    window.sessionStorage.removeItem(KEY);
    window.sessionStorage.removeItem(PROFILE_KEY);
  } catch {
    // Nothing stored, nothing to remove.
  }
}

/**
 * The account made on the mock "Create your account" screen (D39): a name and
 * an email, kept for the tab so later steps can greet the student. Never the
 * password — the screen does not keep it — and never sent anywhere: no account
 * is created.
 */
export interface DemoProfile {
  name: string;
  email: string;
}

const PROFILE_KEY = "gradtracker.demoProfile";

export function saveProfile(profile: DemoProfile): void {
  try {
    window.sessionStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // Storage refused: the walkthrough carries on without a greeting.
  }
}

export function readProfile(): DemoProfile | null {
  try {
    const raw = window.sessionStorage.getItem(PROFILE_KEY);
    const value: unknown = raw ? JSON.parse(raw) : null;
    if (value && typeof value === "object" && "name" in value && "email" in value) {
      const { name, email } = value as Record<string, unknown>;
      if (typeof name === "string" && typeof email === "string") return { name, email };
    }
  } catch {
    // Unreadable: treated as no account yet.
  }
  return null;
}
