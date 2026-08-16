/**
 * @gradtracker/shared — the single source of type truth.
 *
 * Every type crossing the client/server boundary is defined here as a Zod
 * schema and inferred, never redeclared on either side (rules.md → Architecture).
 */

export * from "./schema/stage.js";
export * from "./schema/classification.js";
export * from "./schema/job.js";
export * from "./schema/api.js";
export * from "./schema/fixture.js";
