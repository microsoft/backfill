import path from "path";
import findUp from "find-up";
import { sync as readYaml } from "read-yaml-file";

import { getPackagePaths } from "./getPackagePaths";
import { WorkspaceInfo, getWorkspacePackageInfo } from ".";

type PnpmWorkspaces = {
  packages: string[];
};

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
