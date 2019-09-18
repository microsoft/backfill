import * as fs from "fs-extra";
import { performanceLogger } from "backfill-performance-logger";
import { logger, mark } from "just-task-logger";

export interface ICacheStorage {
  fetch: (hash: string, destinationFolder: string) => Promise<Boolean>;
  put: (hash: string, sourceFolder: string) => Promise<void>;
}

export abstract class CacheStorage implements ICacheStorage {
  public fetch(hash: string, destinationFolder: string): Promise<Boolean> {
    const startTime = Date.now();
    mark("cache:fetch");

    return this._fetch(hash, destinationFolder).then(result => {
      performanceLogger.setTime("fetchTime", startTime, Date.now());
      logger.perf("cache:fetch");
      return result;
    });
  }

  public put(hash: string, sourceFolder: string): Promise<void> {
    const startTime = Date.now();
    mark("cache:put");

    if (!fs.pathExistsSync(sourceFolder)) {
      throw new Error("Folder to cache does not exist");
    }

    return this._put(hash, sourceFolder).then(() => {
      performanceLogger.setTime("putTime", startTime, Date.now());
      logger.perf("cache:put");
    });
  }

  protected abstract _fetch(
    hash: string,
    destinationFolder: string
  ): Promise<boolean>;

  protected abstract _put(hash: string, sourceFolder: string): Promise<void>;
}
