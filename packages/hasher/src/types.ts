import type { PackageInfos, ParsedLock } from "workspace-tools";

/** Mapping from repo-relative path (forward slashes) to hash for every file in the repo */
export type RepoHashes = Record<string, string>;

/**
 * Mapping from repo-relative package path to list of hashes for files in the package,
 * in the form `[repo-relative path, hash]` (all with forward slashes)
 */
export type PackageHashes = Record<string, [string, string][]>;

export interface RepoInfo {
  root: string;
  packageInfos: PackageInfos;
  parsedLock: ParsedLock;
  /** Mapping from repo-relative path (forward slashes) to hash for every file in the repo */
  repoHashes: RepoHashes;
  /**
   * Mapping from repo-relative package path to list of hashes for files in the package,
   * in the form `[repo-relative path, hash]` (all with forward slashes)
   */
  packageHashes: PackageHashes;
}
