// This file is based on @rushstack/package-deps-hash getPackageDeps but avoids its extra dependencies
// and clarifies naming and docs. The original usage was intended for a single package, but the way
// it's historically been used by backfill is to get hashes for the entire repo's files.
// https://github.com/microsoft/rushstack/blob/main/libraries/package-deps-hash/src/getPackageDeps.ts

import * as path from "path";
import { git } from "workspace-tools";

/**
 * Parses a quoted filename sourced from the output of the "git status" command.
 *
 * Paths with non-standard characters will be enclosed with double-quotes, and non-standard
 * characters will be backslash escaped (ex. double-quotes, non-ASCII characters). The
 * escaped chars can be included in one of two ways:
 * - backslash-escaped chars (ex. `\"`)
 * - octal encoded chars (ex. `\347`)
 *
 * See documentation: https://git-scm.com/docs/git-status
 */
export function _parseGitFilename(filename: string): string {
  // If there are no double-quotes around the string, then there are no escaped characters
  // to decode, so just return
  if (!(filename[0] === '"' && filename.endsWith('"'))) {
    return filename;
  }

  // Need to hex encode '%' since we will be decoding the converted octal values from hex
  filename = filename.replace(/%/g, "%25");
  // Replace all instances of octal literals with percent-encoded hex (ex. '\347\275\221' -> '%E7%BD%91').
  // This is done because the octal literals represent UTF-8 bytes, and by converting them to percent-encoded
  // hex, we can use decodeURIComponent to get the Unicode chars.
  filename = filename.replace(
    /(?:\\(\d{1,3}))/g,
    (match, ...[octalValue, index, source]) => {
      // We need to make sure that the backslash is intended to escape the octal value. To do this, walk
      // backwards from the match to ensure that it's already escaped.
      const trailingBackslashes: RegExpMatchArray | null = (source as string)
        .slice(0, index as number)
        .match(/\\*$/);
      return trailingBackslashes?.length &&
        trailingBackslashes[0].length % 2 === 0
        ? `%${parseInt(octalValue, 8).toString(16)}`
        : match;
    }
  );

  // Finally, decode the filename and unescape the escaped UTF-8 chars
  return JSON.parse(decodeURIComponent(filename));
}

/**
 * Parses the output of the "git ls-tree" command
 */
export function _parseGitLsTree(output: string): Record<string, string> {
  const changes: Record<string, string> = {};

  if (!output) {
    return changes;
  }

  // A line is expected to look like:
  // 100644 blob 3451bccdc831cb43d7a70ed8e628dcf9c7f888c8    src/typings/tsd.d.ts
  // 160000 commit c5880bf5b0c6c1f2e2c43c95beeb8f0a808e8bac  rushstack
  const gitRegex = /([0-9]{6})\s(blob|commit)\s([a-f0-9]{40})\s*(.*)/;

  // Note: The output of git ls-tree uses \n newlines regardless of OS.
  const outputLines = output.trim().split("\n");
  for (const line of outputLines) {
    if (!line) continue;

    // Take everything after the "100644 blob", which is just the hash and filename
    const matches = line.match(gitRegex);
    if (matches && matches[3] && matches[4]) {
      const hash: string = matches[3];
      const filename: string = _parseGitFilename(matches[4]);

      changes[filename] = hash;
    } else {
      throw new Error(`Cannot parse git ls-tree input: "${line}"`);
    }
  }

  return changes;
}

/**
 * Parses the output of the "git status" command
 */
function _parseGitStatus(output: string): Map<string, string> {
  const changes = new Map<string, string>();

  /*
   * Typically, output will look something like:
   * M temp_modules/rush-package-deps-hash/package.json
   * D package-deps-hash/src/index.ts
   */

  // If there was an issue with `git ls-tree`, or there are no current changes, processOutputBlocks[1]
  // will be empty or undefined
  if (!output) {
    return changes;
  }

  // Note: The output of git hash-object uses \n newlines regardless of OS.
  const outputLines = output.trim().split("\n");
  for (const line of outputLines) {
    /*
     * changeType is in the format of "XY" where "X" is the status of the file in the index and "Y" is the status of
     * the file in the working tree. Some example statuses:
     *   - 'D' == deletion
     *   - 'M' == modification
     *   - 'A' == addition
     *   - '??' == untracked
     *   - 'R' == rename
     *   - 'RM' == rename with modifications
     *   - '[MARC]D' == deleted in work tree
     * Full list of examples: https://git-scm.com/docs/git-status#_short_format
     */
    const match = line.match(/("(\\"|[^"])+")|(\S+\s*)/g);

    if (match && match.length > 1) {
      const [changeType, ...filenameMatches] = match;

      // We always care about the last filename in the filenames array. In the case of non-rename changes,
      // the filenames array only contains one file, so we can join all segments that were split on spaces.
      // In the case of rename changes, the last item in the array is the path to the file in the working tree,
      // which is the only one that we care about. It is also surrounded by double-quotes if spaces are
      // included, so no need to worry about joining different segments
      let lastFilename: string = changeType.startsWith("R")
        ? filenameMatches[filenameMatches.length - 1]
        : filenameMatches.join("");
      lastFilename = _parseGitFilename(lastFilename);

      changes.set(lastFilename, changeType.trimRight());
    }
  }

  return changes;
}

/**
 * Takes a list of files and returns the current git hashes for them
 */
function _getGitHashForFiles(
  filesToHash: string[],
  cwd: string
): Map<string, string> {
  const changes = new Map<string, string>();

  if (!filesToHash.length) {
    return changes;
  }

  // Use --stdin-paths arg to pass the list of files to git in order to avoid issues with
  // command length
  const result = git(["hash-object", "--stdin-paths"], {
    input: filesToHash.map((x) => path.resolve(cwd, x)).join("\n"),
    throwOnError: true,
    cwd,
  });

  // The result of "git hash-object" will be a list of file hashes delimited by newlines
  const hashes = result.stdout.trim().split("\n");

  if (hashes.length !== filesToHash.length) {
    throw new Error(
      `Passed ${filesToHash.length} file paths to Git to hash, but received ${hashes.length} hashes.`
    );
  }

  for (let i = 0; i < hashes.length; i++) {
    changes.set(filesToHash[i], hashes[i]);
  }

  return changes;
}

/**
 * Builds an object containing hashes (`git hash-object`) for the files under `cwd`.
 * This includes tracked and untracked files, but not ignored files.
 * @param cwd - Include hashes of files under this folder
 * @returns Mapping from file path relative to `cwd` (forward slashes) to hash
 */
export function getFileHashes(cwd: string): Record<string, string> {
  const gitLsOutput = git(["ls-tree", "HEAD", "-r"], {
    cwd,
    throwOnError: true,
  }).stdout;

  // Add all the checked in hashes
  const result = _parseGitLsTree(gitLsOutput);

  // Update the checked in hashes with the current repo status.
  // -s - Short format. Will be printed as 'XY PATH' or 'XY ORIG_PATH -> PATH'. Paths with non-standard
  //      characters will be escaped using double-quotes, and non-standard characters will be backslash
  //      escaped (ex. spaces, tabs, double-quotes)
  // -u - Untracked files are included
  const gitStatusOutput = git(["status", "-s", "-u", "."], {
    cwd,
    throwOnError: true,
  }).stdout;

  const currentlyChangedFiles = _parseGitStatus(gitStatusOutput);
  const filesToHash: string[] = [];

  for (const [filename, changeType] of currentlyChangedFiles) {
    // See comments inside parseGitStatus() for more information
    if (
      changeType === "D" ||
      (changeType.length === 2 && changeType.charAt(1) === "D")
    ) {
      delete result[filename];
    } else {
      filesToHash.push(filename);
    }
  }

  const currentlyChangedFileHashes = _getGitHashForFiles(filesToHash, cwd);
  for (const [filename, hash] of currentlyChangedFileHashes) {
    result[filename] = hash;
  }

  return result;
}
