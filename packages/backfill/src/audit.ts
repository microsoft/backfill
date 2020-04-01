import * as chokidar from "chokidar";
import * as findUp from "find-up";
import * as path from "path";
import anymatch from "anymatch";
import { Reporter } from "backfill-reporting";
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
  outputGlob: string[],
  hashGlobs: string[],
  reporter: Reporter
) {
  // Trying to find the git root and using it as an approximation of code boundary
  const repositoryRoot = getGitRepositoryRoot(packageRoot);

  // Empty the arrays
  changedFilesOutsideScope = [];
  changedFilesInsideScope = [];

  reporter.info("Running in AUDIT mode");
  reporter.info(`[audit] Watching file changes in: ${repositoryRoot}`);
  reporter.info(`[audit] Backfill will cache folder: ${outputGlob}`);

  // Define globs
  const ignoreGlobs = addGlobstars([
    ".git",
    ".cache",
    logFolder,
    internalCacheFolder
  ]);
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
      reporter.silly(`[audit] File change: ${logLine}`);

      if (
        !anymatch(
          outputGlob.map(glob => path.posix.join("**", glob)),
          filePath
        )
      ) {
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

export async function closeWatcher(reporter: Reporter) {
  // Wait for one second before closing, giving time for file changes to propagate
  await delay(1000);

  if (changedFilesOutsideScope.length > 0) {
    reporter.warn(sideEffectWarningString);
    changedFilesOutsideScope.forEach(file => reporter.warn(`- ${file}`));
    reporter.warn(sideEffectCallToActionString);
  } else {
    reporter.info(noSideEffectString);
  }

  watcher.close();
}
