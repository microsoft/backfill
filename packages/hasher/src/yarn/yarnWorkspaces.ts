import path from "path";
import fg from "fast-glob";
import findWorkspaceRoot from "find-yarn-workspace-root";

import { WorkspaceInfo, getWorkspacePackageInfo } from "../workspaces";

type PackageJsonWorkspaces = {
  workspaces?:
    | {
        packages?: string[];
        nohoist?: string[];
      }
    | string[];
};

function getYarnWorkspaceRoot(cwd: string): string {
  const yarnWorkspacesRoot = findWorkspaceRoot(cwd);

  if (!yarnWorkspacesRoot) {
    throw new Error("Could not find yarn workspaces root");
  }

  return yarnWorkspacesRoot;
}

function getRootPackageJson(yarnWorkspacesRoot: string) {
  const packageJson = require(path.join(yarnWorkspacesRoot, "package.json"));

  if (!packageJson) {
    throw new Error("Could not load package.json from workspaces root");
  }

  return packageJson;
}

function getPackages(packageJson: PackageJsonWorkspaces): string[] {
  const { workspaces } = packageJson;

  if (workspaces && Array.isArray(workspaces)) {
    return workspaces;
  }

  if (!workspaces || !workspaces.packages) {
    throw new Error("Could not find a workspaces object in package.json");
  }

  return workspaces.packages;
}

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

export function getYarnWorkspaces(cwd: string): WorkspaceInfo {
  try {
    const yarnWorkspacesRoot = getYarnWorkspaceRoot(cwd);
    const rootPackageJson = getRootPackageJson(yarnWorkspacesRoot);
    const packages = getPackages(rootPackageJson);
    const packagePaths = getPackagePaths(yarnWorkspacesRoot, packages);
    const workspaceInfo = getWorkspacePackageInfo(packagePaths);

    return workspaceInfo;
  } catch {
    return [];
  }
}
