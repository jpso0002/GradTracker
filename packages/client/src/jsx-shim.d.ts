import type * as React from "react";

/**
 * React 19 removed the global `JSX` namespace; `@types/react` now exposes it as
 * `React.JSX`. The design system's `.d.ts` files were written against the older
 * global and declare `JSX.Element` returns.
 *
 * Rather than edit 26 vendored files — which `ds.sync.test.ts` would then flag
 * as drift — the global is aliased back. `JSX.Element` is the only member the
 * design system uses; verified by grep across `components/`.
 */
declare global {
  namespace JSX {
    type Element = React.JSX.Element;
  }
}

export {};
