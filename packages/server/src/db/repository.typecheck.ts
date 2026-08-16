import type { UserId } from "@gradtracker/shared";
import type { Repository } from "./repository.js";

/**
 * T1.6's done-when: *omitting `userId` is a compile error, not a runtime bug.*
 *
 * A runtime test cannot prove that — code that fails to compile never runs. So
 * this file asserts it at the type level using `@ts-expect-error`, which
 * inverts the usual direction: if the line below it compiles **successfully**,
 * TypeScript reports "Unused '@ts-expect-error' directive" and `npm run
 * typecheck` fails. The guarantee is therefore checked in CI on every build.
 *
 * This file is deliberately NOT named `*.test.ts`: test files are excluded
 * from the tsconfig, so a type assertion placed in one would never be checked.
 * Nothing here executes — every binding is `declare`d, so the emitted JavaScript
 * is empty.
 */

declare const repo: Repository;
declare const userId: UserId;
declare const jobId: string;
declare const plainString: string;

export function assertUserIdCannotBeOmitted(): void {
  // @ts-expect-error — a repository call with no userId must not compile.
  void repo.listJobs();

  // @ts-expect-error — findJob requires the userId before the job id.
  void repo.findJob(jobId);

  // @ts-expect-error — listEventsForJob cannot be called with only a job id.
  void repo.listEventsForJob(jobId);

  // @ts-expect-error — listPendingReview is user-scoped and takes no default.
  void repo.listPendingReview();

  // @ts-expect-error — getSyncState is user-scoped.
  void repo.getSyncState();
}

export function assertUserIdMustBeBranded(): void {
  // A plain string is not a UserId. This is what stops an unauthenticated
  // value — a route parameter, a body field, a company name — being passed
  // where a scoping key is required.

  // @ts-expect-error — an arbitrary string is not a UserId.
  void repo.listJobs(plainString);

  // @ts-expect-error — argument order cannot be swapped silently.
  void repo.findJob(jobId, userId);

  // @ts-expect-error — a literal is not a UserId either.
  void repo.getSyncState("some-user-id");
}

export function assertCorrectUsageCompiles(): void {
  // The positive control. If these ever stop compiling, the assertions above
  // are passing for the wrong reason.
  void repo.listJobs(userId);
  void repo.listJobs(userId, { status: "active" });
  void repo.findJob(userId, jobId);
  void repo.listEventsForJob(userId, jobId);
  void repo.listPendingReview(userId);
  void repo.getSyncState(userId);
  void repo.isFieldLocked(userId, jobId, "company");
}
