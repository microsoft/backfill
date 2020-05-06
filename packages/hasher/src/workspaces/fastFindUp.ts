import path from "path";
import findUp from "find-up";

const findUpCache = new Map<string, string | undefined>();
const DELIMITER = "#@$#@";

/**
 * This is a super fast alternative to finding up, it calls the "find-up" function exactly ONCE for each
 * target. Targets are something like "yarn.lock", "pnpm-lock.yaml" - subject fo the search. Then it relies
 * on a simple substring match to see if the incoming cwd is included in the cached found results
 *
 * @param targets
 * @param cwd
 */
export async function fastFindUp(targets: string[] | string, cwd: string) {
  let foundTarget: string | undefined;
  let key = Array.isArray(targets) ? targets.join(DELIMITER) : targets;

  if (findUpCache.has(key)) {
    foundTarget = findUpCache.get(key)!;
  } else {
    foundTarget = await findUp(targets, { cwd });

    if (foundTarget) {
      foundTarget = path.dirname(foundTarget);
    }

    findUpCache.set(key, foundTarget);
  }

  if (foundTarget) {
    return cwd.startsWith(foundTarget) ? null : foundTarget;
  }

  return null;
}
