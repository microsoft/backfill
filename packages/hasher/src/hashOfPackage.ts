import crypto from "crypto";
import path from "path";

import { Logger } from "backfill-logger";
import { WorkspaceInfo, ParsedLock } from "workspace-tools";

import { resolveInternalDependencies } from "./resolveInternalDependencies";
import {
  resolveExternalDependencies,
  Dependencies
} from "./resolveExternalDependencies";
import { generateHashOfFiles } from "./hashOfFiles";

import { hashStrings } from "./helpers";

export type PackageHashInfo = {
  name: string;
  filesHash: string;
  dependenciesHash: string;
  internalDependencies: string[];
};

export function generateHashOfInternalPackages(
  internalPackages: PackageHashInfo[]
): string {
  internalPackages.sort((a, b) => a.name.localeCompare(b.name));

  const hasher = crypto.createHash("sha1");
  internalPackages.forEach(pkg => {
    hasher.update(pkg.name);
    hasher.update(pkg.filesHash);
    hasher.update(pkg.dependenciesHash);
  });

  return hasher.digest("hex");
}

const memoization: { [key: string]: PackageHashInfo } = {};

export async function getPackageHash(
  packageRoot: string,
  workspaces: WorkspaceInfo,
  yarnLock: ParsedLock,
  logger: Logger,
  hashGlobs: string[]
): Promise<PackageHashInfo> {
  const memoizationKey = path.resolve(packageRoot);

  if (memoization[memoizationKey]) {
    return memoization[memoizationKey];
  }

  const { name, dependencies, devDependencies } = require(path.join(
    packageRoot,
    "package.json"
  ));

  const allDependencies: Dependencies = {
    ...dependencies,
    ...devDependencies
  };

  const internalDependencies = resolveInternalDependencies(
    allDependencies,
    workspaces
  );

  const externalDeoendencies = resolveExternalDependencies(
    allDependencies,
    workspaces,
    yarnLock
  );

  const resolvedDependencies = [
    ...internalDependencies,
    ...externalDeoendencies
  ];

  const filesHash = await generateHashOfFiles(packageRoot, hashGlobs, logger);
  const dependenciesHash = hashStrings(resolvedDependencies);

  logger.silly(name);
  logger.silly(`  ${filesHash} (fileHash)`);
  logger.silly(`  ${dependenciesHash} (dependenciesHash)`);

  const packageHash = {
    name,
    filesHash,
    dependenciesHash,
    internalDependencies
  };

  memoization[memoizationKey] = packageHash;

  return packageHash;
}
