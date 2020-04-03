import { logger } from "backfill-logger";
import * as fg from "fast-glob";

export interface ICacheStorage {
  fetch: (hash: string) => Promise<boolean>;
  put: (hash: string, outputGlob: string[]) => Promise<void>;
}

export abstract class CacheStorage implements ICacheStorage {
  public async fetch(hash: string): Promise<boolean> {
    logger.profile("cache:fetch");

    const result = await this._fetch(hash);
    logger.setTime("fetchTime", "cache:fetch");

    logger.setHit(result);
    return result;
  }

  public async put(hash: string, outputGlob: string[]): Promise<void> {
    logger.profile("cache:put");

    const filesBeingCached = fg.sync(outputGlob);
    if (filesBeingCached.length === 0) {
      throw new Error(
        `Couldn't find any file on disk matching the output glob (${outputGlob.join(
          ", "
        )})`
      );
    }

    await this._put(hash, outputGlob);
    logger.setTime("putTime", "cache:put");
  }

  protected abstract async _fetch(hash: string): Promise<boolean>;

  protected abstract async _put(
    hash: string,
    outputGlob: string[]
  ): Promise<void>;
}
