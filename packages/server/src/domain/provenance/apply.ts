import type { ExtractableField, Stage, UserId } from "@gradtracker/shared";
import type { Repository, JobPatch } from "../../db/repository.js";
import { normaliseCompany } from "../matching/match.js";

/**
 * The provenance write path (T3.3) — the mechanism behind SM-7.
 *
 * "The correction persists across syncs" is not a promise, a convention, or a
 * comment. It is this function refusing to write. Every field the pipeline
 * wants to change passes through here, and a field the student has corrected
 * is skipped no matter what a later email says.
 *
 * The rule is deliberately in one place. Scattered across the pipeline it
 * would be forgotten exactly once, by someone in a hurry, and the failure
 * would be silent — a student's correction quietly reverting, which is the
 * thing most likely to make them stop trusting the product entirely.
 *
 * @see implementation.md §7.7
 */

export interface ExtractedFields {
  company: string | null;
  role: string | null;
  stage: Stage | null;
  deadlineAt: Date | null;
  nextAction: string | null;
}

export interface ApplyResult {
  /** Fields actually written. */
  written: ExtractableField[];
  /** Fields skipped because the student had corrected them. */
  skippedHumanLocked: ExtractableField[];
  /** Fields the classifier had nothing to say about. */
  skippedNoValue: ExtractableField[];
}

/** Maps an extractable field to the job column it writes. */
const FIELD_TO_PATCH: Record<ExtractableField, keyof JobPatch> = {
  company: "company",
  role: "role",
  stage: "stage",
  deadline_at: "deadlineAt",
  next_action: "nextAction",
};

/**
 * Applies a classification to a job, honouring human locks.
 *
 * Reads provenance once and builds a single patch, rather than issuing a write
 * per field: the point of SM-7 is that a correction survives, and a
 * half-applied extraction interrupted between two writes would leave a job in
 * a state no email ever described.
 */
export async function applyExtraction(
  repo: Repository,
  userId: UserId,
  jobId: string,
  extracted: ExtractedFields,
  confidence: number,
): Promise<ApplyResult> {
  const result: ApplyResult = {
    written: [],
    skippedHumanLocked: [],
    skippedNoValue: [],
  };

  const values: Record<ExtractableField, string | Stage | Date | null> = {
    company: extracted.company,
    role: extracted.role,
    stage: extracted.stage,
    deadline_at: extracted.deadlineAt,
    next_action: extracted.nextAction,
  };

  const patch: JobPatch = {};

  for (const field of Object.keys(FIELD_TO_PATCH) as ExtractableField[]) {
    const value = values[field];

    if (value === null) {
      result.skippedNoValue.push(field);
      continue;
    }

    // ── SM-7 is enforced on this line ─────────────────────────────────────
    if (await repo.isFieldLocked(userId, jobId, field)) {
      result.skippedHumanLocked.push(field);
      continue;
    }

    Object.assign(patch, { [FIELD_TO_PATCH[field]]: value });

    // The matching key must move with the company, or a corrected job stops
    // matching its own future emails.
    if (field === "company" && typeof value === "string") {
      patch.companyNormalised = normaliseCompany(value);
    }

    result.written.push(field);
  }

  if (result.written.length > 0) {
    await repo.updateJob(userId, jobId, patch);
    for (const field of result.written) {
      await repo.setProvenance(userId, jobId, field, "ai", confidence);
    }
  }

  return result;
}

/**
 * Records a student's correction. The only path that may overwrite a
 * human-locked field — because the human is the one doing it.
 *
 * Confidence is cleared rather than kept: a confidence score attached to a
 * value a person typed is meaningless, and showing one would suggest the
 * system is unsure about something it was told.
 */
export async function applyCorrection(
  repo: Repository,
  userId: UserId,
  jobId: string,
  corrections: Partial<ExtractedFields>,
): Promise<ExtractableField[]> {
  const patch: JobPatch = {};
  const corrected: ExtractableField[] = [];

  const entries: [ExtractableField, unknown][] = [
    ["company", corrections.company],
    ["role", corrections.role],
    ["stage", corrections.stage],
    ["deadline_at", corrections.deadlineAt],
    ["next_action", corrections.nextAction],
  ];

  for (const [field, value] of entries) {
    if (value === undefined) continue;

    Object.assign(patch, { [FIELD_TO_PATCH[field]]: value });

    if (field === "company" && typeof value === "string") {
      patch.companyNormalised = normaliseCompany(value);
    }

    corrected.push(field);
  }

  if (corrected.length === 0) return [];

  await repo.updateJob(userId, jobId, patch);
  for (const field of corrected) {
    await repo.setProvenance(userId, jobId, field, "human", null);
  }

  return corrected;
}
