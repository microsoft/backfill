import * as chokidar from "chokidar";
import * as findUp from "find-up";
import * as path from "path";
import anymatch from "anymatch";
import { logger } from "backfill-logger";
import { outputFolderAsArray } from "backfill-config";

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

function addGlobstars(globPatterns: string[]): string[] {
  const folders = globPatterns.map(p => path.posix.join("**", p, "**", "*"));
  const files = globPatterns.map(p => path.posix.join("**", p));

  return [...folders, ...files];
}

export function initializeWatcher(
  packageRoot: string,
  internalCacheFolder: string,
  logFolder: string,
  outputFolder: string | string[],
  hashGlobs: string[]
) {
  // Trying to find the git root and using it as an approximation of code boundary
  const repositoryRoot = getGitRepositoryRoot(packageRoot);

  // Empty the arrays
  changedFilesOutsideScope = [];
  changedFilesInsideScope = [];

  logger.info("Running in AUDIT mode");
  logger.info(`[audit] Watching file changes in: ${repositoryRoot}`);
  logger.info(`[audit] Backfill will cache folder: ${outputFolder}`);

  // Define globs
  const ignoreGlobs = addGlobstars([
    ".git",
    ".cache",
    logFolder,
    internalCacheFolder
  ]);

  const cacheFolderGlob = outputFolderAsArray(outputFolder).map(folder =>
    path.posix.join("**", folder, "**")
  );

  watcher = chokidar
    .watch(hashGlobs, {
      ignored: ignoreGlobs,
      cwd: repositoryRoot,
      persistent: true,
      ignoreInitial: true,
      followSymlinks: false,
      usePolling: true
    })
    .on("all", (event, filePath) => {
      const logLine = `${filePath} (${event})`;
      logger.silly(`[audit] File change: ${logLine}`);

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

async function delay(time: number) {
  return new Promise(resolve => {
    setTimeout(resolve, time);
  });
}

export async function closeWatcher() {
  // Wait for one second before closing, giving time for file changes to propagate
  await delay(1000);

  if (changedFilesOutsideScope.length > 0) {
    logger.warn(sideEffectWarningString);
    changedFilesOutsideScope.forEach(file => logger.warn(`- ${file}`));
    logger.warn(sideEffectCallToActionString);
  } else {
    logger.info(noSideEffectString);
  }
  watcher.close();
}
