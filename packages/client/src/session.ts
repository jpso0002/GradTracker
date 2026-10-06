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
  } catch {
    // Nothing stored, nothing to remove.
  }
}
