import path from "path";
import globby from "globby";
import { Logger } from "backfill-logger";
import { hashStrings } from "./helpers";
import { RepoInfo } from "./repoInfo";

/**
 * Generates a hash string based on files in a package
 *
 * This implementation relies on `git hash-object` to quickly calculate all files
 * in the repo, caching this result so repeated calls to this function will be
 * a simple lookup.
 *
 * Note: We have to force the types because globby types are wrong
 *
 * @param packageRoot The root of the package
 * @param globs Globs inside a package root to consider as part of the hash
 * @param logger An instance of backfill logger
 * @param repoInfo The repoInfo that carries information about repo-wide hashes
 */
export async function generateHashOfFiles(
  packageRoot: string,
  logger: Logger,
  repoInfo: RepoInfo
): Promise<string> {
  const { repoHashes, root } = repoInfo;

  const files = ((await globby("**", {
    cwd: packageRoot,
    onlyFiles: false,
    objectMode: true
  })) as unknown) as { path: string; dirent: { isDirectory(): boolean } }[];

  files.sort((a, b) => a.path.localeCompare(b.path));

  const hashes: string[] = [];

  for (const entry of files) {
    if (!entry.dirent.isDirectory()) {
      // if the entry is a file, use the "git hash-object" hash (which is a sha1 of path + size, but super fast, and potentially already cached)
      const normalized = (
        path
          .normalize(packageRoot)
          .replace(path.normalize(root), "")
          .replace(/\\/g, "/") +
        "/" +
        entry.path
      ).slice(1);

      if (!repoHashes[normalized]) {
        logger.warn(`cannot find file "${normalized}"`);
      } else {
        hashes.push(repoHashes[normalized]);
      }
    } else {
      // if the entry is a directory, just put the directory in the hashes
      hashes.push(entry.path);
    }
  }

  return hashStrings(hashes);
}
