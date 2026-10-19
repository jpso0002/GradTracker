import type { SyncResult, UserId } from "@gradtracker/shared";
import type { RawEmail } from "../../ports/index.js";
import { processEmail, type PipelineDeps } from "./pipeline.js";

/**
 * One Refresh (D36): a batch of emails through the pipeline, one at a time,
 * oldest first so stage progression comes out right.
 *
 * Each email is the same `processEmail` the harvest and the tests use — the
 * confidence gate, matching, stage engine and provenance all apply. An email
 * already processed costs nothing and is not counted, so pressing Refresh twice
 * changes nothing the second time.
 */
export async function ingestEmails(
  deps: PipelineDeps,
  userId: UserId,
  emails: RawEmail[],
  now: Date = new Date(),
): Promise<SyncResult> {
  const result: SyncResult = {
    emailsRead: 0,
    newApplications: 0,
    updatedApplications: 0,
    stageChanges: 0,
    needsReview: 0,
    ignored: 0,
    newOpenings: 0,
  };

  const ordered = [...emails].sort((a, b) => a.receivedAt.getTime() - b.receivedAt.getTime());
  for (const email of ordered) {
    const outcome = await processEmail(deps, userId, email);
    if (outcome.kind === "already-processed") continue;

    result.emailsRead += 1;
    switch (outcome.kind) {
      case "created-job":
        result.newApplications += 1;
        break;
      case "updated-job":
        result.updatedApplications += 1;
        if (outcome.stageChanged) result.stageChanges += 1;
        break;
      case "queued-for-review":
        result.needsReview += 1;
        break;
      case "openings":
        result.newOpenings += outcome.added;
        break;
      case "not-application":
      case "skipped":
        result.ignored += 1;
        break;
    }
  }

  const sync = await deps.repo.getSyncState(userId);
  await deps.repo.upsertSyncState(userId, {
    emailsReadTotal: (sync?.emailsReadTotal ?? 0) + result.emailsRead,
    lastFullScanAt: now,
    state: "idle",
    lastError: null,
  });

  return result;
}
