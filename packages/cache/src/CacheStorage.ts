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

    outputFolderAsArray(outputFolder).forEach(folder => {
      if (!fs.pathExistsSync(folder)) {
        const fullFolderPath = path.join(process.cwd(), folder);
        throw new Error(
          `backfill is trying to cache "${fullFolderPath}", but the folder does not exist.`
        );
      }
    });

    await this._put(hash, outputFolder);
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
