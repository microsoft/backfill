import * as fs from "fs-extra";
import * as path from "path";
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

    const localCacheFolder = await this._fetch(hash);

    if (!localCacheFolder) {
      logger.setTime("fetchTime", "cache:fetch");
      logger.setHit(false);
      return false;
    }

    await Promise.all(
      outputFolderAsArray(outputFolder).map(async folder => {
        fs.mkdirpSync(folder);
        await fs.copy(path.join(localCacheFolder, folder), folder);
      })
    );

    logger.setHit(true);
    logger.setTime("fetchTime", "cache:fetch");

    return true;
  }

  public async put(
    hash: string,
    outputFolder: string | string[]
  ): Promise<void> {
    logger.profile("cache:put");

    outputFolderAsArray(outputFolder).forEach(folder => {
      if (!fs.pathExistsSync(folder)) {
        const fullFolderPath = path.join(process.cwd(), folder);
        throw `backfill is trying to cache "${fullFolderPath}", but the folder does not exist.`;
      }
    });

    await this._put(hash, outputFolder);
    logger.setTime("putTime", "cache:put");
  }

  protected abstract async _fetch(hash: string): Promise<string | undefined>;
  protected abstract async _put(
    hash: string,
    outputFolder: string | string[]
  ): Promise<void>;
}
