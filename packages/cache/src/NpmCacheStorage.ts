import * as execa from "execa";
import * as fs from "fs-extra";
import * as path from "path";
import * as shelljs from "shelljs";

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
    shelljs.mkdir("-p", destinationTempFolder);

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
        if (shelljs.test("-d", destinationFolder)) {
          shelljs.rm("-R", destinationFolder);
        }
        shelljs.mkdir("-p", destinationFolder);

        // Move downloaded npm package to cache output folder
        shelljs.mv(
          path.join(destinationTempFolder, "node_modules", npmPackageName, "*"),
          destinationFolder
        );

        // Clean up
        if (shelljs.test("-d", destinationTempFolder)) {
          shelljs.rm("-R", destinationTempFolder);
        }
        if (shelljs.test("-f", path.join(destinationFolder, "package.json"))) {
          shelljs.rm(path.join(destinationFolder, "package.json"));
        }

        // Rename package.json if it was part of the original cache output folder
        if (
          shelljs.test("-f", path.join(destinationFolder, "__package.json"))
        ) {
          shelljs.mv(
            path.join(destinationFolder, "__package.json"),
            path.join(destinationFolder, "package.json")
          );
        }

        return true;
      })
      .catch(() => {
        // Clean up
        shelljs.rm("-R", destinationTempFolder);

        return false;
      });
  }

  protected _put(hash: string, sourceFolder: string) {
    const { npmPackageName, registryUrl, npmrcUserconfig } = this.options;

    // Rename if conflict
    if (shelljs.test("-f", path.join(sourceFolder, "package.json"))) {
      shelljs.mv(
        path.join(sourceFolder, "package.json"),
        path.join(sourceFolder, "__package.json")
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
      if (shelljs.test("-f", path.join(sourceFolder, "package.json"))) {
        shelljs.rm(path.join(sourceFolder, "package.json"));
      }

      if (shelljs.test("-f", path.join(sourceFolder, "__package.json"))) {
        shelljs.mv(
          path.join(sourceFolder, "__package.json"),
          path.join(sourceFolder, "package.json")
        );
      }
    });
  }
}
