import { useCallback, useEffect, useRef, useState } from "react";
import { NetworkError } from "../api/client";
import { connectivity } from "../connectivity";

/**
 * One loading/error/data state machine, in one place.
 *
 * `offline` is separated from `error` deliberately: "we could not reach the
 * server" and "the server said no" are different situations with different
 * remedies, and the design system has a different surface for each — a banner
 * for the first, an error state for the second (app-flow.md §6).
 *
 * What was last loaded **stays** through a failed reload, so the pipeline is
 * still readable offline (T5.7). It does not survive a change of question: a
 * different tab or filter starts empty, so the previous answer is never shown
 * under the new one.
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
  const errorRef = useRef<Error | null>(null);
  const lastCallback = useRef<(() => Promise<T>) | null>(null);

  // The caller passes a fresh closure every render; `deps` is what decides
  // when the request actually re-runs.
  const callback = useCallback(run, deps);

  useEffect(() => {
    let cancelled = false;
    // A new question, not a reload: the old answer is not this one's.
    if (lastCallback.current !== null && lastCallback.current !== callback) setData(null);
    lastCallback.current = callback;
    setLoading(true);
    callback()
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setError(null);
        errorRef.current = null;
        connectivity.reportReachable();
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        const failure = cause instanceof Error ? cause : new Error(String(cause));
        setError(failure);
        errorRef.current = failure;
        if (failure instanceof NetworkError) connectivity.reportUnreachable();
        else connectivity.reportReachable();
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

  // "Try again" on the offline banner, or the browser coming back online,
  // re-runs whatever failed to reach the server.
  useEffect(
    () =>
      connectivity.onRetry(() => {
        if (errorRef.current instanceof NetworkError) reload();
      }),
    [reload],
  );

  return { data, loading, error, offline: error instanceof NetworkError, reload };
}
