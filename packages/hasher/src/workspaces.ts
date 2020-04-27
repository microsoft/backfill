import path from "path";
import findUp from "find-up";
import { getPnpmWorkspaces } from "./pnpm/pnpmWorkspace";
import { getYarnWorkspaces } from "./yarn/yarnWorkspaces";

export type WorkspaceInfo = { name: string; path: string }[];

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
    return getYarnWorkspaces(cwd);
  }

  const pnpmLockPath = findUp.sync("pnpm-workspace.yaml", { cwd });

  if (pnpmLockPath) {
    return getPnpmWorkspaces(cwd);
  }

  return [];
}
