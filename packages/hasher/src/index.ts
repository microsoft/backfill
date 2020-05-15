import { Logger } from "backfill-logger";
import { findWorkspacePath, WorkspaceInfo } from "workspace-tools";

import { generateHashOfFiles } from "./hashOfFiles";
import {
  PackageHashInfo,
  getPackageHash,
  generateHashOfInternalPackages
} from "./hashOfPackage";
import { hashStrings, getPackageRoot } from "./helpers";
import { RepoInfo, getRepoInfo } from "./repoInfo";

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
  private repoInfo?: RepoInfo;

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
        this.logger,
        this.hashGlobs
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

  public async hashOfOutput(): Promise<string> {
    // ensure this.repoInfo is generated
    if (!this.repoInfo) {
      throw new Error("make sure the createPackageHash is called first");
    }

    return generateHashOfFiles(
      this.packageRoot,
      this.outputGlob,
      this.logger,
      this.repoInfo
    );
  }
}

export * from "./repoInfo";
