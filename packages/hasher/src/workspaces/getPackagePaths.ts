import path from "path";
import fg from "fast-glob";

export function getPackagePaths(
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
