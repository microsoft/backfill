import * as chokidar from "chokidar";
import * as findUp from "find-up";
import * as path from "path";
import * as fs from "fs-extra";
import * as tempy from "tempy";
import anymatch from "anymatch";
import { logger } from "backfill-logger";
import { WatchGlobs } from "backfill-config";

let changedFilesOutsideScope: string[] = [];
let changedFilesInsideScope: string[] = [];

const END_AUDIT_FILEPATH = path.join(
  tempy.directory(),
  "END_AUDIT_FILENAME.txt"
);

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
  const folders = globPatterns.map(p => path.join("**", p, "**", "*"));
  const files = globPatterns.map(p => path.join("**", p));

  return [...folders, ...files];
}

export function initializeWatcher(
  packageRoot: string,
  internalCacheFolder: string,
  logFolder: string,
  outputFolder: string,
  watchGlobs: WatchGlobs
) {
  // Trying to find the git root and using it as an approximation of code boundary
  const repositoryRoot = getGitRepositoryRoot(packageRoot);

  // Empty the arrays
  changedFilesOutsideScope = [];
  changedFilesInsideScope = [];

  logger.info("Running in AUDIT mode");
  logger.info(`[audit] Watching file changes in: ${repositoryRoot}`);
  logger.info(`[audit] Backfill will cache folder: ${outputFolder}`);

  const excludeFolders = watchGlobs.folders.exclude;
  const excludeFiles = watchGlobs.files.exclude || [];

  // Define globs
  const ignoreGlobs = addGlobstars([
    ".git",
    ".cache",
    logFolder,
    internalCacheFolder,
    ...excludeFolders,
    ...excludeFiles
  ]);

  const cacheFolderGlob = path.join("**", outputFolder, "**");

  watcher = chokidar
    .watch([repositoryRoot, END_AUDIT_FILEPATH], {
      persistent: true,
      ignoreInitial: true,
      followSymlinks: false,
      ignored: ignoreGlobs
    })
    .on("all", (event, filePath) => {
      if (filePath === END_AUDIT_FILEPATH) {
        return;
      }

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

function showReportAndClose() {
  if (changedFilesOutsideScope.length > 0) {
    logger.warn(sideEffectWarningString);
    changedFilesOutsideScope.forEach(file => logger.warn(`- ${file}`));
    logger.warn(sideEffectCallToActionString);
  } else {
    logger.info(noSideEffectString);
  }
  watcher.close();
}

export async function closeWatcher() {
  const waitForEndAudit = new Promise(resolve => {
    const fallbackTimer = setTimeout(() => resolve(), 2500);

    watcher.on("all", (_, filePath) => {
      if (filePath === END_AUDIT_FILEPATH) {
        clearTimeout(fallbackTimer);
        resolve();
      }
    });

    fs.writeFileSync(END_AUDIT_FILEPATH, "");
  });

  await waitForEndAudit;

  showReportAndClose();
}
