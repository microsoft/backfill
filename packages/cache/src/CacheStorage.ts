import * as fs from "fs-extra";
import { logger } from "backfill-logger";

export interface ICacheStorage {
  fetch: (hash: string, destinationFolder: string) => Promise<Boolean>;
  put: (hash: string, sourceFolder: string) => Promise<void>;
}

export abstract class CacheStorage implements ICacheStorage {
  public fetch(hash: string, destinationFolder: string): Promise<Boolean> {
    logger.profile("cache:fetch");

    return this._fetch(hash, destinationFolder).then(result => {
      logger.setTime("fetchTime", "cache:fetch");
      return result;
    });
  }

  public put(hash: string, sourceFolder: string): Promise<void> {
    logger.profile("cache:put");

    if (!fs.pathExistsSync(sourceFolder)) {
      throw new Error("Folder to cache does not exist");
    }

    return this._put(hash, sourceFolder).then(() => {
      logger.setTime("putTime", "cache:put");
    });
  }

  protected abstract _fetch(
    hash: string,
    destinationFolder: string
  ): Promise<boolean>;

  protected abstract _put(hash: string, sourceFolder: string): Promise<void>;
}
