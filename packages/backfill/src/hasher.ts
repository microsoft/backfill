import * as crypto from "crypto";
import * as findUp from "find-up";
import * as fs from "fs-extra";
import * as path from "path";
import { hashElement } from "folder-hash";
import { logger, mark } from "just-task-logger";

import { performanceLogger } from "backfill-performance-logger";
import { IDependencyResolver } from "./dependencyResolver";

export interface IHasher {
  createPackageHash: () => Promise<string>;
}

type HasherOptions = {
  [key: string]: any;
};

export async function createHash(strings: string | string[]) {
  const hasher = crypto.createHash("sha1");

  const elements = typeof strings === "string" ? [strings] : strings;
  elements.forEach(element => hasher.update(element));

  return hasher.digest("hex");
}

function notEmpty<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

export class Hasher implements IHasher {
  hashFileFolder: string;
  packageRoot: string;

  constructor(
    private options: HasherOptions,
    private buildCommandSignature: string,
    private dependencyResolver: IDependencyResolver
  ) {
    this.hashFileFolder = this.options.hashFileFolder;
    this.packageRoot = this.options.packageRoot;
  }

  private getPackagePath(dependency: string) {
    const dependencyPath = this.dependencyResolver.resolve(dependency);

    if (!dependencyPath) {
      return;
    }

    return path.dirname(dependencyPath);
  }

  private getHashFilePath(packagePath: string) {
    return path.join(packagePath, this.hashFileFolder, "hash");
  }

  private isInternalPackage(dependencyPath: string) {
    return dependencyPath.indexOf("node_modules") === -1;
  }

  private async createFallbackPackageHash(
    dependencyPath: string,
    dependency: string
  ) {
    if (this.isInternalPackage(dependencyPath)) {
      logger.warn(
        `"${dependency}" does not have a pre-calculated hash. Will try to create a hash using package name and version as fallback.`
      );
    }

    const packageJson = require(path.join(dependencyPath, "package.json"));

    if (!packageJson || !packageJson.name || !packageJson.version) {
      return;
    }

    return createHash(`${packageJson.name}@${packageJson.version}`);
  }

  private async getPackageHash(dependencyPath: string, dependency: string) {
    const pathToHashFile = this.getHashFilePath(dependencyPath);

    try {
      const fileStream = await fs.readFile(pathToHashFile, "utf8");
      return fileStream.toString().trim();
    } catch (e) {
      return await this.createFallbackPackageHash(dependencyPath, dependency);
    }
  }

  private async getHashOfLockFile() {
    const lockFilePath = findUp.sync(["yarn.lock", "package-lock.json"], {
      cwd: this.packageRoot
    });

    if (!lockFilePath) {
      return;
    }

    const fileStream = await fs.readFile(lockFilePath, "utf8");
    return createHash(fileStream.toString());
  }

  public getHashOfDependencies(
    dependencies: string[]
  ): Promise<string | undefined>[] {
    return dependencies
      .map(dependency => {
        const dependencyPath = this.getPackagePath(dependency);

        if (dependencyPath) {
          return this.getPackageHash(dependencyPath, dependency).then(hash => {
            logger.verbose(`getHashOfDependencies: ${dependency}: ${hash}`);
            return hash;
          });
        } else {
          logger.verbose(`getHashOfDependencies: no path for ${dependency}`);
        }
      })
      .filter(notEmpty);
  }

  private async getHashOfOwnFiles(): Promise<string> {
    return hashElement(this.packageRoot, {
      encoding: "hex",
      ...this.options.watchGlobs
    }).then(result => {
      logger.verbose(result);
      return result.hash;
    });
  }

  private async writeHashToDisk(hash: string): Promise<string> {
    const pathToHashFile = this.getHashFilePath(this.packageRoot);

    return await fs.outputFile(pathToHashFile, hash).then(() => hash);
  }

  public async createPackageHash(): Promise<string> {
    const dependencies = this.dependencyResolver.dependencies();

    const hashOfDependencies = this.getHashOfDependencies(dependencies);
    const hashOfBuildCommand = createHash(this.buildCommandSignature).then(
      hash => {
        logger.verbose(`hashOfBuildCommand: ${hash}`);
        return hash;
      }
    );
    const hashOfOwnFiles = this.getHashOfOwnFiles().then(hash => {
      logger.verbose(`hashOfOwnFiles: ${hash}`);
      return hash;
    });
    const hashOfLockFile = this.getHashOfLockFile().then(hash => {
      logger.verbose(`hashOfLockFile: ${hash}`);
      return hash;
    });

    mark("hasher:calculateHash");

    // 1. Create hash to be used when fetching cache from cache storage
    const packageHash = await Promise.all([
      ...hashOfDependencies,
      hashOfBuildCommand,
      hashOfOwnFiles,
      hashOfLockFile
    ])
      .then(hashes => hashes.filter(notEmpty))
      .then(hashes => createHash(hashes));

    logger.perf("hasher:calculateHash");

    // 2. Create hash to be stored in the package. Used to communicate the state
    // of the package to dependent packages (parents)
    await Promise.all([...hashOfDependencies, hashOfOwnFiles, hashOfLockFile])
      .then(hashes => hashes.filter(notEmpty))
      .then(hashes => createHash(hashes))
      .then(hash => this.writeHashToDisk(hash));

    performanceLogger.setHash(packageHash);
    return packageHash;
  }
}
