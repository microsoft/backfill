import path from "path";
import findWorkspaceRoot from "find-yarn-workspace-root";

import { getPackagePaths } from "./getPackagePaths";
import { WorkspaceInfo, getWorkspacePackageInfo } from ".";

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
