import * as path from "path";
import { promises as fs } from "fs";
import globby from "globby";

import { Logger } from "backfill-logger";
import { ICacheStorage } from "backfill-config";

const savedMtimes: Map<string, Map<string, number>> = new Map();

// contract: cwd should be absolute
// The return keys are relative path with posix file separators
async function getMtimesFor(cwd: string): Promise<Map<string, number>> {
  const result = new Map<string, number>();

  const allFiles = await globby(["**/*", "!node_modules"], { cwd });
  //globby returns relative path with posix file separator
  await Promise.all(
    allFiles.map(async (f) => {
      const stat = await fs.stat(path.join(cwd, f));
      result.set(f, stat.mtime.getTime());
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

    if (!result) {
      // Save hash of files if not already memoized
      savedMtimes.set(hash, await getMtimesFor(this.cwd));
    }

    return result;
  }

  public async put(hash: string, outputGlob: string[]): Promise<void> {
    const tracer = this.logger.setTime("putTime");

    const filesMatchingOutputGlob = await globby(outputGlob, { cwd: this.cwd });

    // Get the list of files that have not changed so we don't need to cache them.
    const mtimesNow = await getMtimesFor(this.cwd);
    const mtimesThen =
      (await savedMtimes.get(hash)) || new Map<string, string>();
    const unchangedFiles = [...mtimesThen.keys()].filter(
      (s) => mtimesThen.get(s) === mtimesNow.get(s)
    );
    const filesToCache = filesMatchingOutputGlob.filter(
      (f) => !unchangedFiles.includes(f)
    );

    await this._put(hash, filesToCache);
    tracer.stop();
  }

  protected abstract _fetch(hash: string): Promise<boolean>;

  protected abstract _put(hash: string, filesToCache: string[]): Promise<void>;
}
