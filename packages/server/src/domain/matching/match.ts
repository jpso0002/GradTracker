/**
 * Job identity and deduplication (T3.1).
 *
 * Deciding whether a new email belongs to an existing application or starts a
 * new one. The asymmetry matters: **over-merging is worse than duplicating.**
 * A duplicate is visible on the dashboard and the student can correct it; a
 * wrong merge silently destroys a real application's history and nobody finds
 * out until the deadline is missed. Every judgement call below leans towards
 * creating a new job.
 *
 * @see implementation.md §7.6
 */

/** Legal and geographic suffixes that carry no identity. Ordered longest-first
 *  so "pty ltd" is removed as a unit before "ltd" can match half of it. */
const COMPANY_NOISE = [
  "pty ltd",
  "pty limited",
  "limited",
  "holdings",
  "australia",
  "group",
  "corp",
  "inc",
  "llc",
  "ltd",
  "plc",
  "co",
];

/**
 * Reduces a company name to its matching key.
 *
 *   "Macquarie Group"        → "macquarie"
 *   "Deloitte Pty Ltd"       → "deloitte"
 *   "Bain & Company"         → "bain company"
 *
 * Note "Company" survives where "Co" does not — stripping it would collapse
 * "Bain & Company" into "bain", which is a different firm from Bain Capital.
 */
export function normaliseCompany(name: string): string {
  // Punctuation first, then collapse — "Pty. Ltd." becomes "pty  ltd" with a
  // double space, which the multi-word patterns below would otherwise miss,
  // stripping only "ltd" and leaving a stray "pty" behind.
  let out = name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ");

  for (const noise of COMPANY_NOISE) {
    out = out.replace(new RegExp(`\\b${noise}\\b`, "g"), " ");
  }

  return out.replace(/\s+/g, " ").trim();
}

/**
 * Boilerplate shared by almost every graduate role title. Stripped before
 * comparison because it is the *discriminating* part of a title that decides
 * whether two emails are about the same application.
 *
 * Without this, "Graduate Engineer" and "Graduate Trader" score 0.60 on raw
 * character bigrams — over the threshold — because the shared word "Graduate"
 * is most of both strings. Two entirely different applications at the same
 * employer would be merged into one, which is the exact failure this module is
 * built to avoid.
 */
const ROLE_BOILERPLATE = [
  "graduate",
  "programme",
  "program",
  "internship",
  "intern",
  "trainee",
  "entry level",
  "junior",
  "university",
  "student",
  "2026",
  "2027",
];

/** Reduces a role title to its distinguishing words. */
export function normaliseRole(role: string): string {
  let out = role
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ");

  for (const word of ROLE_BOILERPLATE) {
    out = out.replace(new RegExp(`\\b${word}\\b`, "g"), " ");
  }

  return out.replace(/\s+/g, " ").trim();
}

/**
 * Sørensen–Dice coefficient over character bigrams, 0 to 1.
 *
 * Character bigrams rather than word overlap because role titles vary by
 * inflection and word order more than by vocabulary: "Graduate Engineer" and
 * "Engineering Graduate" are the same role, and a word-set comparison would
 * score them poorly.
 */
export function diceCoefficient(a: string, b: string): number {
  return rawDice(a, b);
}

/**
 * Role similarity — Dice over the *distinguishing* part of each title.
 *
 * Falls back to the full titles when stripping boilerplate empties both sides,
 * so "Graduate Program" and "Graduate Programme" still compare sensibly rather
 * than becoming two empty strings.
 */
export function roleSimilarity(a: string, b: string): number {
  const left = normaliseRole(a);
  const right = normaliseRole(b);

  if (left === "" && right === "") return rawDice(a, b);
  return rawDice(left, right);
}

function rawDice(a: string, b: string): number {
  const left = bigrams(a);
  const right = bigrams(b);

  if (left.length === 0 && right.length === 0) return a === b ? 1 : 0;
  if (left.length === 0 || right.length === 0) return 0;

  // Multiset intersection — a repeated bigram may only be matched once.
  const pool = new Map<string, number>();
  for (const gram of left) pool.set(gram, (pool.get(gram) ?? 0) + 1);

  let shared = 0;
  for (const gram of right) {
    const remaining = pool.get(gram) ?? 0;
    if (remaining > 0) {
      shared += 1;
      pool.set(gram, remaining - 1);
    }
  }

  return (2 * shared) / (left.length + right.length);
}

function bigrams(value: string): string[] {
  const cleaned = value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const out: string[] = [];
  for (let i = 0; i < cleaned.length - 1; i += 1) {
    out.push(cleaned.slice(i, i + 2));
  }
  return out;
}

/** Roles this similar are treated as the same role. */
export const ROLE_SIMILARITY_THRESHOLD = 0.6;

export interface MatchCandidate {
  id: string;
  /** Already normalised on the job row. If the student corrected the company,
   *  this holds the corrected value — which is what makes a correction persist
   *  operationally: later emails match against the human answer, not the AI's. */
  companyNormalised: string;
  role: string;
  senderDomain: string | null;
}

export interface MatchInput {
  company: string;
  role: string;
  senderDomain: string | null;
}

export type MatchReason = "role-similarity" | "sender-domain";

export interface Match {
  candidate: MatchCandidate;
  reason: MatchReason;
  roleSimilarity: number;
}

/**
 * Finds the existing job an email belongs to, or null to start a new one.
 *
 * Company must match exactly after normalisation. Then either the role is
 * similar enough, or the sender domain already belongs to a job at that
 * company — the second rule catches an employer who renames a role mid-process
 * ("Graduate Engineer" becoming "Software Engineer, Graduate").
 */
export function findMatch(input: MatchInput, candidates: MatchCandidate[]): Match | null {
  const company = normaliseCompany(input.company);
  if (company === "") return null;

  const sameCompany = candidates.filter((c) => c.companyNormalised === company);
  if (sameCompany.length === 0) return null;

  const scored = sameCompany
    .map((candidate) => ({
      candidate,
      roleSimilarity: roleSimilarity(input.role, candidate.role),
    }))
    .sort((a, b) => b.roleSimilarity - a.roleSimilarity);

  const best = scored[0]!;

  if (best.roleSimilarity >= ROLE_SIMILARITY_THRESHOLD) {
    return { candidate: best.candidate, reason: "role-similarity", roleSimilarity: best.roleSimilarity };
  }

  // Fall back to sender domain — but only when it is set on both sides.
  // A null domain must never match another null: "unknown" is not an identity,
  // and treating it as one is precisely how unrelated applications get merged.
  if (input.senderDomain !== null) {
    const byDomain = scored.find((s) => s.candidate.senderDomain === input.senderDomain);
    if (byDomain) {
      return {
        candidate: byDomain.candidate,
        reason: "sender-domain",
        roleSimilarity: byDomain.roleSimilarity,
      };
    }
  }

  return null;
}
