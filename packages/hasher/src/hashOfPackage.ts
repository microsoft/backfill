import crypto from "crypto";
import path from "path";
import { Logger } from "backfill-logger";
import { resolveInternalDependencies } from "./resolveInternalDependencies";
import {
  resolveExternalDependencies,
  Dependencies,
} from "./resolveExternalDependencies";
import { generateHashOfFiles } from "./hashOfFiles";
import { hashStrings } from "./helpers";
import { RepoInfo } from "./repoInfo";

export type PackageHashInfo = {
  name: string;
  filesHash: string;
  dependenciesHash: string;
  internalDependencies: string[];
};

export type PackageDepsInfo = {
  name: string;
  packageRoot: string;
  externalDependencies: string[];
  internalDependencies: string[];
};

export function generateHashOfInternalPackages(
  internalPackages: PackageHashInfo[]
): string {
  internalPackages.sort((a, b) => a.name.localeCompare(b.name));

  const hasher = crypto.createHash("sha1");
  internalPackages.forEach((pkg) => {
    hasher.update(pkg.name);
    hasher.update(pkg.filesHash);
    hasher.update(pkg.dependenciesHash);
  });

  return hasher.digest("hex");
}

const memoization: { [key: string]: PackageHashInfo } = {};

export function getPackageDepsInfo(
  packageRoot: string,
  repoInfo: RepoInfo
): PackageDepsInfo {
  const { workspaceInfo, parsedLock } = repoInfo;
  const { name, dependencies, devDependencies } = require(path.join(
    packageRoot,
    "package.json"
  ));

  const allDependencies: Dependencies = {
    ...dependencies,
    ...devDependencies,
  };

  const internalDependencies = resolveInternalDependencies(
    allDependencies,
    workspaceInfo
  );

  const externalDependencies = resolveExternalDependencies(
    allDependencies,
    workspaceInfo,
    parsedLock
  );

  return {
    name,
    packageRoot,
    internalDependencies,
    externalDependencies,
  };
}

export function getPackageHash(
  depInfo: PackageDepsInfo,
  files: string[],
  repoInfo: RepoInfo,
  logger: Logger
): PackageHashInfo {
  const {
    name,
    packageRoot,
    internalDependencies,
    externalDependencies,
  } = depInfo;
  const memoizationKey = path.resolve(packageRoot);

  if (memoization[memoizationKey]) {
    return memoization[memoizationKey];
  }

  const resolvedDependencies = [
    ...internalDependencies,
    ...externalDependencies,
  ];
  console.log("before")
  const filesHash = generateHashOfFiles(files, repoInfo);
  const dependenciesHash = hashStrings(resolvedDependencies);
console.log("hi'")
  logger.silly(name);
  logger.silly(`  ${filesHash} (fileHash)`);
  logger.silly(`  ${dependenciesHash} (dependenciesHash)`);

  const packageHash = {
    name,
    filesHash,
    dependenciesHash,
    internalDependencies,
  };

  memoization[memoizationKey] = packageHash;

  return packageHash;
}
