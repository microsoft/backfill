import * as chokidar from "chokidar";
import * as findUp from "find-up";
import * as path from "path";
import anymatch from "anymatch";
import { logger } from "just-task-logger";

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

  logger.info(`Watching for file changes in: ${repositoryRoot}`);
  logger.info(`Backfill will cache: ${folderToCache}`);

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
      logger.verbose(logLine);

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
      logger.warn(
        "The following files got changed outside of the scope of the folder to be cached:"
      );

      changedFilesOutsideScope.forEach(file => logger.info(file));

      logger.warn(
        "You should make sure that these changes are non-essential, as they would not be brought back on a cache-hit."
      );
    } else {
      logger.info(
        "All observed file changes were within the scope of the folder to be cached."
      );
    }
    watcher.close();
  }, 1000);
}
