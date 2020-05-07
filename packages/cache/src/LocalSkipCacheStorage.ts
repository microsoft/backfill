import path from "path";
import fs from "fs-extra";

import { Logger } from "backfill-logger";

import { CacheStorage } from "./CacheStorage";

/**
 * A CacheStorage that essentially just lets fetch return nothing locally, skipping cache, but verifies whether the hash is still correct based on the hasher algorithm
 */
export class LocalSkipCacheStorage extends CacheStorage {
  constructor(
    private internalCacheFolder: string,
    logger: Logger,
    cwd: string
  ) {
    super(logger, cwd);
  }

  protected getLocalCacheFolder(hash: string): string {
    return path.resolve(this.cwd, this.internalCacheFolder, hash);
  }

  protected async _fetch(hash: string): Promise<boolean> {
    const localCacheFolder = this.getLocalCacheFolder(hash);

    if (!fs.pathExistsSync(localCacheFolder)) {
      return false;
    }

    return true;
  }

  protected async _put(hash: string, _outputGlob: string[]): Promise<void> {
    const localCacheFolder = this.getLocalCacheFolder(hash);

    await fs.mkdirp(localCacheFolder);
  }
}
