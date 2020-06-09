import { Logger } from "backfill-logger";
import { findWorkspacePath, WorkspaceInfo } from "workspace-tools";
import { generateHashOfFiles } from "./hashOfFiles";
import {
  PackageHashInfo,
  getPackageHash,
  generateHashOfInternalPackages
} from "./hashOfPackage";
import { hashStrings, getPackageRoot } from "./helpers";
import { RepoInfo, getRepoInfo, getRepoInfoNoCache } from "./repoInfo";

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
  private repoInfo?: RepoInfo;

  constructor(
    private options: {
      packageRoot: string;
    },
    private logger: Logger
  ) {
    this.packageRoot = this.options.packageRoot;
  }

  public async createPackageHash(salt: string): Promise<string> {
    const tracer = this.logger.setTime("hashTime");

    const packageRoot = await getPackageRoot(this.packageRoot);

    this.repoInfo = await getRepoInfo(packageRoot);

    const { workspaceInfo } = this.repoInfo;

    const queue = [packageRoot];
    const done: PackageHashInfo[] = [];

    while (queue.length > 0) {
      const packageRoot = queue.shift();

      if (!packageRoot) {
        continue;
      }

      const packageHash = await getPackageHash(
        packageRoot,
        this.repoInfo,
        this.logger
      );

      addToQueue(packageHash.internalDependencies, queue, done, workspaceInfo);

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

  /**
   * Hash of output will hash the output files. This is meant to be used by validation and will not cache the repo hashes.
   * The validateOutput option should be used sparingly for performance reasons. It is meant to help be a debugging tool
   * to help investigate integrity of the cache.
   */
  public async hashOfOutput(): Promise<string> {
    const repoInfo = await getRepoInfoNoCache(this.packageRoot);

    return generateHashOfFiles(this.packageRoot, this.logger, repoInfo);
  }
}

export * from "./repoInfo";
