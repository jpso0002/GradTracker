import { existsSync, realpathSync } from "node:fs";
import { dirname, join, relative, resolve, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * The labelling toolkit's one hard rule: **nothing containing real email
 * content is written inside the repository.** Spreadsheets and fixture files
 * made from a real inbox hold subjects and bodies; committing one would publish
 * a teammate's mail. The harvest file followed the same rule by convention —
 * here it is enforced.
 */

/** Same depth from `src/` and `dist/`, as the corpus loader relies on. */
export const REPOSITORY_ROOT = resolve(
  join(dirname(fileURLToPath(import.meta.url)), "../../../.."),
);

export class InsideRepositoryError extends Error {
  constructor(target: string) {
    super(
      `Refusing to write ${target}: it is inside the GradTracker repository.\n` +
        "Files made from real email contain subjects and bodies, and must live outside it —\n" +
        "for example in your Documents folder or the team's private Drive.",
    );
    this.name = "InsideRepositoryError";
  }
}

/** Throws unless `target` lies outside the repository. Resolves symlinks and
 *  junctions on the part of the path that exists, so a link pointing back into
 *  the repository cannot slip past. */
export function assertOutsideRepository(target: string, root: string = REPOSITORY_ROOT): void {
  const resolvedTarget = canonical(resolve(target));
  const resolvedRoot = canonical(root);

  const rel = relative(fold(resolvedRoot), fold(resolvedTarget));
  const inside = rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
  if (inside) throw new InsideRepositoryError(target);
}

/** Windows paths are case-insensitive: D:\GITHUB and d:\github are one place. */
function fold(path: string): string {
  return process.platform === "win32" ? path.toLowerCase() : path;
}

/** The real path of the deepest existing ancestor, with the rest re-appended. */
function canonical(path: string): string {
  let existing = path;
  const rest: string[] = [];
  while (!existsSync(existing)) {
    const parent = dirname(existing);
    if (parent === existing) return path;
    rest.unshift(existing.slice(parent.length).replace(/^[\\/]/, ""));
    existing = parent;
  }
  return join(realpathSync.native(existing), ...rest);
}
