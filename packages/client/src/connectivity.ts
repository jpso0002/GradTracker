import { useSyncExternalStore } from "react";

/**
 * Whether GradTracker can reach its server (T5.7, app-flow.md §7 "Offline").
 *
 * Two signals, because they fail differently: the browser's own `online` flag,
 * and whether the last request reached the server at all. Either one down is
 * "offline" to the student — what is on screen may be out of date.
 *
 * Views keep what they last loaded, so the pipeline stays readable under the
 * banner; `retry()` asks everything that failed to reach the server to try
 * again, and the browser coming back online does the same by itself.
 */

type Listener = () => void;

let serverUnreachable = false;
let browserOffline = typeof navigator !== "undefined" && navigator.onLine === false;
const listeners = new Set<Listener>();
const retryListeners = new Set<Listener>();

function emit(): void {
  for (const listener of listeners) listener();
}

export const connectivity = {
  reportUnreachable(): void {
    if (serverUnreachable) return;
    serverUnreachable = true;
    emit();
  },

  reportReachable(): void {
    if (!serverUnreachable) return;
    serverUnreachable = false;
    emit();
  },

  isOffline(): boolean {
    return serverUnreachable || browserOffline;
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  /** Every request that failed to reach the server runs again. */
  retry(): void {
    for (const listener of retryListeners) listener();
  },

  onRetry(listener: Listener): () => void {
    retryListeners.add(listener);
    return () => retryListeners.delete(listener);
  },

  /** Tests only: a fresh state between renders. */
  reset(): void {
    serverUnreachable = false;
    browserOffline = false;
    emit();
  },
};

if (typeof window !== "undefined") {
  window.addEventListener("offline", () => {
    browserOffline = true;
    emit();
  });
  window.addEventListener("online", () => {
    browserOffline = false;
    emit();
    connectivity.retry();
  });
}

export function useOffline(): boolean {
  return useSyncExternalStore(connectivity.subscribe, connectivity.isOffline, () => false);
}
