import path from "path";
import fg from "fast-glob";
import findUp from "find-up";
import { sync as readYaml } from "read-yaml-file";

import { WorkspaceInfo, getWorkspacePackageInfo } from "../workspaces";

type PnpmWorkspaces = {
  packages: string[];
};

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
    const pnpmWorkspacesFile = findUp.sync("pnpm-workspace.yaml", { cwd });
    if (!pnpmWorkspacesFile) {
      return [];
    }

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
