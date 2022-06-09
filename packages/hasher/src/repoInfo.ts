import path from "path";
import {
  WorkspaceInfo,
  ParsedLock,
  getWorkspaceRoot,
  getWorkspaces,
  parseLockFile,
} from "workspace-tools";

import { getPackageDeps } from "@rushstack/package-deps-hash";

export interface RepoInfo {
  root: string;
  workspaceInfo: WorkspaceInfo;
  parsedLock: ParsedLock;
  repoHashes: { [key: string]: string };
}

const repoInfoCache: RepoInfo[] = [];

/**
 * repoInfo cache lookup - it is specialized to be using a substring match to make it run as fast as possible
 * @param packageRoot
 */
function searchRepoInfoCache(packageRoot: string) {
  for (const repoInfo of repoInfoCache) {
    if (repoInfo.workspaceInfo && packageRoot.startsWith(repoInfo.root)) {
      return repoInfo;
    }
  }
}

export async function getRepoInfoNoCache(cwd: string) {
  const root = getWorkspaceRoot(cwd);
  if (!root) {
    throw new Error("Cannot initialize Repo class without a workspace root");
  }

  const repoHashes = Object.fromEntries(getPackageDeps(root));
  const workspaceInfo = getWorkspaces(root);

  /**
   * {
   *  "packages": {
   *    "experiences": {
   *       "react-web-client": ["hash1", "hash2", "hash3"]
   *     }
   *   }
   * }
   */
  interface PathNode {
    [key: string]: PathNode | string[];
  }

  const pathTree: PathNode = {};

  // Generate path tree of all packages in workspace (scale: ~2000 * ~3)
  for (const workspace of workspaceInfo) {
    const pathParts = path.normalize(workspace.path).split("/");
    let currentNode = pathTree;

    for (const part of pathParts) {
      if (!currentNode[part]) {
        currentNode[part] = {};
      }

      currentNode = currentNode[part] as {};
    }
  }

  // key: path/to/package (packageRoot), value: array of hashes
  const packageHashes: Record<string, string[]> = {};

  for (const [entry, value] of Object.entries(repoHashes)) {
    const pathParts = path.normalize(entry[0]).split("/");
    let node = pathTree;

    for (const part of pathParts) {
      node = node[part] as PathNode;
    }

    if (!node.values) {
      node.values = [];
    }

    node.values.push(value);
  }

  const parsedLock = await parseLockFile(root);

  const repoInfo = {
    root,
    workspaceInfo,
    parsedLock,
    repoHashes,
  };

  repoInfoCache.push(repoInfo);
  return repoInfo;
}

// A promise to guarantee the getRepoInfo is done one at a time
let oneAtATime: Promise<any> = Promise.resolve();

/**
 * Retrieves the repoInfo, one at a time
 *
 * No parallel of this function is allowed; this maximizes the cache hit even
 * though the getWorkspaces and parseLockFile are async functions from workspace-tools
 *
 * @param cwd
 */
export async function getRepoInfo(cwd: string): Promise<RepoInfo> {
  oneAtATime = oneAtATime.then(async () => {
    const searchResult = searchRepoInfoCache(cwd);
    if (searchResult) {
      return searchResult;
    }
    return getRepoInfoNoCache(cwd);
  });

  return oneAtATime;
}
