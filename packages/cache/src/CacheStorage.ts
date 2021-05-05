import globby from "globby";

import { Logger } from "backfill-logger";
import { getPackageDeps } from "@rushstack/package-deps-hash";

export interface ICacheStorage {
  fetch: (hash: string) => Promise<boolean>;
  put: (hash: string, outputGlob: string[]) => Promise<void>;
}

export abstract class CacheStorage implements ICacheStorage {
  private hashes: { [file: string]: string } = {};

  public constructor(protected logger: Logger, protected cwd: string) {}
  public async fetch(hash: string): Promise<boolean> {
    const tracer = this.logger.setTime("fetchTime");

    const result = await this._fetch(hash);

    // If we don't have a cache hit, then we save the state of the files for the put phase
    if (!result) {
      this.hashes = getPackageDeps(this.cwd).files;
    }

    tracer.stop();

    this.logger.setHit(result);
    return result;
  }

  public async put(hash: string, outputGlob: string[]): Promise<void> {
    const tracer = this.logger.setTime("putTime");

    const filesBeingCached = globby.sync(outputGlob, { cwd: this.cwd });
    if (filesBeingCached.length === 0) {
      throw new Error(
        `Couldn't find any file on disk matching the output glob (${outputGlob.join(
          ", "
        )})`
      );
    }

    // Get the list of files that have not changed so we don't need to cache them.
    const hashesNow = getPackageDeps(this.cwd).files;
    const unchangedFiles = Object.keys(this.hashes).filter(
      (s) => this.hashes[s] === hashesNow[s]
    );

    await this._put(hash, outputGlob, unchangedFiles);
    tracer.stop();
  }

  protected abstract _fetch(hash: string): Promise<boolean>;

  protected abstract _put(
    hash: string,
    outputGlob: string[],
    unchangedFiles: string[]
  ): Promise<void>;
}
