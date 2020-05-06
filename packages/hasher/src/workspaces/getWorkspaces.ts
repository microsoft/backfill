import { fastFindUp } from "./fastFindUp";
import { getPnpmWorkspaces } from "./pnpmWorkspaces";
import { getYarnWorkspaces } from "./yarnWorkspaces";
import { getRushWorkspaces } from "./rushWorkspaces";
import { WorkspaceInfo } from "./WorkspaceInfo";

const workspaceCache = new Map<string, WorkspaceInfo>();

/**
 * Gets workspace packages, get cached based on the kind of workspace
 * @param cwd
 */
export async function getWorkspaces(cwd: string): Promise<WorkspaceInfo> {
  const yarnLockPath = await fastFindUp("yarn.lock", cwd);
  if (yarnLockPath) {
    if (!workspaceCache.has("yarn")) {
      workspaceCache.set("yarn", getYarnWorkspaces(cwd));
    }
    return workspaceCache.get("yarn")!;
  }

  const pnpmLockPath = await fastFindUp("pnpm-workspace.yaml", cwd);
  if (pnpmLockPath) {
    if (!workspaceCache.has("pnpm")) {
      workspaceCache.set("pnpm", getPnpmWorkspaces(cwd));
    }
    return workspaceCache.get("pnpm")!;
  }

  const rushJsonPath = await fastFindUp("rush.json", cwd);
  if (rushJsonPath) {
    if (!workspaceCache.has("rush")) {
      workspaceCache.set("rush", getRushWorkspaces(cwd));
    }
    return workspaceCache.get("rush")!;
  }

  return [];
}
