import { useEffect } from "react";
import { visuallyHidden } from "./VisuallyHidden";

/**
 * Each view sets a document title and an `<h1>` (design.md §10.3, T6.5).
 *
 * The design system's `TopBar` draws the visible title as a `span`, and is not
 * ours to edit, so the heading is here for assistive technology — the page's
 * outline starts with what the student sees at the top of it.
 */
export function ViewTitle({ title }: { title: string }) {
  useEffect(() => {
    document.title = `${title} · GradTracker`;
  }, [title]);

  return <h1 style={visuallyHidden}>{title}</h1>;
}
