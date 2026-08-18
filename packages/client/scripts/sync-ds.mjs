/**
 * Copies the GradTracker Design System into `src/ds/vendor/`.
 *
 * The system lives at the repository root, outside every package, and its
 * folder name contains a space. Rather than import across that boundary the
 * client keeps a synced copy — and `ds.sync.test.ts` fails if the copy drifts
 * from the source, so the copy cannot silently rot.
 *
 * Run: npm run sync:ds -w @gradtracker/client
 */
import { readdirSync, statSync, mkdirSync, copyFileSync, rmSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
export const SOURCE = join(here, "../../../GradTracker Design System");
export const TARGET = join(here, "../src/ds/vendor");

/** Only what the app renders. Guidelines, ui_kits, templates and uploads are
 *  reference material for humans and are deliberately not vendored. */
export const SYNCED = ["components", "tokens", "assets/logo", "styles.css"];

export function filesUnder(root, rel = "") {
  const abs = join(root, rel);
  if (!existsSync(abs)) return [];
  if (statSync(abs).isFile()) return [rel];
  return readdirSync(abs).flatMap((entry) => filesUnder(root, rel ? `${rel}/${entry}` : entry));
}

export function plannedFiles() {
  return SYNCED.flatMap((entry) => filesUnder(SOURCE, entry)).sort();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  rmSync(TARGET, { recursive: true, force: true });
  const files = plannedFiles();
  for (const rel of files) {
    const dest = join(TARGET, rel);
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(join(SOURCE, rel), dest);
  }
  console.log(`Synced ${files.length} design-system files into src/ds/vendor/.`);
}
