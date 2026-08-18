import { EmptyState, TopBar } from "../ds";

/**
 * A surface that exists in the navigation but has no design yet.
 *
 * design.md §9: blank means blank. The alternative — a plausible-looking
 * placeholder — reads as a feature that is broken rather than one that has not
 * been built, which is worse for both the student and the marker.
 */
export function BlankView({
  title,
  icon,
  description,
}: {
  title: string;
  icon: string;
  description: string;
}) {
  return (
    <>
      <TopBar title={title} />
      <div style={{ padding: "var(--space-xl)" }}>
        <EmptyState icon={icon} title={title} description={description} />
      </div>
    </>
  );
}
