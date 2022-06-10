import path, { sep } from "path";
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
  const { repoHashes, root, packageHashes } = repoInfo;

  const hashes: string[] = [];
  const packageRelativeRoot = path.relative(root, packageRoot);

  if (packageHashes[packageRelativeRoot]) {
    // Fast path
    for (const hash of packageHashes[packageRelativeRoot]) {
      hashes.push(hash[0], hash[1]);
    }
    return hashStrings(hashes);
  } else {
    // Slow old path
    const normalized = path.normalize(packageRoot) + sep;

    const files: string[] = Object.keys(repoHashes).filter((f) =>
      path.join(root, f).includes(normalized)
    );

    files.sort((a, b) => a.localeCompare(b));

    const hashes: string[] = [];

    for (const file of files) {
      hashes.push(file, repoHashes[file]);
    }

    return hashStrings(hashes);
  }
}
