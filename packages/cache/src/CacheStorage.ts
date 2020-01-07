import * as fs from "fs-extra";
import { logger } from "backfill-logger";
import { outputFolderAsArray } from "backfill-config";

export interface ICacheStorage {
  fetch: (hash: string, outputFolder: string | string[]) => Promise<Boolean>;
  put: (hash: string, outputFolder: string | string[]) => Promise<void>;
}

export abstract class CacheStorage implements ICacheStorage {
  public async fetch(
    hash: string,
    outputFolder: string | string[]
  ): Promise<Boolean> {
    logger.profile("cache:fetch");

    const result = await this._fetch(hash, outputFolder);
    logger.setTime("fetchTime", "cache:fetch");

    logger.setHit(result);
    return result;
  }

  public async put(
    hash: string,
    outputFolder: string | string[]
  ): Promise<void> {
    logger.profile("cache:put");

    const filteredOutputFolders = outputFolderAsArray(
      outputFolder
    ).filter(folder => fs.pathExistsSync(folder));

    if (filteredOutputFolders.length === 0) {
      throw new Error(
        `Couldn't find a folder on disk to cache. Searched for these folders: ${outputFolderAsArray(
          outputFolder
        ).join(", ")}.`
      );
    }

    await this._put(hash, filteredOutputFolders);
    logger.setTime("putTime", "cache:put");
  }

  protected abstract async _fetch(
    hash: string,
    outputFolder: string | string[]
  ): Promise<boolean>;
  protected abstract async _put(
    hash: string,
    outputFolder: string | string[]
  ): Promise<void>;
}
