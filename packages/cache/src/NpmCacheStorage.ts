import * as execa from "execa";
import * as fs from "fs-extra";
import * as path from "path";

import { NpmCacheStorageOptions } from "backfill-config";

import { CacheStorage } from "./CacheStorage";

export class NpmCacheStorage extends CacheStorage {
  constructor(
    private options: NpmCacheStorageOptions,
    private internalCacheFolder: string
  ) {
    super();
  }

  protected async _fetch(hash: string, outputFolder: string) {
    const { npmPackageName, registryUrl, npmrcUserconfig } = this.options;

    const temporaryOutputFolder = path.join(
      this.internalCacheFolder,
      "npm",
      hash
    );

    // Create a temp folder to try to install the npm
    fs.mkdirpSync(temporaryOutputFolder);

    try {
      await execa(
        "npm",
        [
          "install",
          "--prefix",
          temporaryOutputFolder,
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

      // Clean cache output folder
      if (fs.pathExistsSync(outputFolder)) {
        fs.removeSync(outputFolder);
      }
      fs.mkdirpSync(outputFolder);

      // Move downloaded npm package to cache output folder
      fs.moveSync(
        path.join(temporaryOutputFolder, "node_modules", npmPackageName),
        outputFolder,
        { overwrite: true }
      );

      // Clean up
      if (fs.pathExistsSync(temporaryOutputFolder)) {
        fs.removeSync(temporaryOutputFolder);
      }

      if (fs.pathExistsSync(path.join(outputFolder, "package.json"))) {
        fs.removeSync(path.join(outputFolder, "package.json"));
      }

      // Rename package.json if it was part of the original cache output folder
      if (fs.pathExistsSync(path.join(outputFolder, "__package.json"))) {
        fs.moveSync(
          path.join(outputFolder, "__package.json"),
          path.join(outputFolder, "package.json"),
          { overwrite: true }
        );
      }

      return true;
    } catch (e) {
      // Clean up
      fs.removeSync(temporaryOutputFolder);

      return false;
    }
  }

  protected async _put(hash: string, outputFolder: string) {
    const { npmPackageName, registryUrl, npmrcUserconfig } = this.options;

    // Rename if conflict
    if (fs.pathExistsSync(path.join(outputFolder, "package.json"))) {
      fs.moveSync(
        path.join(outputFolder, "package.json"),
        path.join(outputFolder, "__package.json"),
        { overwrite: true }
      );
    }

    // Create package.json file
    fs.outputJSONSync(path.join(outputFolder, "package.json"), {
      name: npmPackageName,
      version: `0.0.0-${hash}`
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
        cwd: outputFolder,
        stdout: "inherit",
        stderr: "inherit"
      }
    );

    // Clean up
    if (fs.pathExistsSync(path.join(outputFolder, "package.json"))) {
      fs.removeSync(path.join(outputFolder, "package.json"));
    }

    if (fs.pathExistsSync(path.join(outputFolder, "__package.json"))) {
      fs.moveSync(
        path.join(outputFolder, "__package.json"),
        path.join(outputFolder, "package.json"),
        { overwrite: true }
      );
    }
  }
}
