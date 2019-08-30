import * as chokidar from "chokidar";
import * as findUp from "find-up";
import * as path from "path";
import anymatch from "anymatch";
import chalk from "chalk";

let changedFilesOutsideScope: string[] = [];
let changedFilesInsideScope: string[] = [];

let watcher: chokidar.FSWatcher;

function getGitRepositoryRoot(packageRoot: string) {
  const nearestGitFolder = findUp.sync(".git", {
    cwd: packageRoot,
    type: "directory"
  });

  if (nearestGitFolder) {
    // Return the parent folder of some/path/.git
    return path.join(nearestGitFolder, "..");
  }

  return packageRoot;
}

export function initializeWatcher(
  packageRoot: string,
  localCacheFolder: string,
  telemetryFileFolder: string,
  folderToCache: string
) {
  // Trying to find the git root and using it as an approximation of code boundary
  const repositoryRoot = getGitRepositoryRoot(packageRoot);

  // Empty the arrays
  changedFilesOutsideScope = [];
  changedFilesInsideScope = [];

  console.log(`[info] Watching for file changes in: ${repositoryRoot}`);
  console.log(`[info] Backfill will cache: ${folderToCache}`);

  // Define globs
  const ignoreGlobs = [
    localCacheFolder,
    telemetryFileFolder,
    ".git",
    ".cache"
  ].map(p => path.join("**", p, "**"));
  const cacheFolderGlob = path.join("**", folderToCache, "**");

  watcher = chokidar
    .watch(repositoryRoot, {
      persistent: true,
      ignoreInitial: true,
      followSymlinks: false,
      ignored: ignoreGlobs
    })
    .on("all", (event, filePath) => {
      const logLine = `${filePath} (${event})`;

      if (!anymatch(cacheFolderGlob, filePath)) {
        changedFilesOutsideScope.push(logLine);
      } else {
        changedFilesInsideScope.push(logLine);
      }
    });
}

export function closeWatcher() {
  // Wait for one second before closing, giving time for file changes to propagate
  setTimeout(() => {
    if (changedFilesOutsideScope.length > 0) {
      console.log(
        chalk.bold.yellow(
          "[warning] The following files got changed outside of the scope of the folder to be cached:"
        )
      );

      changedFilesOutsideScope.forEach(file => console.log(file));

      console.log(
        chalk.yellow(
          "You should make sure that these changes are non-essential, as they would not be brought back on a cache-hit."
        )
      );
    } else {
      console.log(
        chalk.bold.green(
          "[success] All observed file changes were within the scope of the folder to be cached."
        )
      );
    }
    watcher.close();
  }, 1000);
}
