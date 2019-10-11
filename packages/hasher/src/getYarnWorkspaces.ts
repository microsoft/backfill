import * as path from "path";
import * as fg from "fast-glob";

import * as findWorkspaceRoot from "find-yarn-workspace-root";

type PackageJsonWorkspaces = {
  workspaces?:
    | {
        packages?: string[];
        nohoist?: string[];
      }
    | string[];
};

function getYarnWorkspaceRoot(cwd: string) {
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

function getPackages(packageJson: PackageJsonWorkspaces) {
  const { workspaces } = packageJson;

  if (!workspaces) {
    throw new Error("Could not find a workspaces object in package.json");
  }

  if (Array.isArray(workspaces)) {
    return workspaces;
  }

  if (!workspaces.packages) {
    throw new Error("Could not find a workspaces object in package.json");
  }

  return workspaces.packages;
}

function getPackagePaths(yarnWorkspacesRoot: string, packages: string[]) {
  const packagePaths = packages.map(name =>
    fg.sync(name, {
      cwd: yarnWorkspacesRoot,
      onlyDirectories: true,
      absolute: true
    })
  );

  return packagePaths.reduce((acc, cur) => {
    return [...acc, ...cur];
  });
}

export default function getYarnWorkspaces(cwd: string) {
  try {
    const yarnWorkspacesRoot = getYarnWorkspaceRoot(cwd);
    const rootPackageJson = getRootPackageJson(yarnWorkspacesRoot);
    const packages = getPackages(rootPackageJson);
    const packagePaths = getPackagePaths(yarnWorkspacesRoot, packages);

    return packagePaths;
  } catch {
    return [];
  }
}
