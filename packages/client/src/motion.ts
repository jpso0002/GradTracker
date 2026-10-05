/**
 * A motion token's duration in milliseconds, read from the stylesheet.
 *
 * For work that must wait for an animation — removing a review card once it
 * has faded — without a second, hard-coded duration that could disagree with
 * the token or ignore `prefers-reduced-motion`, which zeroes every duration
 * token (design.md §10.4). An unset token reads as 0: nothing to wait for.
 */
export function tokenDurationMs(name: `--dur-${string}`): number {
  if (typeof window === "undefined") return 0;
  const raw = window.getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const value = Number.parseFloat(raw);
  if (!Number.isFinite(value)) return 0;
  if (raw.endsWith("ms")) return value;
  return raw.endsWith("s") ? value * 1000 : 0;
}
