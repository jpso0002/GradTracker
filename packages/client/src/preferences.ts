import { useCallback, useSyncExternalStore } from "react";

/**
 * Whether single-key shortcuts — "/" to search — are on (WCAG 2.1.4, T6.5).
 *
 * A one-character shortcut can be set off by speech input saying a word with a
 * slash in it, so it must be possible to turn off. On by default; kept in this
 * browser, like the theme, because it is about the device and how it is used.
 */

const KEY = "gradtracker.shortcuts";
const listeners = new Set<() => void>();

function read(): boolean {
  try {
    return window.localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useShortcuts(): [boolean, (on: boolean) => void] {
  const on = useSyncExternalStore(subscribe, read, () => true);
  const set = useCallback((next: boolean) => {
    try {
      window.localStorage.setItem(KEY, next ? "on" : "off");
    } catch {
      // Storage refused (a private window): the switch still works this visit.
    }
    for (const listener of listeners) listener();
  }, []);
  return [on, set];
}
