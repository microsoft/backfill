import * as fs from "fs-extra";
import { logger } from "backfill-logger";
import { outputFolderAsArray } from "backfill-config";

export interface ICacheStorage {
  fetch: (
    hash: string,
    destinationFolder: string | string[]
  ) => Promise<Boolean>;
  put: (hash: string, sourceFolder: string | string[]) => Promise<void>;
}

export abstract class CacheStorage implements ICacheStorage {
  public async fetch(
    hash: string,
    destinationFolder: string | string[]
  ): Promise<Boolean> {
    logger.profile("cache:fetch");

    const result = await this._fetch(hash, destinationFolder);
    logger.setTime("fetchTime", "cache:fetch");
    return result;
  }

  public async put(
    hash: string,
    sourceFolder: string | string[]
  ): Promise<void> {
    logger.profile("cache:put");

    if (
      !outputFolderAsArray(sourceFolder).every(folder =>
        fs.pathExistsSync(folder)
      )
    ) {
      throw new Error("Folder to cache does not exist");
    }

    await this._put(hash, sourceFolder);
    logger.setTime("putTime", "cache:put");
  }

  protected abstract async _fetch(
    hash: string,
    destinationFolder: string | string[]
  ): Promise<boolean>;

  protected abstract async _put(
    hash: string,
    sourceFolder: string | string[]
  ): Promise<void>;
}
