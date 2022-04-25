import globby from "globby";

import { Logger } from "backfill-logger";
import { ICacheStorage } from "backfill-config";
import { getFileHash } from "./hashFile";

// First key is the hash, second key is the file relative path
const savedHashes: Map<string, Map<string, string>> = new Map();

// contract: cwd should be absolute
// The return keys are relative path with posix file separators
async function getHashesFor(cwd: string): Promise<Map<string, string>> {
  const result = new Map<string, string>();

  const allFiles = await globby(["**/*", "!node_modules"], { cwd });
  //globby returns relative path with posix file separator
  await Promise.all(
    allFiles.map(async (f) => {
      const hash = await getFileHash(cwd, f);
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

    if (!result) {
      savedHashes.set(hash, await getHashesFor(this.cwd));
    }

    return result;
  }

  public async put(hash: string, outputGlob: string[]): Promise<void> {
    const tracer = this.logger.setTime("putTime");

    const filesMatchingOutputGlob = await globby(outputGlob, { cwd: this.cwd });

    // Get the list of files that have not changed so we don't need to cache them.
    const hashesNow = await getHashesFor(this.cwd);
    const hashesThen =
      (await savedHashes.get(hash)) || new Map<string, string>();
    const unchangedFiles = [...hashesThen.keys()].filter(
      (s) => hashesThen.get(s) === hashesNow.get(s)
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
