/**
 * @gradtracker/server
 *
 * Scaffold only. The Express app lands in Phase 4 (T4.1); the domain pipeline
 * in Phase 3. This file exists so the workspace typechecks and so the import
 * of @gradtracker/shared is proven to resolve across the package boundary.
 *
 * Directory plan (implementation.md §3):
 *   db/         schema, migrations, seed          → T1.4, T1.7
 *   ports/      GmailClient, EmailClassifier      → T2.1
 *   adapters/   gmail/{live,fake}, classifier/…   → T2.2, T7.2, T7.3
 *   domain/     sync/ classify/ stages/ matching/ provenance/ ranking/
 *   routes/     auth, jobs, review, sync, settings → Phase 4
 *   middleware/ https, session, validate, rate-limit
 *   crypto/     token-cipher (AES-256-GCM)        → T4.3
 */

import { StageEnum, CONFIDENCE } from "@gradtracker/shared";

/** Proves the shared package resolves and is the single source of stage truth. */
export const SUPPORTED_STAGES = StageEnum.options;

export const DEFAULT_REVIEW_THRESHOLD = CONFIDENCE.DEFAULT_REVIEW_THRESHOLD;
