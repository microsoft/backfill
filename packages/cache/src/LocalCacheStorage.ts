import * as path from "path";
import * as shelljs from "shelljs";

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

    if (!shelljs.test("-d", objectUri)) {
      return Promise.resolve(false);
    }

    shelljs.mkdir("-p", destinationFolder);
    shelljs.cp(
      "-R",
      path.join(objectUri, destinationFolder, "*"),
      destinationFolder
    );

    return Promise.resolve(true);
  }

  protected _put(hash: string, sourceFolder: string) {
    const objectUri = this.getLocalCacheFolder(hash);

    shelljs.mkdir("-p", objectUri);
    shelljs.cp("-R", sourceFolder, objectUri);

    return Promise.resolve();
  }
}
