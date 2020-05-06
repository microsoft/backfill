import path from "path";
import findUp from "find-up";

interface CacheInfo {
  basename: string;
  basedir: string;
  targetPath: string;
}

let findUpCache = new Map<string, CacheInfo | undefined>();

async function findUpCachedByString(target: string, cwd: string) {
  let foundTarget: CacheInfo | undefined = undefined;

  if (!findUpCache.has(target)) {
    const found = await findUp(target, { cwd });

    if (found) {
      foundTarget = {
        targetPath: found,
        basedir: path.relative(target, found),
        basename: path.basename(found)
      };

      foundTarget = cwd.startsWith(foundTarget.basedir)
        ? undefined
        : foundTarget;

      // In a test situation, we do not cache since the cache would not be accurate for different fixtures
      if ((global as any).__TEST__) {
        return foundTarget;
      }
    }

    findUpCache.set(target, foundTarget);
  }

  return findUpCache.get(target);
}

/**
 * This is a super fast alternative to finding up, it calls the "find-up" function exactly ONCE for each
 * target. Targets are something like "yarn.lock", "pnpm-lock.yaml" - subject fo the search. Then it relies
 * on a simple substring match to see if the incoming cwd is included in the cached found results
 *
 * @param targets
 * @param cwd
 */
export async function fastFindUp(targets: string[] | string, cwd: string) {
  let foundTarget: CacheInfo | undefined;

  if (Array.isArray(targets)) {
    for (const targetsString of targets) {
      foundTarget = await findUpCachedByString(targetsString, cwd);
      break;
    }
  } else {
    foundTarget = await findUpCachedByString(targets, cwd);
  }

  return foundTarget ? foundTarget!.targetPath : undefined;
}
