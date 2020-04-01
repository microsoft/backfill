import { generateHashOfFiles } from "./hashOfFiles";
import {
  PackageHashInfo,
  getPackageHash,
  generateHashOfInternalPackages
} from "./hashOfPackage";
import { hashStrings, getPackageRoot } from "./helpers";
import { parseLockFile } from "./yarnLock";
import {
  getYarnWorkspaces,
  findWorkspacePath,
  WorkspaceInfo
} from "./yarnWorkspaces";
import { Reporter } from "backfill-reporting";

export interface IHasher {
  createPackageHash: () => Promise<string>;
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

  constructor(
    private options: { packageRoot: string; outputGlob: string[] },
    private buildCommandSignature: string,
    private reporter: Reporter
  ) {
    this.packageRoot = this.options.packageRoot;
    this.outputGlob = this.options.outputGlob;
  }

  public async createPackageHash(): Promise<string> {
    const tracer = this.reporter.traceOperation("hasher:calculateHash");

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
        yarnLock,
        this.reporter
      );

      addToQueue(packageHash.internalDependencies, queue, done, workspaces);

      done.push(packageHash);
    }

    const internalPackagesHash = generateHashOfInternalPackages(done);
    const buildCommandHash = await hashStrings(this.buildCommandSignature);
    const combinedHash = await hashStrings([
      internalPackagesHash,
      buildCommandHash
    ]);

    this.reporter.verbose(`Hash of internal packages: ${internalPackagesHash}`);
    this.reporter.verbose(`Hash of build command: ${buildCommandHash}`);
    this.reporter.verbose(`Combined hash: ${combinedHash}`);

    tracer.stop();
    this.reporter.reportBuilder.setHash(combinedHash);

    return combinedHash;
  }

  public async hashOfOutput(): Promise<string> {
    return generateHashOfFiles(
      this.packageRoot,
      this.reporter,
      this.outputGlob
    );
  }
}
