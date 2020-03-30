import { logger as performanceLogger } from "backfill-logger";
import { Logger } from "backfill-generic-logger";
import * as fg from "fast-glob";

export interface ICacheStorage {
  fetch: (hash: string) => Promise<Boolean>;
  put: (hash: string, outputGlob: string[]) => Promise<void>;
}

export abstract class CacheStorage implements ICacheStorage {
  protected constructor(private logger: Logger) {}
  public async fetch(hash: string): Promise<Boolean> {
    performanceLogger.profile("cache:fetch", this.logger);

    const result = await this._fetch(hash);
    performanceLogger.setTime("fetchTime", "cache:fetch", this.logger);

    performanceLogger.setHit(result, this.logger);
    return result;
  }

  public async put(hash: string, outputGlob: string[]): Promise<void> {
    performanceLogger.profile("cache:put", this.logger);

    const filesBeingCached = fg.sync(outputGlob);
    if (filesBeingCached.length === 0) {
      throw new Error(
        `Couldn't find any file on disk matching the output glob (${outputGlob.join(
          ", "
        )})`
      );
    }

    await this._put(hash, outputGlob);
    performanceLogger.setTime("putTime", "cache:put", this.logger);
  }

  protected abstract async _fetch(hash: string): Promise<boolean>;

  protected abstract async _put(
    hash: string,
    outputGlob: string[]
  ): Promise<void>;
}
