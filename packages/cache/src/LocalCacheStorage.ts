import path from "path";
import fs from "fs-extra";
import globby from "globby";

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
    return path.resolve(this.cwd, this.internalCacheFolder, hash);
  }

  protected async _fetch(hash: string): Promise<boolean> {
    const localCacheFolder = this.getLocalCacheFolder(hash);

    if (!fs.pathExistsSync(localCacheFolder)) {
      return false;
    }

    const files = await globby(`**/*`, {
      cwd: localCacheFolder
    });

    await Promise.all(
      files
        .filter(async file => {
          const src = path.join(localCacheFolder, file);
          const dest = path.join(this.cwd, file);

          if (fs.existsSync(dest)) {
            const stats = await Promise.all([fs.stat(src), fs.stat(dest)]);
            return stats[0].mtime !== stats[1].mtime;
          }

          return true;
        })
        .map(async file => {
          await fs.mkdirp(path.dirname(path.join(this.cwd, file)));
          await fs.copyFile(
            path.join(localCacheFolder, file),
            path.join(this.cwd, file)
          );
        })
    );

    return true;
  }

  protected async _put(hash: string, outputGlob: string[]): Promise<void> {
    const localCacheFolder = this.getLocalCacheFolder(hash);

    const files = globby.sync(outputGlob, { cwd: this.cwd });

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
