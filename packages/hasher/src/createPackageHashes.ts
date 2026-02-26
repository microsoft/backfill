import path from "path";
import type { PackageInfos } from "workspace-tools";
import type { PackageHashes, RepoHashes } from "./types";

/**
 * This is a trie that looks like this:
 * {
 *  "packages": {
 *    "experiences": {
 *       "react-web-client": {}
 *     }
 *   }
 * }
 */
interface PathNode {
  [key: string]: PathNode;
}

/**
 * Reformat `repoHashes` into a mapping of hashes for files in each package.
 * @param root Repo root
 * @param packageInfos Repo packages
 * @param repoHashes Mapping from relative file path in the repo to its hash
 * @returns Mapping from repo-relative package path to list of hashes for files in the package,
 * in the form `[repo-relative path, hash]` (all with forward slashes)
 */
export function createPackageHashes(
  root: string,
  packageInfos: PackageInfos,
  repoHashes: RepoHashes
): PackageHashes {
  const pathTree: PathNode = {};

  // Generate path tree of all packages in workspace (scale: ~2000 * ~3)
  for (const packageInfo of Object.values(packageInfos)) {
    const pathParts = path
      .relative(root, path.dirname(packageInfo.packageJsonPath))
      .split(/[\\/]/);

    let currentNode = pathTree;

    for (const part of pathParts) {
      currentNode[part] ??= {};
      currentNode = currentNode[part];
    }
  }

  // key: path/to/package (packageRoot), value: array of a tuple of [file, hash]
  const packageHashes: PackageHashes = {};

  for (const [entry, value] of Object.entries(repoHashes)) {
    const pathParts = entry.split(/[\\/]/);

    let node = pathTree;
    const packagePathParts: string[] = [];

    for (const part of pathParts) {
      if (node[part]) {
        node = node[part];
        packagePathParts.push(part);
      } else {
        break;
      }
    }

    const packageRoot = packagePathParts.join("/");
    packageHashes[packageRoot] = packageHashes[packageRoot] || [];
    packageHashes[packageRoot].push([entry, value]);
  }

  return packageHashes;
}
