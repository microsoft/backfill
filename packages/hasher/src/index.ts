import { logger } from "backfill-logger";

import {
  PackageHashInfo,
  getPackageHash,
  generateHashOfInternalPackages
} from "./hashOfPackage";
import { hashStrings, getPackageRoot } from "./helpers";
import { parseLockFile } from "./yarnLock";
import { getYarnWorkspaces } from "./yarnWorkspaces";

export interface IHasher {
  createPackageHash: () => Promise<string>;
}

export class Hasher implements IHasher {
  private packageRoot: string;
  private hashGlobs: string[];

  constructor(
    private options: { [key: string]: any },
    private buildCommandSignature: string
  ) {
    this.packageRoot = this.options.packageRoot;
    this.hashGlobs = this.options.hashGlobs;
  }

  public async createPackageHash(): Promise<string> {
    logger.profile("hasher:calculateHash");

    const packageRoot = await getPackageRoot(this.packageRoot);
    const yarnLock = await parseLockFile(packageRoot);
    const workspaces = getYarnWorkspaces(packageRoot);

    const queue = [packageRoot];
    const done: PackageHashInfo[] = [];

    while (queue.length > 0) {
      const packageRoot = queue.shift();

      if (!packageRoot) {
        continue;
      }

      const packageHash = await getPackageHash(
        packageRoot,
        workspaces,
        queue,
        done,
        yarnLock,
        this.hashGlobs
      );

      done.push(packageHash);
    }

    const internalPackagesHash = generateHashOfInternalPackages(done);
    const buildCommandHash = await hashStrings(this.buildCommandSignature);
    const combinedHash = await hashStrings([
      internalPackagesHash,
      buildCommandHash
    ]);

    logger.verbose(`Hash of internal packages: ${internalPackagesHash}`);
    logger.verbose(`Hash of build command: ${buildCommandHash}`);
    logger.verbose(`Combined hash: ${combinedHash}`);

    logger.profile("hasher:calculateHash");
    logger.setHash(combinedHash);

    return combinedHash;
  }
}
