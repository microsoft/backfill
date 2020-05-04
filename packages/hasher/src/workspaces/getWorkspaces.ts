import findUp from "find-up";
import { getPnpmWorkspaces } from "./pnpmWorkspaces";
import { getYarnWorkspaces } from "./yarnWorkspaces";
import { getRushWorkspaces } from "./rushWorkspaces";
import { WorkspaceInfo } from "./WorkspaceInfo";

export function getWorkspaces(cwd: string): WorkspaceInfo {
  const yarnLockPath = findUp.sync("yarn.lock", { cwd });
  if (yarnLockPath) {
    return getYarnWorkspaces(cwd);
  }

  const pnpmLockPath = findUp.sync("pnpm-workspace.yaml", { cwd });
  if (pnpmLockPath) {
    return getPnpmWorkspaces(cwd);
  }

  const rushJsonPath = findUp.sync("rush.json", { cwd });
  if (rushJsonPath) {
    return getRushWorkspaces(cwd);
  }

  return [];
}
