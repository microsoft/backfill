import * as findUp from "find-up";
import * as fs from "fs-extra";
import * as lockfile from "@yarnpkg/lockfile";

import { Dependencies } from "./resolveExternalDependencies";
import { nameAtVersion } from "./helpers";

type YarnLockDependency = {
  version: string;
  dependencies?: Dependencies;
};

export type ParsedYarnLock = {
  type: "success" | "merge" | "conflict";
  object: {
    [key in string]: YarnLockDependency;
  };
};

const lockFiles: { [key: string]: ParsedYarnLock } = {};

export async function parseLockFile(
  packageRoot: string
): Promise<ParsedYarnLock> {
  const yarnLockPath = await findUp("yarn.lock", { cwd: packageRoot });

  if (yarnLockPath && lockFiles[yarnLockPath]) {
    return lockFiles[yarnLockPath];
  }

  if (!yarnLockPath) {
    throw new Error(
      "Could not find a yarn.lock file. The hashing algorithm requires you to use yarn."
    );
  }

  const yarnLock = fs.readFileSync(yarnLockPath).toString();
  const parsed = lockfile.parse(yarnLock);
  lockFiles[yarnLockPath] = parsed;
  return parsed;
}

export function queryLockFile(
  name: string,
  versionRange: string,
  yarnLock: ParsedYarnLock
): YarnLockDependency {
  const versionRangeSignature = nameAtVersion(name, versionRange);
  return yarnLock.object[versionRangeSignature];
}
