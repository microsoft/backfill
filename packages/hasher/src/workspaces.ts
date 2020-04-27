import path from "path";
import fg from "fast-glob";
import findWorkspaceRoot from "find-yarn-workspace-root";
import findUp from "find-up";
import { getPnpmWorkspaces } from "./pnpm/pnpmWorkspace";

type PackageJsonWorkspaces = {
  workspaces?:
    | {
        packages?: string[];
        nohoist?: string[];
      }
    | string[];
};

export type WorkspaceInfo = { name: string; path: string }[];

function getYarnWorkspaceRoot(cwd: string): string {
  const yarnWorkspacesRoot = findWorkspaceRoot(cwd);

  if (yarnWorkspacesRoot) {
    return yarnWorkspacesRoot;
  }

  throw new Error("Could not find yarn workspaces root");
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

export function getWorkspaces(cwd: string): WorkspaceInfo {
  const yarnLockPath = findUp.sync("yarn.lock", { cwd });

  if (yarnLockPath) {
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

  const pnpmLockPath = findUp.sync("pnpm-lock.yaml", { cwd });

  if (pnpmLockPath) {
    try {
      return getPnpmWorkspaces(cwd);
    } catch {
      return [];
    }
  }

  return [];
}
