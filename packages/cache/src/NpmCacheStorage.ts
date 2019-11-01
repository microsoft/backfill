import * as execa from "execa";
import * as fs from "fs-extra";
import * as path from "path";

import { NpmCacheStorageOptions, outputFolderAsArray } from "backfill-config";

import { CacheStorage } from "./CacheStorage";

export class NpmCacheStorage extends CacheStorage {
  constructor(
    private options: NpmCacheStorageOptions,
    private internalCacheFolder: string
  ) {
    super();
  }

  protected async _fetch(
    hash: string,
    outputFolder: string | string[]
  ): Promise<boolean> {
    const { npmPackageName, registryUrl, npmrcUserconfig } = this.options;

    const temporaryNpmOutputFolder = path.join(
      this.internalCacheFolder,
      "npm",
      hash
    );

    const packageFolderInTemporaryFolder = path.join(
      temporaryNpmOutputFolder,
      "node_modules",
      npmPackageName
    );

    if (!fs.existsSync(packageFolderInTemporaryFolder)) {
      fs.mkdirpSync(temporaryNpmOutputFolder);

      try {
        await execa(
          "npm",
          [
            "install",
            "--prefix",
            temporaryNpmOutputFolder,
            `${npmPackageName}@0.0.0-${hash}`,
            "--registry",
            registryUrl,
            "--prefer-offline",
            "--ignore-scripts",
            "--no-shrinkwrap",
            "--no-package-lock",
            "--loglevel",
            "error",
            ...(npmrcUserconfig ? ["--userconfig", npmrcUserconfig] : [])
          ],
          { stdout: "inherit" }
        );
      } catch (error) {
        fs.removeSync(temporaryNpmOutputFolder);

        if (error.stderr.toString().indexOf("ETARGET") > -1) {
          return false;
        } else {
          throw new Error(error);
        }
      }
    }

    await Promise.all(
      outputFolderAsArray(outputFolder).map(async folder => {
        await fs.mkdirp(folder);
        await fs.copy(
          path.join(packageFolderInTemporaryFolder, folder),
          folder
        );
      })
    );

    return true;
  }

  protected async _put(hash: string, outputFolder: string | string[]) {
    const { npmPackageName, registryUrl, npmrcUserconfig } = this.options;

    const temporaryNpmOutputFolder = path.join(
      this.internalCacheFolder,
      "npm",
      hash,
      "upload"
    );

    // Create package.json file
    fs.outputJSONSync(path.join(temporaryNpmOutputFolder, "package.json"), {
      name: npmPackageName,
      version: `0.0.0-${hash}`
    });

    outputFolderAsArray(outputFolder).forEach(folder => {
      fs.copySync(folder, path.join(temporaryNpmOutputFolder, folder));
    });

    // Upload package
    try {
      await execa(
        "npm",
        [
          "publish",
          "--registry",
          registryUrl,
          "--loglevel",
          "error",
          ...(npmrcUserconfig ? ["--userconfig", npmrcUserconfig] : [])
        ],
        {
          cwd: temporaryNpmOutputFolder,
          stdout: "inherit"
        }
      );
    } catch (error) {
      if (error.stderr.toString().indexOf("403") === -1) {
        throw new Error(error);
      }
    }
  }
}
