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

  protected async _fetch(hash: string, outputFolder: string | string[]) {
    const localCacheFolder = this.getLocalCacheFolder(hash);

    if (!fs.pathExistsSync(localCacheFolder)) {
      return false;
    }

    outputFolderAsArray(outputFolder).forEach(folder => {
      fs.mkdirpSync(folder);
      fs.copySync(path.join(localCacheFolder, folder), folder);
    });

    return true;
  }

  protected async _put(hash: string, outputFolder: string | string[]) {
    const localCacheFolder = this.getLocalCacheFolder(hash);

    outputFolderAsArray(outputFolder).forEach(folder => {
      const outputFolderInCache = path.join(localCacheFolder, folder);
      fs.mkdirpSync(outputFolderInCache);
      fs.copySync(folder, outputFolderInCache);
    });
  }
}
