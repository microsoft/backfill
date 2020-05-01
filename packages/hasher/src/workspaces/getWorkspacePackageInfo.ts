import path from "path";
import { WorkspaceInfo } from "./WorkspaceInfo";

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
