import findUp from "find-up";
import { RushConfiguration } from "@microsoft/rush-lib";

import { WorkspaceInfo } from "../workspaces";

export function getRushWorkspaces(cwd: string): WorkspaceInfo {
  try {
    const rushJsonPath = findUp.sync("rush.json", { cwd });
    if (!rushJsonPath) {
      return [];
    }

    const rushConfig = RushConfiguration.loadFromConfigurationFile(
      rushJsonPath
    );

    return rushConfig.projects.map(project => {
      return { name: project.packageName, path: project.projectFolder };
    });
  } catch {
    return [];
  }
}
