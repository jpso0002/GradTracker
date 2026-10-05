import { Button, Icon } from "../ds";
import { connectivity, useOffline } from "../connectivity";

/**
 * "You're offline" (app-flow.md §7). A banner, not an error screen: what was
 * already loaded stays readable beneath it, because a student checking their
 * pipeline on a train still wants to see it.
 *
 * Polite, not assertive — losing the connection should not interrupt reading.
 */
export function OfflineBanner() {
  const offline = useOffline();
  if (!offline) return null;

  return (
    <div
      role="status"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-md)",
        padding: "var(--space-sm) var(--space-xl)",
        background: "var(--surface-sunken)",
        borderBottom: "1px solid var(--border-hairline)",
        color: "var(--text-body)",
        fontSize: "var(--body-tabular-size)",
      }}
    >
      <Icon name="wifi-off" size={16} />
      <span style={{ flex: 1 }}>You're offline. What you see may be out of date.</span>
      <Button variant="quiet" size="sm" onClick={() => connectivity.retry()}>
        Try again
      </Button>
    </div>
  );
}
