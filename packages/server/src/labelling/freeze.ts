import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Freezing the held-out set (D32): a hash of every held-out file, written when
 * the set is made. `verifyManifest` proves later that nothing was added,
 * removed or edited — which is what "frozen before any model sees it" has to
 * mean, since a held-out set that changed after a model run is no longer
 * held-out.
 *
 * Kept apart from the spreadsheet code so the accuracy harness can check a
 * freeze without loading a spreadsheet library.
 */

export const MANIFEST = "MANIFEST.json";

function fileHashes(dir: string): Record<string, string> {
  const hashes: Record<string, string> = {};
  for (const sub of ["emails", "expected"]) {
    const subdir = join(dir, sub);
    if (!existsSync(subdir)) continue;
    for (const file of readdirSync(subdir).filter((f) => f.endsWith(".json")).sort()) {
      hashes[`${sub}/${file}`] = createHash("sha256").update(readFileSync(join(subdir, file))).digest("hex");
    }
  }
  return hashes;
}

const digestOf = (hashes: Record<string, string>) =>
  createHash("sha256")
    .update(Object.entries(hashes).map(([f, h]) => `${f}:${h}`).join("\n"))
    .digest("hex");

export function writeManifest(dir: string, sheet: string, seed: string): void {
  const files = fileHashes(dir);
  const manifest = {
    frozenAt: new Date().toISOString(),
    sheet,
    seed,
    fixtures: Object.keys(files).length / 2,
    digest: digestOf(files),
    files,
  };
  writeFileSync(join(dir, MANIFEST), JSON.stringify(manifest, null, 2) + "\n");
}

export interface Verification {
  ok: boolean;
  digest: string | null;
  problems: string[];
}

export function verifyManifest(dir: string): Verification {
  const path = join(dir, MANIFEST);
  if (!existsSync(path)) return { ok: false, digest: null, problems: [`no ${MANIFEST} in ${dir}`] };

  const manifest = JSON.parse(readFileSync(path, "utf8")) as { digest: string; files: Record<string, string> };
  const actual = fileHashes(dir);
  const problems: string[] = [];
  for (const [file, hash] of Object.entries(manifest.files)) {
    if (!(file in actual)) problems.push(`removed: ${file}`);
    else if (actual[file] !== hash) problems.push(`changed: ${file}`);
  }
  for (const file of Object.keys(actual)) {
    if (!(file in manifest.files)) problems.push(`added: ${file}`);
  }
  return { ok: problems.length === 0, digest: manifest.digest, problems };
}
