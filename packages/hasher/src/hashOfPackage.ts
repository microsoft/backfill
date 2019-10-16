import * as crypto from "crypto";
import * as path from "path";
import { logger } from "backfill-logger";

import { resolveInternalDependencies } from "./resolveInternalDependencies";
import { resolveExternalDependencies } from "./resolveExternalDependencies";
import { generateHashOfFiles } from "./hashOfFiles";
import { Dependencies } from "./resolveExternalDependencies";
import { hashStrings } from "./helpers";
import { ParsedYarnLock } from "./yarnLock";
import { WorkspaceInfo } from "./yarnWorkspaces";

export type PackageHashInfo = {
  name: string;
  filesHash: string;
  dependenciesHash: string;
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

export async function getPackageHash(
  packageRoot: string,
  workspaces: WorkspaceInfo,
  queue: string[],
  done: PackageHashInfo[],
  yarnLock: ParsedYarnLock,
  hashGlobs: string[]
): Promise<PackageHashInfo> {
  const { name, dependencies, devDependencies } = require(path.join(
    packageRoot,
    "package.json"
  ));

  const allDependencies: Dependencies = {
    ...dependencies,
    ...devDependencies
  };

  const resolvedDependencies = [
    ...resolveInternalDependencies(allDependencies, workspaces, queue, done),
    ...resolveExternalDependencies(allDependencies, workspaces, yarnLock)
  ];

  const filesHash = await generateHashOfFiles(hashGlobs, packageRoot);
  const dependenciesHash = hashStrings(resolvedDependencies);

  logger.silly(`filesHash of ${name}: ${filesHash}`);
  logger.silly(`dependenciesHash of ${name}: ${dependenciesHash}`);

  const packageHash = {
    name,
    filesHash,
    dependenciesHash
  };

  return packageHash;
}
