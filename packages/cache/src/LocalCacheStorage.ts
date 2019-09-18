import * as fs from "fs-extra";
import * as path from "path";

import { CacheStorage } from "./CacheStorage";

export class LocalCacheStorage extends CacheStorage {
  constructor(private localCacheFolder: string) {
    super();
  }

  protected getLocalCacheFolder(hash: string): string {
    return path.join(this.localCacheFolder, hash);
  }

  protected _fetch(hash: string, destinationFolder: string) {
    const objectUri = this.getLocalCacheFolder(hash);

    if (!fs.pathExistsSync(objectUri)) {
      return Promise.resolve(false);
    }

    fs.mkdirpSync(destinationFolder);
    fs.copySync(
      path.join(objectUri, destinationFolder, "*"),
      destinationFolder
    );

    return Promise.resolve(true);
  }

  protected _put(hash: string, sourceFolder: string) {
    const objectUri = this.getLocalCacheFolder(hash);

    fs.mkdirpSync(objectUri);
    fs.copySync(sourceFolder, objectUri);

    return Promise.resolve();
  }
}
