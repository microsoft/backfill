import path from "path";
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
 * @param repoInfo The repoInfo that carries information about repo-wide hashes
 */
export async function generateHashOfFiles(
  packageRoot: string,
  repoInfo: RepoInfo
): Promise<string> {
  const { packageHashes } = repoInfo;

  const hashes: string[] = [];
  const packageRelativeRoot = path.relative(repoInfo.root, packageRoot);

  for (const hash of packageHashes[packageRelativeRoot]) {
    hashes.push(hash[0], hash[1]);
  }

  return hashStrings(hashes);
}
