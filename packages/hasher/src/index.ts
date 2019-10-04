import * as crypto from "crypto";
import * as fg from "fast-glob";
import * as findUp from "find-up";
import * as fs from "fs-extra";
import * as lockfile from "@yarnpkg/lockfile";
import * as path from "path";
import { logger } from "backfill-logger";

import getYarnWorkspaces from "./getYarnWorkspaces";

export interface IHasher {
  createPackageHash: () => Promise<string>;
}

type HasherOptions = {
  [key: string]: any;
};

type Dependencies = { [key in string]: string };

type ParsedYarnLock = {
  type: string;
  object: {
    [key in string]: {
      version: string;
      dependencies?: Dependencies;
    };
  };
};

type WorkspaceInfo = { name: string; path: string }[];

type ExternalDependenciesQueue = {
  name: string;
  versionRange: string;
}[];

type ProcessedPackage = {
  name: string;
  filesHash: string;
  dependenciesHash: string;
};

type ProcessedPackages = ProcessedPackage[];

export async function createHash(strings: string | string[]) {
  const hasher = crypto.createHash("sha1");

  const elements = typeof strings === "string" ? [strings] : strings;
  elements.forEach(element => hasher.update(element));

  return hasher.digest("hex");
}

async function getPackageRoot(cwd: string) {
  const packageRoot = await findUp("package.json", { cwd });

  if (!packageRoot) {
    throw new Error(`Could not find package.json inside ${cwd}.`);
  }

  return path.dirname(packageRoot);
}

async function parseLockFile(packageRoot: string) {
  const yarnLockPath = await findUp("yarn.lock", { cwd: packageRoot });

  if (!yarnLockPath) {
    throw new Error("Could not find a yarn.lock file");
  }

  const yarnLock = fs.readFileSync(yarnLockPath).toString();
  return lockfile.parse(yarnLock);
}

function getWorkspacePackageInfo(workspaces?: string[]): WorkspaceInfo {
  if (!workspaces) {
    return [];
  }

  return workspaces
    .map(workspace => {
      let name: string;

      try {
        name = require(path.join(workspace, "package.json")).name;
      } catch {
        return;
      }

      return {
        name,
        path: workspace
      };
    })
    .filter(Boolean) as WorkspaceInfo;
}

function listOfWorkspacePackageNames(workspaces: WorkspaceInfo) {
  return workspaces.map(({ name }) => name);
}

function filterInternalDependencies(
  dependencies: string[],
  workspaces: WorkspaceInfo
) {
  const workspacePackageNames = listOfWorkspacePackageNames(workspaces);
  return Object.keys(dependencies).filter(
    dependency => workspacePackageNames.indexOf(dependency) >= 0
  );
}

function filterExternalDependencies(
  dependencies: string[],
  workspaces: WorkspaceInfo
) {
  const workspacePackageNames = listOfWorkspacePackageNames(workspaces);
  return Object.keys(dependencies).filter(
    dependency => workspacePackageNames.indexOf(dependency) < 0
  );
}

function findWorkspacePath(workspaces: WorkspaceInfo, packageName: string) {
  const workspace = workspaces.find(({ name }) => name === packageName);

  if (workspace) {
    return workspace.path;
  }
}

function isEvaluated(
  processedPackages: ProcessedPackages,
  packageName: string
) {
  return processedPackages.find(({ name }) => name === packageName);
}

function isInQueue(queue: string[], packagePath: string) {
  return queue.indexOf(packagePath) >= 0;
}

function addNewInternalDependenciesToMainQueue(
  workspaces: WorkspaceInfo,
  name: string,
  processedPackages: ProcessedPackages,
  queue: string[]
) {
  const dependencyPath = findWorkspacePath(workspaces, name);

  if (!dependencyPath) {
    return;
  }

  if (
    !isEvaluated(processedPackages, name) &&
    !isInQueue(queue, dependencyPath)
  ) {
    queue.push(dependencyPath);
  }
}

function resolveInternalDependenciesAndAdd(
  dependencyNames: string[],
  processedDependencies: Set<string>,
  workspaces: WorkspaceInfo,
  processedPackages: ProcessedPackages,
  queue: string[]
) {
  dependencyNames.forEach(name => {
    addNewInternalDependenciesToMainQueue(
      workspaces,
      name,
      processedPackages,
      queue
    );

    processedDependencies.add(name);
  });
}

function enrichDependenciesWithVersionRanges(
  dependencyNames: string[],
  dependencies: Dependencies
) {
  return dependencyNames.map(name => ({
    name,
    versionRange: dependencies[name]
  }));
}

function createDependencySignature(name: string, version: string) {
  return `${name}@${version}`;
}

function queryLockFile(
  name: string,
  versionRange: string,
  yarnLock: ParsedYarnLock
) {
  const versionRangeSignature = createDependencySignature(name, versionRange);
  return yarnLock.object[versionRangeSignature];
}

function addExternalDependency(
  name: string,
  exactVersion: string,
  processedDependencies: Set<string>
) {
  const exactSignature = createDependencySignature(name, exactVersion);
  processedDependencies.add(exactSignature);
}

function addNewExternalDependenciesToQueue(
  dependencies: Dependencies | undefined,
  visited: Set<string>,
  queue: ExternalDependenciesQueue
) {
  if (dependencies) {
    Object.entries(dependencies).forEach(([name, versionRange]) => {
      const versionRangeSignature = createDependencySignature(
        name,
        versionRange
      );

      if (!visited.has(versionRangeSignature)) {
        queue.push({ name, versionRange });
      }
    });
  }
}

function resolveExternalDependenciesAndAdd(
  allDependencies: Dependencies,
  externalDependencies: string[],
  processedDependencies: Set<string>,
  yarnLock: ParsedYarnLock
) {
  const visited: Set<string> = new Set();

  const queue = enrichDependenciesWithVersionRanges(
    externalDependencies,
    allDependencies
  );

  while (queue.length > 0) {
    const next = queue.shift();

    if (!next) {
      continue;
    }

    const { name, versionRange } = next;

    const lockFileResult = queryLockFile(name, versionRange, yarnLock);

    if (lockFileResult) {
      const { version, dependencies } = lockFileResult;

      addExternalDependency(name, version, processedDependencies);
      addNewExternalDependenciesToQueue(dependencies, visited, queue);
    }

    visited.add(createDependencySignature(name, versionRange));
  }
}

async function generateHashOfFiles(packageRoot: string) {
  const files = await fg(["**/*"], {
    ignore: [
      "**/node_modules/**",
      "**/lib/**",
      "deps.js",
      "tsconfig.tsbuildinfo"
    ],
    cwd: packageRoot,
    onlyFiles: false,
    objectMode: true
  });

  files.sort((a, b) => a.path.localeCompare(b.path));

  const hasher = crypto.createHash("sha1");
  const hashPromises = files.map(async file => {
    hasher.update(file.name);

    if (!file.dirent.isDirectory()) {
      const data = await fs
        .readFile(path.join(packageRoot, file.path))
        .toString();
      hasher.update(data);
    }
  });

  await Promise.all(hashPromises);

  return hasher.digest("hex");
}

function generateHashOfDependencies(processedDependencies: Set<string>) {
  const dependencies = Array.from(processedDependencies);
  dependencies.sort((a, b) => a.localeCompare(b));

  const hasher = crypto.createHash("sha1");
  hasher.update(dependencies.toString());

  return hasher.digest("hex");
}

async function getPackageHash(
  packageRoot: string,
  workspaces: WorkspaceInfo,
  queue: string[],
  processedPackages: ProcessedPackages,
  yarnLock: ParsedYarnLock
): Promise<ProcessedPackage> {
  const { name, dependencies, devDependencies } = require(path.join(
    packageRoot,
    "package.json"
  ));

  const allDependencies = {
    ...dependencies,
    ...devDependencies
  };

  const internalDependencies = filterInternalDependencies(
    allDependencies,
    workspaces
  );

  const externalDependencies = filterExternalDependencies(
    allDependencies,
    workspaces
  );

  const processedDependencies: Set<string> = new Set();

  resolveInternalDependenciesAndAdd(
    internalDependencies,
    processedDependencies,
    workspaces,
    processedPackages,
    queue
  );

  resolveExternalDependenciesAndAdd(
    allDependencies,
    externalDependencies,
    processedDependencies,
    yarnLock
  );

  const filesHash = await generateHashOfFiles(packageRoot);
  const dependenciesHash = generateHashOfDependencies(processedDependencies);

  const packageHash = {
    name,
    filesHash,
    dependenciesHash
  };

  logger.silly(`filesHash of ${name}: ${filesHash}`);
  logger.silly(`dependenciesHash of ${name}: ${dependenciesHash}`);

  return packageHash;
}

function generateHashOfPackage(processedPackages: ProcessedPackages) {
  processedPackages.sort((a, b) => a.name.localeCompare(b.name));

  const hasher = crypto.createHash("sha1");
  processedPackages.forEach(pkg => {
    hasher.update(pkg.name);
    hasher.update(pkg.filesHash);
    hasher.update(pkg.dependenciesHash);
  });

  return hasher.digest("hex");
}

export class Hasher implements IHasher {
  packageRoot: string;

  constructor(
    private options: HasherOptions,
    private buildCommandSignature: string
  ) {
    this.packageRoot = this.options.packageRoot;
  }

  public async createPackageHash(): Promise<string> {
    logger.profile("hasher:calculateHash");

    const packageRoot = await getPackageRoot(this.packageRoot);
    const yarnLock = await parseLockFile(packageRoot);

    const workspacePaths = getYarnWorkspaces(packageRoot);
    const workspaces = getWorkspacePackageInfo(workspacePaths);

    const processedPackages: ProcessedPackages = [];
    const queue = [packageRoot];

    while (queue.length > 0) {
      const packageRoot = queue.shift();

      if (!packageRoot) {
        continue;
      }

      const packageHash = await getPackageHash(
        packageRoot,
        workspaces,
        queue,
        processedPackages,
        yarnLock
      );

      processedPackages.push(packageHash);
    }

    const allPackagesHash = generateHashOfPackage(processedPackages);
    const buildCommandHash = await createHash(this.buildCommandSignature);
    const packageHash = await createHash([allPackagesHash, buildCommandHash]);

    logger.verbose(`Hash of all packages: ${allPackagesHash}`);
    logger.verbose(`Hash of build command: ${buildCommandHash}`);
    logger.verbose(`Hash of package: ${packageHash}`);

    logger.profile("hasher:calculateHash");
    logger.setHash(packageHash);

    return packageHash;
  }
}
