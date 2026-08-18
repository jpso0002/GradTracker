import { useCallback, useEffect, useState } from "react";
import { NetworkError } from "../api/client";

/**
 * One loading/error/data state machine, in one place.
 *
 * `offline` is separated from `error` deliberately: "we could not reach the
 * server" and "the server said no" are different situations with different
 * remedies, and the design system has a different surface for each — a banner
 * for the first, an error state for the second (app-flow.md §6).
 */

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  offline: boolean;
  /** Re-runs the request. Safe to call from an event handler. */
  reload: () => void;
}

export function useAsync<T>(run: () => Promise<T>, deps: readonly unknown[]): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [nonce, setNonce] = useState(0);

  // The caller passes a fresh closure every render; `deps` is what decides
  // when the request actually re-runs.
  const callback = useCallback(run, deps);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    callback()
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(cause instanceof Error ? cause : new Error(String(cause)));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    // A response that arrives after the component moved on must not write to
    // it — otherwise a slow first request can overwrite a fast second one.
    return () => {
      cancelled = true;
    };
  }, [callback, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  return { data, loading, error, offline: error instanceof NetworkError, reload };
}
