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

  protected async _fetch(hash: string, outputFolder: string | string[]) {
    const { npmPackageName, registryUrl, npmrcUserconfig } = this.options;

    const temporaryNpmOutputFolder = path.join(
      this.internalCacheFolder,
      "npm",
      hash
    );

    if (!fs.existsSync(temporaryNpmOutputFolder)) {
      // Create a temp folder to try to install the npm
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
      } catch (e) {
        // Clean up
        fs.removeSync(temporaryNpmOutputFolder);

        return false;
      }
    }

    outputFolderAsArray(outputFolder).forEach(folder => {
      fs.mkdirpSync(folder);

      // Move downloaded npm package to cache output folder
      fs.moveSync(
        path.join(
          temporaryNpmOutputFolder,
          "node_modules",
          npmPackageName,
          folder
        ),
        folder,
        { overwrite: true }
      );
    });

    return true;
  }

  protected async _put(hash: string, outputFolder: string | string[]) {
    const { npmPackageName, registryUrl, npmrcUserconfig } = this.options;

    const temporaryNpmOutputFolder = path.join(
      this.internalCacheFolder,
      "npm",
      hash
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
