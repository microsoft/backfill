import { Logger } from "backfill-logger";

import { generateHashOfFiles } from "./hashOfFiles";
import {
  PackageHashInfo,
  getPackageHash,
  generateHashOfInternalPackages
} from "./hashOfPackage";
import { hashStrings, getPackageRoot } from "./helpers";
import { parseLockFile } from "./lockfile";
import { getWorkspaces, findWorkspacePath, WorkspaceInfo } from "./workspaces";

export interface IHasher {
  createPackageHash: (salt: string) => Promise<string>;
  hashOfOutput: () => Promise<string>;
}

function isDone(done: PackageHashInfo[], packageName: string): boolean {
  return Boolean(done.find(({ name }) => name === packageName));
}

function isInQueue(queue: string[], packagePath: string): boolean {
  return queue.indexOf(packagePath) >= 0;
}

export function addToQueue(
  dependencyNames: string[],
  queue: string[],
  done: PackageHashInfo[],
  workspaces: WorkspaceInfo
): void {
  dependencyNames.forEach(name => {
    const dependencyPath = findWorkspacePath(workspaces, name);

    if (dependencyPath) {
      if (!isDone(done, name) && !isInQueue(queue, dependencyPath)) {
        queue.push(dependencyPath);
      }
    }
  });
}

export class Hasher implements IHasher {
  private packageRoot: string;
  private outputGlob: string[];
  private hashGlobs: string[];

  constructor(
    private options: {
      packageRoot: string;
      outputGlob: string[];
      hashGlobs: string[];
    },
    private logger: Logger
  ) {
    this.packageRoot = this.options.packageRoot;
    this.outputGlob = this.options.outputGlob;
    this.hashGlobs = this.options.hashGlobs;
  }

  public async createPackageHash(salt: string): Promise<string> {
    const tracer = this.logger.setTime("hashTime");

    const packageRoot = await getPackageRoot(this.packageRoot);
    const lockInfo = await parseLockFile(packageRoot);
    const workspaces = await getWorkspaces(packageRoot);

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
        lockInfo,
        this.logger,
        this.hashGlobs
      );

      addToQueue(packageHash.internalDependencies, queue, done, workspaces);

      done.push(packageHash);
    }

    const internalPackagesHash = generateHashOfInternalPackages(done);
    const buildCommandHash = hashStrings(salt);
    const combinedHash = hashStrings([internalPackagesHash, buildCommandHash]);

    this.logger.verbose(`Hash of internal packages: ${internalPackagesHash}`);
    this.logger.verbose(`Hash of build command: ${buildCommandHash}`);
    this.logger.verbose(`Combined hash: ${combinedHash}`);

    tracer.stop();
    this.logger.setHash(combinedHash);

    return combinedHash;
  }

  public async hashOfOutput(): Promise<string> {
    return generateHashOfFiles(this.packageRoot, this.outputGlob, this.logger);
  }
}
