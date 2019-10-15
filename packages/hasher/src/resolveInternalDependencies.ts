import { PackageHashInfo } from "./hashOfPackage";
import {
  WorkspaceInfo,
  listOfWorkspacePackageNames,
  findWorkspacePath
} from "./yarnWorkspaces";

export type Dependencies = { [key in string]: string };

export function filterInternalDependencies(
  dependencies: Dependencies,
  workspaces: WorkspaceInfo
): string[] {
  const workspacePackageNames = listOfWorkspacePackageNames(workspaces);
  return Object.keys(dependencies).filter(
    dependency => workspacePackageNames.indexOf(dependency) >= 0
  );
}

function isDone(done: PackageHashInfo[], packageName: string): boolean {
  return Boolean(done.find(({ name }) => name === packageName));
}

function isInQueue(queue: string[], packagePath: string): boolean {
  return queue.indexOf(packagePath) >= 0;
}

export function addToQueue(
  name: string,
  dependencyPath: string,
  queue: string[],
  done: PackageHashInfo[]
): void {
  if (!isDone(done, name) && !isInQueue(queue, dependencyPath)) {
    queue.push(dependencyPath);
  }
}

export function resolveInternalDependencies(
  allDependencies: Dependencies,
  workspaces: WorkspaceInfo,
  queue: string[],
  done: PackageHashInfo[]
): string[] {
  const dependencyNames = filterInternalDependencies(
    allDependencies,
    workspaces
  );

  dependencyNames.forEach(name => {
    const dependencyPath = findWorkspacePath(workspaces, name);

    if (dependencyPath) {
      addToQueue(name, dependencyPath, queue, done);
    }
  });

  return dependencyNames;
}
