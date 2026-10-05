import { useEffect, useRef, useState, type RefObject } from "react";

/**
 * An element's own width, as it changes. `null` where the browser cannot say —
 * no `ResizeObserver`, as in tests — so the caller falls back to the viewport.
 *
 * The pipeline needs this rather than the viewport: the design system's row
 * needs about 790px, and whether it gets them depends on the sidebar and on
 * whether the detail panel is open, not on the window alone (T5.8).
 */
export function useElementWidth<T extends HTMLElement>(): [RefObject<T | null>, number | null] {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState<number | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setWidth(entry.contentRect.width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return [ref, width];
}
