import {
  WorkspaceInfo,
  ParsedLock,
  findGitRoot,
  getWorkspaces,
  parseLockFile
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
  const root = findGitRoot(cwd);
  if (!root) {
    throw new Error("Cannot initialize Repo class without a .git root");
  }

  const repoHashes = getPackageDeps(root).files;
  const workspaceInfo = await getWorkspaces(root);
  const parsedLock = await parseLockFile(root);

  const repoInfo = {
    root,
    workspaceInfo,
    parsedLock,
    repoHashes
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
