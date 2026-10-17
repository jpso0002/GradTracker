import type { SyncResult } from "@gradtracker/shared";

/**
 * What one Refresh did, in a sentence (D36): "2 new emails — 1 application
 * updated, 1 to review". Counts only, as the server sends them.
 */
export function syncSummary(result: SyncResult): string {
  if (result.emailsRead === 0) return "No new emails";

  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  const parts = [
    result.newApplications > 0 ? plural(result.newApplications, "new application", "new applications") : null,
    result.updatedApplications > 0
      ? `${plural(result.updatedApplications, "application", "applications")} updated`
      : null,
    result.needsReview > 0 ? `${result.needsReview} to review` : null,
    result.ignored > 0 ? `${result.ignored} not about an application` : null,
  ].filter((p): p is string => p !== null);

  return `${plural(result.emailsRead, "new email", "new emails")} — ${parts.join(", ")}`;
}
