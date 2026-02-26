import {
  getWorkspaceManagerRoot,
  parseLockFile,
  type PackageInfos,
  getWorkspaceInfos,
} from "workspace-tools";

import { getFileHashes } from "./getFileHashes";
import { createPackageHashes } from "./createPackageHashes";
import type { RepoHashes, RepoInfo } from "./types";

const repoInfoCache: RepoInfo[] = [];

/**
 * Calculate the repo info for `cwd`.
 * Note that this DOES update the cache at the end; it just doesn't check for a cached result first.
 */
export async function getRepoInfoNoCache(cwd: string): Promise<RepoInfo> {
  const root = getWorkspaceManagerRoot(cwd);

  if (!root) {
    throw new Error("Cannot initialize Repo class without a workspace root");
  }

  const unorderedRepoHashes = getFileHashes(root);

  // Sorting repoHash by key because we want to consistent hashing based on the order of the files.
  // (Just use basic sorting instead of localeCompare since all that matters is stability.
  // There might be a lot of files, so use plain loops instead of function helpers.)
  const sortedFiles = Object.keys(unorderedRepoHashes).sort();
  const repoHashes: RepoHashes = {};
  for (const file of sortedFiles) {
    repoHashes[file] = unorderedRepoHashes[file];
  }

  // Use getWorkspaceInfos to exclude the root package (it will return undefined if not a monorepo),
  // but convert into PackageInfos format because this works better for subsequent usage.
  const workspaceInfos = getWorkspaceInfos(root) || [];
  const packageInfos: PackageInfos = {};
  for (const info of workspaceInfos) {
    packageInfos[info.name] = info.packageJson;
  }

  const parsedLock = await parseLockFile(root);
  const packageHashes = createPackageHashes(root, packageInfos, repoHashes);

  const repoInfo: RepoInfo = {
    root,
    packageInfos,
    parsedLock,
    repoHashes,
    packageHashes,
  };

  repoInfoCache.push(repoInfo);

  return repoInfo;
}

/** A promise to guarantee the getRepoInfo is done one at a time */
let oneAtATime: Promise<any> = Promise.resolve();

/**
 * Get the repo info for `cwd`.
 * This function internally prevents parallel calls to maximize cache hits.
 */
export async function getRepoInfo(cwd: string): Promise<RepoInfo> {
  oneAtATime = oneAtATime.then(
    () =>
      repoInfoCache.find((repoInfo) => cwd.startsWith(repoInfo.root)) ||
      getRepoInfoNoCache(cwd)
  );

  return oneAtATime;
}
