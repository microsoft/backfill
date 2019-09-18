import * as chokidar from "chokidar";
import * as findUp from "find-up";
import * as path from "path";
import anymatch from "anymatch";
import { logger } from "just-task-logger";
import { WatchGlobs } from "./config";

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
  logFolder: string,
  folderToCache: string,
  watchGlobs: WatchGlobs
) {
  // Trying to find the git root and using it as an approximation of code boundary
  const repositoryRoot = getGitRepositoryRoot(packageRoot);

  // Empty the arrays
  changedFilesOutsideScope = [];
  changedFilesInsideScope = [];

  logger.info("Running in AUDIT mode");
  logger.info(`[audit] Watching file changes in: ${repositoryRoot}`);
  logger.info(`[audit] Cache-folder: ${folderToCache}`);

  const excludeFolders = watchGlobs.folders.exclude;
  const excludeFiles = watchGlobs.files.exclude || [];

  // Define globs
  const ignoreGlobs = [
    localCacheFolder,
    logFolder,
    ".git",
    ".cache",
    ...excludeFolders
  ].map(p => path.join("**", p, "**", "*"));

  ignoreGlobs.push(...[".cache", ...excludeFiles].map(p => path.join("**", p)));

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
      logger.verbose(`[audit] ${logLine}`);

      if (!anymatch(cacheFolderGlob, filePath)) {
        changedFilesOutsideScope.push(logLine);
      } else {
        changedFilesInsideScope.push(logLine);
      }
    });
}

export const sideEffectWarningString =
  "[audit] The following files got changed outside of the scope of the folder to be cached:";
export const sideEffectCallToActionString =
  "[audit] You should make sure that these changes are non-essential, as they would not be brought back on a cache-hit.";
export const noSideEffectString =
  "[audit] All observed file changes were within the scope of the folder to be cached.";

export function closeWatcher() {
  // Wait for one second before closing, giving time for file changes to propagate
  // Bug: https://github.com/paulmillr/chokidar/issues/855
  setTimeout(() => {
    if (changedFilesOutsideScope.length > 0) {
      logger.warn(sideEffectWarningString);
      changedFilesOutsideScope.forEach(file => logger.warn(`[audit] ${file}`));
      logger.warn(sideEffectCallToActionString);
    } else {
      logger.info(noSideEffectString);
    }
    watcher.close();
  }, 2000);
}
