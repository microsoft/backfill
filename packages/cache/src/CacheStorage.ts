import { dirname, relative } from "path";
import globby from "globby";
import findUp from "find-up";
import { getPackageDeps } from "@rushstack/package-deps-hash";

import { Logger } from "backfill-logger";
import { ICacheStorage } from "backfill-config";

const savedHashOfRepos: { [gitRoot: string]: { [file: string]: string } } = {};

function getRepoRoot(cwd: string): string {
  // .git is typically a folder but will be a file in a worktree
  const nearestGitInfo =
    findUp.sync(".git", { cwd, type: "directory" }) ||
    findUp.sync(".git", { cwd, type: "file" });
  if (!nearestGitInfo) {
    throw new Error(
      "The location that backfill is being run against is not in a git repo"
    );
  }

  return dirname(nearestGitInfo);
}

function fetchHashesFor(cwd: string) {
  const gitRoot = getRepoRoot(cwd);

  savedHashOfRepos[gitRoot] ||
    (savedHashOfRepos[gitRoot] = Object.fromEntries(getPackageDeps(gitRoot)));
}

function getMemoizedHashesFor(cwd: string): { [file: string]: string } {
  fetchHashesFor(cwd);

  const gitRoot = getRepoRoot(cwd);

  const savedHashOfThisRepo = savedHashOfRepos[gitRoot] as {
    [file: string]: string;
  };

  const pathRelativeToRepo = relative(gitRoot, cwd);

  const filesInCwd = Object.keys(savedHashOfThisRepo).filter(
    (o) => !relative(pathRelativeToRepo, o).startsWith("..")
  );

  const results: { [key: string]: string } = {};
  for (const file in filesInCwd) {
    results[relative(pathRelativeToRepo, file).replace(/\\/g, "/")] =
      savedHashOfThisRepo[file];
  }

  return results;
}

export { ICacheStorage };

export abstract class CacheStorage implements ICacheStorage {
  public constructor(protected logger: Logger, protected cwd: string) {}
  public async fetch(hash: string): Promise<boolean> {
    const tracer = this.logger.setTime("fetchTime");

    const result = await this._fetch(hash);

    tracer.stop();

    this.logger.setHit(result);

    // Save hash of files if not already memoized
    fetchHashesFor(this.cwd);

    return result;
  }

  public async put(hash: string, outputGlob: string[]): Promise<void> {
    const tracer = this.logger.setTime("putTime");

    const filesMatchingOutputGlob = await globby(outputGlob, { cwd: this.cwd });

    // Get the list of files that have not changed so we don't need to cache them.
    const hashesNow = Object.fromEntries(getPackageDeps(this.cwd));
    const hashesThen = getMemoizedHashesFor(this.cwd);
    const unchangedFiles = Object.keys(hashesThen).filter(
      (s) => hashesThen[s] === hashesNow[s]
    );

    // Make this feature opt-in as it has not get been tested at scale
    const excludeUnchanged = process.env["BACKFILL_EXCLUDE_UNCHANGED"] === "1";
    const filesToCache = excludeUnchanged
      ? filesMatchingOutputGlob.filter((f) => !unchangedFiles.includes(f))
      : filesMatchingOutputGlob;

    await this._put(hash, filesToCache);
    tracer.stop();
  }

  protected abstract _fetch(hash: string): Promise<boolean>;

  protected abstract _put(hash: string, filesToCache: string[]): Promise<void>;
}
