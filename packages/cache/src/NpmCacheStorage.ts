import * as execa from "execa";
import * as fs from "fs-extra";
import * as path from "path";

import { NpmCacheStorageOptions } from "backfill-config";
import { outputFolderAsArray } from "backfill-config";

import { CacheStorage } from "./CacheStorage";

export class NpmCacheStorage extends CacheStorage {
  constructor(
    private options: NpmCacheStorageOptions,
    private internalCacheFolder: string
  ) {
    super();
  }

  protected async _fetch(hash: string): Promise<string> {
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
        throw new Error(error);
      }
    }

    return packageFolderInTemporaryFolder;
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
        stdout: "inherit",
        stderr: "inherit"
      }
    );
  }
}
