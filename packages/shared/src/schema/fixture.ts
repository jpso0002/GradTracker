import { z } from "zod";
import { StageEnum } from "./stage.js";

/**
 * The labelled fixture corpus — the artefact SM-1, SM-2 and SM-3 are measured
 * against.
 *
 * Two files per fixture, sharing an id:
 *   fixtures/emails/NNN-slug.json    what the classifier sees
 *   fixtures/expected/NNN-slug.json  what it should say
 *
 * Kept in `shared` because both the fake Gmail adapter and the accuracy
 * harness read them, and a corpus format defined twice is a corpus format that
 * drifts.
 */

/** A fixture email. Mirrors `RawEmail` plus the fixture id.
 *
 *  `subject` and `body` exist here and ONLY here — in a test fixture on disk,
 *  never in the database and never in a log. That is the whole point of the
 *  retention boundary: the pipeline may read them, nothing may keep them. */
export const FixtureEmailSchema = z.object({
  id: z.string().regex(/^\d{3}-[a-z0-9-]+$/, "id must look like 041-deloitte-oa-invite"),
  gmailMessageId: z.string().min(1),
  gmailThreadId: z.string().min(1),
  receivedAt: z.string().datetime({ offset: true }),
  fromAddress: z.string().min(3),
  subject: z.string(),
  body: z.string().min(1),
});

export type FixtureEmail = z.infer<typeof FixtureEmailSchema>;

/** The hand-applied label. This is ground truth — if it is wrong, every
 *  accuracy figure derived from it is wrong, so it is validated on load. */
export const ExpectedClassificationSchema = z
  .object({
    isApplication: z.boolean(),
    company: z.string().nullable().default(null),
    role: z.string().nullable().default(null),
    stage: StageEnum.nullable().default(null),
    deadlineAt: z.string().datetime({ offset: true }).nullable().default(null),

    /**
     * Whether the email contains explicit deadline language — "by Friday 23
     * May", "within 5 business days", "before 11:59pm AEST".
     *
     * This is the DENOMINATOR for SM-3's ≥80% deadline-detection rate. Only
     * emails flagged true are counted, because an email with no deadline in it
     * cannot be scored on whether a deadline was extracted.
     */
    hasExplicitDeadlineLanguage: z.boolean().default(false),

    /** Why this fixture is in the corpus. Free text, for the human reading a
     *  failure report — especially valuable on hard negatives. */
    note: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    // A label that says "not an application" but also names a company is a
    // labelling mistake, and would silently corrupt precision and recall.
    if (!value.isApplication) {
      for (const field of ["company", "role", "stage", "deadlineAt"] as const) {
        if (value[field] !== null) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [field],
            message: `A non-application fixture must not label "${field}".`,
          });
        }
      }
      if (value.hasExplicitDeadlineLanguage) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["hasExplicitDeadlineLanguage"],
          message:
            "A non-application fixture cannot count toward the deadline-detection denominator.",
        });
      }
    }

    // If the label claims explicit deadline language, it must say what the
    // right answer is — otherwise the fixture cannot be scored.
    if (value.hasExplicitDeadlineLanguage && value.deadlineAt === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["deadlineAt"],
        message:
          "hasExplicitDeadlineLanguage is true but no deadlineAt was labelled — the fixture is unscoreable.",
      });
    }
  });

export type ExpectedClassification = z.infer<typeof ExpectedClassificationSchema>;

/** An email and its label, paired by id. */
export interface Fixture {
  email: FixtureEmail;
  expected: ExpectedClassification;
}
