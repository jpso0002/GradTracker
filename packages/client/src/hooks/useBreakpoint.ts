import { useSyncExternalStore } from "react";

/**
 * The four layouts of design.md §11 (T5.8). The design system specifies fixed
 * desktop chrome and no breakpoints; these are GradTracker's own.
 *
 *   desktop        ≥1280  sidebar, detail panel inline
 *   small-desktop  1024–1279  sidebar, detail panel over the list
 *   tablet         768–1023  icon rail, detail panel over the list
 *   mobile         <768   bottom tab bar, cards, full-screen detail
 */
export type Breakpoint = "mobile" | "tablet" | "small-desktop" | "desktop";

const QUERIES: ReadonlyArray<[Breakpoint, string]> = [
  ["mobile", "(max-width: 767px)"],
  ["tablet", "(min-width: 768px) and (max-width: 1023px)"],
  ["small-desktop", "(min-width: 1024px) and (max-width: 1279px)"],
];

const supported = () => typeof window !== "undefined" && typeof window.matchMedia === "function";

function current(): Breakpoint {
  if (!supported()) return "desktop";
  for (const [name, query] of QUERIES) if (window.matchMedia(query).matches) return name;
  return "desktop";
}

function subscribe(onChange: () => void): () => void {
  if (!supported()) return () => {};
  const lists = QUERIES.map(([, query]) => window.matchMedia(query));
  for (const list of lists) list.addEventListener("change", onChange);
  return () => {
    for (const list of lists) list.removeEventListener("change", onChange);
  };
}

export function useBreakpoint(): Breakpoint {
  return useSyncExternalStore(subscribe, current, () => "desktop");
}

/** Below 1024px every control is a touch target: 44px at least (design.md §11). */
export function isTouch(breakpoint: Breakpoint): boolean {
  return breakpoint === "mobile" || breakpoint === "tablet";
}
