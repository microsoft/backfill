import path from "path";
import fs from "fs-extra";
import fg from "fast-glob";

import { Logger } from "backfill-logger";

import { CacheStorage } from "./CacheStorage";

export class LocalCacheStorage extends CacheStorage {
  constructor(
    private internalCacheFolder: string,
    logger: Logger,
    cwd: string
  ) {
    super(logger, cwd);
  }

  protected getLocalCacheFolder(hash: string): string {
    return path.join(this.internalCacheFolder, hash);
  }

  protected async _fetch(hash: string): Promise<boolean> {
    const localCacheFolder = this.getLocalCacheFolder(hash);

    if (!fs.pathExistsSync(localCacheFolder)) {
      return false;
    }

    const files = await fg(`**/*`, {
      cwd: path.join(this.cwd, localCacheFolder)
    });

    await Promise.all(
      files.map(async file => {
        await fs.mkdirp(path.dirname(path.join(this.cwd, file)));
        await fs.copy(
          path.join(localCacheFolder, file),
          path.join(this.cwd, file)
        );
      })
    );

    return true;
  }

  protected async _put(hash: string, outputGlob: string[]): Promise<void> {
    const localCacheFolder = this.getLocalCacheFolder(hash);

    const files = fg.sync(outputGlob, { cwd: this.cwd });

    await Promise.all(
      files.map(async file => {
        const destinationFolder = path.join(
          localCacheFolder,
          path.dirname(file)
        );
        await fs.mkdirp(destinationFolder);
        await fs.copy(
          path.join(this.cwd, file),
          path.join(localCacheFolder, file)
        );
      })
    );
  }
}
