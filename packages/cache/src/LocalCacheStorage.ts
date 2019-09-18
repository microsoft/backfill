import * as fs from "fs-extra";
import * as path from "path";

import { CacheStorage } from "./CacheStorage";

export class LocalCacheStorage extends CacheStorage {
  constructor(private internalCacheFolder: string) {
    super();
  }

  protected getLocalCacheFolder(hash: string): string {
    return path.join(this.internalCacheFolder, hash);
  }

  protected _fetch(hash: string, outputFolder: string) {
    const objectUri = this.getLocalCacheFolder(hash);

    if (!fs.pathExistsSync(objectUri)) {
      return Promise.resolve(false);
    }

    fs.mkdirpSync(outputFolder);
    fs.copySync(path.join(objectUri, outputFolder), outputFolder);

    return Promise.resolve(true);
  }

  protected _put(hash: string, outputFolder: string) {
    const objectUri = this.getLocalCacheFolder(hash);
    const outputFolderInCache = path.join(objectUri, outputFolder);

    fs.mkdirpSync(outputFolderInCache);
    fs.copySync(outputFolder, outputFolderInCache);

    return Promise.resolve();
  }
}
