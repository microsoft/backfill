import { dirname, sep } from "path";
import * as path from "path";
import * as crypto from "crypto";
import * as fs from "fs/promises";
import globby from "globby";
import findUp from "find-up";
import { getPackageDeps } from "@rushstack/package-deps-hash";

import { Logger } from "backfill-logger";
import { ICacheStorage } from "backfill-config";

const savedHashes: Map<string, Map<string, string>> = new Map();

// Make this feature opt-in as it has not get been tested at scale
const excludeUnchanged = process.env["BACKFILL_EXCLUDE_UNCHANGED"] === "1";

// Input and output path are absolute (with platform specific separators)
// For simplicity's sake we assume that we don't have nested git repos
const foundRoots: Set<string> = new Set();
async function getRepoRoot(cwd: string): Promise<string> {
  for (const root of foundRoots.values()) {
    if (cwd.startsWith(root)) {
      return root;
    }
  }

  // .git is typically a folder but will be a file in a worktree
  const nearestGitInfo =
    (await findUp(".git", { cwd, type: "directory" })) ||
    (await findUp(".git", { cwd, type: "file" }));
  if (!nearestGitInfo) {
    throw new Error(
      "The location that backfill is being run against is not in a git repo"
    );
  }

  const result = dirname(nearestGitInfo);
  foundRoots.add(result);
  return result;
}

// contract: cwd should be absolute
// The return keys are relative path with posix file separators
async function getGitHashesFor(cwd: string): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  // gitRoot is an absolute path (with platform specific separators)
  const gitRoot = await getRepoRoot(cwd);
  const files = getPackageDeps(gitRoot).files;
  Object.keys(files).forEach((f) => {
    // f is a relative path with posix separator
    const abs = path.join(gitRoot, f);
    if (abs.startsWith(cwd)) {
      result.set(path.relative(cwd, abs).split(sep).join("/"), files[f]);
    }
  });

  const allFiles = await globby(["**/*", "!node_modules"], { cwd });
  //globby returns relative path with posix file separator
  await Promise.all(
    allFiles.map(async (f) => {
      if (result.has(f)) {
        return;
      }
      const fileBuffer = await fs.readFile(path.join(cwd, f));
      const hashSum = crypto.createHash("sha256");
      hashSum.update(fileBuffer);
      const hash = hashSum.digest("hex");
      result.set(f, hash);
    })
  );

  return result;
}

export { ICacheStorage };

export abstract class CacheStorage implements ICacheStorage {
  public constructor(protected logger: Logger, protected cwd: string) {}
  public async fetch(hash: string): Promise<boolean> {
    const tracer = this.logger.setTime("fetchTime");

    const result = await this._fetch(hash);

    tracer.stop();

    this.logger.setHit(result);

    if (excludeUnchanged) {
      // Save hash of files if not already memoized
      savedHashes.set(hash, await getGitHashesFor(this.cwd));
    }

    return result;
  }

  public async put(hash: string, outputGlob: string[]): Promise<void> {
    const tracer = this.logger.setTime("putTime");

    const filesMatchingOutputGlob = await globby(outputGlob, { cwd: this.cwd });

    let filesToCache = filesMatchingOutputGlob;
    if (excludeUnchanged) {
      // Get the list of files that have not changed so we don't need to cache them.
      const hashesNow = await getGitHashesFor(this.cwd);
      const hashesThen =
        (await savedHashes.get(hash)) || new Map<string, string>();
      const unchangedFiles = [...hashesThen.keys()].filter(
        (s) => hashesThen.get(s) === hashesNow.get(s)
      );
      filesToCache = filesMatchingOutputGlob.filter(
        (f) => !unchangedFiles.includes(f)
      );
    }

    await this._put(hash, filesToCache);
    tracer.stop();
  }

  protected abstract _fetch(hash: string): Promise<boolean>;

  protected abstract _put(hash: string, filesToCache: string[]): Promise<void>;
}
