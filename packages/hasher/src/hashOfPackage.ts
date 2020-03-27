import * as crypto from "crypto";
import * as path from "path";
import * as fs from "fs";
import * as fsExtra from "fs-extra";
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

export async function getPackageHash(
  packageRoot: string,
  workspaces: WorkspaceInfo,
  yarnLock: ParsedYarnLock
): Promise<PackageHashInfo> {
  const cacheFile = path.join(
    packageRoot,
    "node_modules",
    "backfill-hash.json"
  );

  try {
    const cachedValue = await fs.promises.readFile(cacheFile);
    const result = JSON.parse(cachedValue.toString());
    return result;
  } catch {}

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

  const filesHash = await generateHashOfFiles(packageRoot);

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

  await fsExtra.mkdirp(path.dirname(cacheFile));
  await fs.promises.writeFile(cacheFile, JSON.stringify(packageHash));

  return packageHash;
}
