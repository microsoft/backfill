import * as fs from "fs-extra";
import * as path from "path";
import { outputFolderAsArray } from "backfill-config";

import { CacheStorage } from "./CacheStorage";

export class LocalCacheStorage extends CacheStorage {
  constructor(private internalCacheFolder: string) {
    super();
  }

  protected getLocalCacheFolder(hash: string): string {
    return path.join(this.internalCacheFolder, hash);
  }

  protected async _fetch(hash: string): Promise<string | undefined> {
    const localCacheFolder = this.getLocalCacheFolder(hash);

    if (!fs.pathExistsSync(localCacheFolder)) {
      return;
    }

    return localCacheFolder;
  }

  protected async _put(
    hash: string,
    outputFolder: string | string[]
  ): Promise<void> {
    const localCacheFolder = this.getLocalCacheFolder(hash);

    await Promise.all(
      outputFolderAsArray(outputFolder).map(async folder => {
        const outputFolderInCache = path.join(localCacheFolder, folder);

        await fs.mkdirp(outputFolderInCache);
        await fs.copy(folder, outputFolderInCache);
      })
    );
  }
}
