import path from "path";
import execa from "execa";
import fs from "fs-extra";
import globby from "globby";

import { NpmCacheStorageOptions } from "backfill-config";
import { Logger } from "backfill-logger";

import { CacheStorage } from "./CacheStorage";

export class NpmCacheStorage extends CacheStorage {
  constructor(
    private options: NpmCacheStorageOptions,
    private internalCacheFolder: string,
    logger: Logger,
    cwd: string,
    incrementalCaching = false
  ) {
    super(logger, cwd, incrementalCaching);
  }

  protected async _fetch(hash: string): Promise<boolean> {
    const { npmPackageName, registryUrl, npmrcUserconfig } = this.options;

    const temporaryNpmOutputFolder = path.resolve(
      this.cwd,
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
        const runner = execa("npm", [
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
          ...(npmrcUserconfig ? ["--userconfig", npmrcUserconfig] : []),
        ]);

        this.logger.pipeProcessOutput(runner.stdout, runner.stderr);

        await runner;
      } catch (error) {
        fs.removeSync(temporaryNpmOutputFolder);

        if (error.stderr.toString().indexOf("ETARGET") > -1) {
          return false;
        } else {
          throw new Error(error);
        }
      }
    }

    const files = await globby(`**/*`, {
      cwd: packageFolderInTemporaryFolder,
    });

    await Promise.all(
      files.map(async (file) => {
        await fs.mkdirp(path.dirname(path.join(this.cwd, file)));
        await fs.copy(
          path.join(packageFolderInTemporaryFolder, file),
          path.join(this.cwd, file)
        );
      })
    );

    return true;
  }

  protected async _put(hash: string, filesToCache: string[]) {
    const { npmPackageName, registryUrl, npmrcUserconfig } = this.options;

    const temporaryNpmOutputFolder = path.resolve(
      this.cwd,
      this.internalCacheFolder,
      "npm",
      hash,
      "upload"
    );

    // Create package.json file
    fs.outputJSONSync(path.join(temporaryNpmOutputFolder, "package.json"), {
      name: npmPackageName,
      version: `0.0.0-${hash}`,
    });

    await fs.mkdirp(temporaryNpmOutputFolder);

    await Promise.all(
      filesToCache.map(async (file) => {
        const destinationFolder = path.join(
          temporaryNpmOutputFolder,
          path.dirname(file)
        );
        await fs.mkdirp(destinationFolder);
        await fs.copy(
          path.join(this.cwd, file),
          path.join(temporaryNpmOutputFolder, file)
        );
      })
    );

    // Upload package
    try {
      const runner = execa(
        "npm",
        [
          "publish",
          "--registry",
          registryUrl,
          "--loglevel",
          "error",
          ...(npmrcUserconfig ? ["--userconfig", npmrcUserconfig] : []),
        ],
        {
          cwd: temporaryNpmOutputFolder,
          stdout: "inherit",
        }
      );

      this.logger.pipeProcessOutput(runner.stdout, runner.stderr);

      await runner;
    } catch (error) {
      if (error.stderr.toString().indexOf("403") === -1) {
        throw new Error(error);
      }
    }
  }
}
