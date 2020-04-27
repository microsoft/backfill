import path from "path";
import fg from "fast-glob";
import findUp from "find-up";

import { sync as readYaml } from "read-yaml-file";

type PnpmWorkspaces = {
  packages: string[];
};

export type WorkspaceInfo = { name: string; path: string }[];

function getPackagePaths(
  yarnWorkspacesRoot: string,
  packages: string[]
): string[] {
  const packagePaths = packages.map(glob =>
    fg.sync(glob, {
      cwd: yarnWorkspacesRoot,
      onlyDirectories: true,
      absolute: true
    })
  );

  /*
   * fast-glob returns unix style path,
   * so we use path.join to align the path with the platform.
   */
  return packagePaths
    .reduce((acc, cur) => {
      return [...acc, ...cur];
    })
    .map(p => path.join(p));
}

export function getWorkspacePackageInfo(
  workspacePaths: string[]
): WorkspaceInfo {
  if (!workspacePaths) {
    return [];
  }

  return workspacePaths.reduce<WorkspaceInfo>((returnValue, workspacePath) => {
    let name: string;

    try {
      name = require(path.join(workspacePath, "package.json")).name;
    } catch {
      return returnValue;
    }

    return [
      ...returnValue,
      {
        name,
        path: workspacePath
      }
    ];
  }, []);
}

export function listOfWorkspacePackageNames(
  workspaces: WorkspaceInfo
): string[] {
  return workspaces.map(({ name }) => name);
}

export function findWorkspacePath(
  workspaces: WorkspaceInfo,
  packageName: string
): string | undefined {
  const workspace = workspaces.find(({ name }) => name === packageName);

  if (workspace) {
    return workspace.path;
  }
}

export function getPnpmWorkspaces(cwd: string): WorkspaceInfo {
  try {
    const pnpmWorkspacesFile = findUp.sync("pnpm-workspace.yaml", { cwd })!;
    const pnpmWorkspacesRoot = path.dirname(pnpmWorkspacesFile);

    const pnpmWorkspaces = readYaml<PnpmWorkspaces>(pnpmWorkspacesFile);

    const packagePaths = getPackagePaths(
      pnpmWorkspacesRoot,
      pnpmWorkspaces.packages
    );
    const workspaceInfo = getWorkspacePackageInfo(packagePaths);

    return workspaceInfo;
  } catch {
    return [];
  }
}
