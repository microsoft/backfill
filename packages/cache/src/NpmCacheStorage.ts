import * as execa from "execa";
import * as fs from "fs-extra";
import * as path from "path";

import { CacheStorage } from "./CacheStorage";

export type NpmCacheStorageOptions = {
  npmPackageName: string;
  registryUrl: string;
  npmrcUserconfig?: string;
};

export class NpmCacheStorage extends CacheStorage {
  constructor(
    private options: NpmCacheStorageOptions,
    private localCacheFolder: string
  ) {
    super();
  }

  protected _fetch(hash: string, destinationFolder: string) {
    const { npmPackageName, registryUrl, npmrcUserconfig } = this.options;

    const destinationTempFolder = path.join(this.localCacheFolder, "npm", hash);

    // Create a temp folder to try to install the npm
    fs.mkdirpSync(destinationTempFolder);

    const runner = execa("npm", [
      "install",
      "--prefix",
      destinationTempFolder,
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
    ]);
    runner.stdout.pipe(process.stdout);

    return runner
      .then(() => {
        // Clean cache output folder
        if (fs.pathExistsSync(destinationFolder)) {
          fs.removeSync(destinationFolder);
        }
        fs.mkdirpSync(destinationFolder);

        // Move downloaded npm package to cache output folder
        fs.moveSync(
          path.join(destinationTempFolder, "node_modules", npmPackageName, "*"),
          destinationFolder,
          { overwrite: true }
        );

        // Clean up
        if (fs.pathExistsSync(destinationTempFolder)) {
          fs.removeSync(destinationTempFolder);
        }
        if (fs.pathExistsSync(path.join(destinationFolder, "package.json"))) {
          fs.removeSync(path.join(destinationFolder, "package.json"));
        }

        // Rename package.json if it was part of the original cache output folder
        if (fs.pathExistsSync(path.join(destinationFolder, "__package.json"))) {
          fs.moveSync(
            path.join(destinationFolder, "__package.json"),
            path.join(destinationFolder, "package.json"),
            { overwrite: true }
          );
        }

        return true;
      })
      .catch(() => {
        // Clean up
        fs.removeSync(destinationTempFolder);

        return false;
      });
  }

  protected _put(hash: string, sourceFolder: string) {
    const { npmPackageName, registryUrl, npmrcUserconfig } = this.options;

    // Rename if conflict
    if (fs.pathExistsSync(path.join(sourceFolder, "package.json"))) {
      fs.moveSync(
        path.join(sourceFolder, "package.json"),
        path.join(sourceFolder, "__package.json"),
        { overwrite: true }
      );
    }

    // Create package.json file
    fs.outputJSONSync(path.join(sourceFolder, "package.json"), {
      name: npmPackageName,
      version: `0.0.0-${hash}`
    });

    // Upload package
    const runner = execa(
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
        cwd: sourceFolder
      }
    );
    runner.stdout.pipe(process.stdout);
    runner.stderr.pipe(process.stderr);

    return runner.then(() => {
      // Clean up
      if (fs.pathExistsSync(path.join(sourceFolder, "package.json"))) {
        fs.removeSync(path.join(sourceFolder, "package.json"));
      }

      if (fs.pathExistsSync(path.join(sourceFolder, "__package.json"))) {
        fs.moveSync(
          path.join(sourceFolder, "__package.json"),
          path.join(sourceFolder, "package.json"),
          { overwrite: true }
        );
      }
    });
  }
}
