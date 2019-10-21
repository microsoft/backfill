import * as fs from "fs-extra";
import * as path from "path";
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
    outputFolder: string | string[]
  ): Promise<Boolean> {
    logger.profile("cache:fetch");

    const localCacheFolder = await this._fetch(hash);

    if (!localCacheFolder) {
      logger.setTime("fetchTime", "cache:fetch");
      return false;
    }

    outputFolderAsArray(outputFolder).forEach(folder => {
      fs.mkdirpSync(folder);
      fs.copySync(path.join(localCacheFolder, folder), folder);
    });

    logger.setTime("fetchTime", "cache:fetch");

    return true;
  }

  public async put(
    hash: string,
    outputFolder: string | string[]
  ): Promise<void> {
    logger.profile("cache:put");

    if (
      !outputFolderAsArray(outputFolder).every(folder =>
        fs.pathExistsSync(folder)
      )
    ) {
      throw new Error("Folder to cache does not exist");
    }

    await this._put(hash, outputFolder);
    logger.setTime("putTime", "cache:put");
  }

  protected abstract async _fetch(hash: string): Promise<string | undefined>;

  protected abstract async _put(
    hash: string,
    sourceFolder: string | string[]
  ): Promise<void>;
}
