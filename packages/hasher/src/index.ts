import { Logger } from "backfill-logger";
import { findWorkspacePath, WorkspaceInfo } from "workspace-tools";
import { generateHashOfFiles } from "./hashOfFiles";
import path from "path";
import {
  PackageHashInfo,
  getPackageHash,
  generateHashOfInternalPackages,
  getPackageDepsInfo,
  PackageDepsInfo,
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
  dependencyNames.forEach((name) => {
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
    const depInfoMap: Map<string, PackageDepsInfo> = new Map();

    const { workspaceInfo } = this.repoInfo;

    const queue = [packageRoot];
    const packageRootsToHash: string[] = [];
    const visited = new Set<string>();

    const done: PackageHashInfo[] = [];

    console.time("traverse");
    // gather a list of packags that to be hashed
    while (queue.length > 0) {
      const packageRoot = queue.shift();

      if (!packageRoot || visited.has(packageRoot)) {
        continue;
      }

      visited.add(packageRoot);
      packageRootsToHash.push(packageRoot);

      const depsInfo = getPackageDepsInfo(packageRoot, this.repoInfo);
      depInfoMap.set(packageRoot, depsInfo);
      addToQueue(depsInfo.internalDependencies, queue, done, workspaceInfo);
    }

    console.timeEnd("traverse");

    console.time("hashes");

    // Now generate the hashes for each package
    const packageFileMap: Map<string, string[]> = new Map();
    Object.keys(this.repoInfo.repoHashes).forEach((relativeFilePath) => {
      // search for a package that has this file
      const packageRoot = packageRootsToHash.find((packageRoot) => {
        const relativePackageRoot = path.relative(this.repoInfo!.root, packageRoot);
        return relativeFilePath.includes(relativePackageRoot);
      });
      if (packageRoot) {
        if (!packageFileMap.has(packageRoot)) {
          packageFileMap.set(packageRoot, []);
        }
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        packageFileMap.get(packageRoot)!.push(relativeFilePath);
      }
    });

    console.timeEnd("hashes");

    console.time("hash-packages");

    for (const packageRoot of packageRootsToHash) {
      done.push(
        getPackageHash(
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          depInfoMap.get(packageRoot)!,
          packageFileMap.get(packageRoot)!,
          this.repoInfo,
          this.logger
        )
      );
    }

    const internalPackagesHash = generateHashOfInternalPackages(done);
    console.timeEnd("hash-packages");

    const buildCommandHash = hashStrings(salt);
    const combinedHash = hashStrings([internalPackagesHash, buildCommandHash]);

    console.log(combinedHash);

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

    return generateHashOfFiles([], repoInfo);
  }
}

export * from "./repoInfo";
