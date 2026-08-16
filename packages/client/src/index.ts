/**
 * @gradtracker/client
 *
 * Scaffold only. Vite, React and the design-system integration land in T5.1;
 * the app shell in T5.2. This file proves the shared package resolves.
 */

import { StageEnum } from "@gradtracker/shared";
import type { Stage } from "@gradtracker/shared";

/** Rendered by StageBadge — the single source of stage colour. */
export const STAGES: readonly Stage[] = StageEnum.options;
