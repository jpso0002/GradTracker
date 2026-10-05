import type { Stage, UserId } from "@gradtracker/shared";
import type { Repository } from "../../db/repository.js";
import { decideStage } from "../stages/engine.js";
import { applyExtraction } from "../provenance/apply.js";

/**
 * Applying one email to an existing application (T3.11) — the only way an
 * email changes one. The pipeline calls it for a confident match; the review
 * queue calls it when the student says an email belongs to an application. One
 * function, so the two cannot drift apart: confirming an email onto an
 * application used to overwrite it as a human correction instead (C16).
 *
 * Emails do not arrive in order, and a review item can be confirmed days after
 * newer mail was processed. So:
 *
 *   - **Stage** goes through the stage engine — forward-only, human locks
 *     respected. An offer or rejection applies from any stage because the
 *     newest email is the truth, so an *older* one does not.
 *   - **Other fields** are written as AI with the email's confidence, skipping
 *     human locks — unless the email is older than the application's latest
 *     event, when they are history and left alone. An older email that moves
 *     the stage forward is the exception: its details describe that stage.
 *   - **`lastEventAt`** only ever moves forward.
 *
 * @see implementation.md §7.5–§7.7
 */

export interface AppliedEmail {
  receivedAt: Date;
  company: string | null;
  role: string | null;
  stage: Stage | null;
  deadlineAt: Date | null;
  nextAction: string | null;
  confidence: number;
}

export interface AppliedResult {
  stageChanged: boolean;
  /** Older than the application's latest event when it was applied. */
  stale: boolean;
}

export async function applyEmailToJob(
  repo: Repository,
  userId: UserId,
  jobId: string,
  email: AppliedEmail,
): Promise<AppliedResult> {
  const job = await repo.findJob(userId, jobId);
  if (!job) throw new Error(`No application ${jobId} for this user.`);

  const stale = email.receivedAt.getTime() < job.lastEventAt.getTime();

  const decision = decideStage({
    current: job.stage,
    detected: email.stage,
    humanLocked: await repo.isFieldLocked(userId, jobId, "stage"),
  });
  const stageChanged = decision.applies && !(stale && decision.reason === "always-applies");
  const detailsApply = !stale || stageChanged;

  await applyExtraction(
    repo,
    userId,
    jobId,
    {
      company: detailsApply ? email.company : null,
      role: detailsApply ? email.role : null,
      stage: stageChanged && decision.applies ? decision.stage : null,
      deadlineAt: detailsApply ? email.deadlineAt : null,
      nextAction: detailsApply ? email.nextAction : null,
    },
    email.confidence,
  );

  // `lastEventAt` advances on every newer email, including ones that changed
  // no field — an employer replying "still reviewing" is not a stale job.
  if (!stale) await repo.updateJob(userId, jobId, { lastEventAt: email.receivedAt });

  return { stageChanged, stale };
}
