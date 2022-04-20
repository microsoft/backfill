import * as path from "path";
import * as crypto from "crypto";
import * as fs from "fs/promises";
import globby from "globby";

import { Logger } from "backfill-logger";
import { ICacheStorage } from "backfill-config";

const savedHashes: Map<string, Map<string, string>> = new Map();

// Make this feature opt-in as it has not get been tested at scale
const excludeUnchanged = process.env["BACKFILL_EXCLUDE_UNCHANGED"] === "1";

// contract: cwd should be absolute
// The return keys are relative path with posix file separators
async function getHashesFor(cwd: string): Promise<Map<string, string>> {
  const result = new Map<string, string>();

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

    if (!result && excludeUnchanged) {
      // Save hash of files if not already memoized
      savedHashes.set(hash, await getHashesFor(this.cwd));
    }

    return result;
  }

  public async put(hash: string, outputGlob: string[]): Promise<void> {
    const tracer = this.logger.setTime("putTime");

    const filesMatchingOutputGlob = await globby(outputGlob, { cwd: this.cwd });

    let filesToCache = filesMatchingOutputGlob;
    if (excludeUnchanged) {
      // Get the list of files that have not changed so we don't need to cache them.
      const hashesNow = await getHashesFor(this.cwd);
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
