import path from "path";
import globby from "globby";

export function getPackagePaths(
  workspacesRoot: string,
  packages: string[]
): string[] {
  const packagePaths = packages.map(glob =>
    globby.sync(glob, {
      cwd: workspacesRoot,
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
