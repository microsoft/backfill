import * as path from "path";
import { promises as fs } from "fs";
import * as crypto from "crypto";
import pLimit from "p-limit";

let MAX_FILE_OPERATIONS = 5000;

try {
  const maxFileOpEnv = process.env["BACKFILL_MAX_FILE_OP"];
  if (maxFileOpEnv) {
    MAX_FILE_OPERATIONS = parseInt(maxFileOpEnv);
  }
} catch (_) {
  /* The env variable is not an integer, this is fine.*/
}

const diskLimit = pLimit(MAX_FILE_OPERATIONS);

// The first key is the file path, the second key is mtime
const memo = new Map<string, Map<number, string>>();

async function computeHash(filePath: string): Promise<string> {
  const fileBuffer = await diskLimit(() => {
    return fs.readFile(filePath);
  });
  // We use sha1 for perf reason and because the hashing is not used for security reason.
  const hashSum = crypto.createHash("sha1");
  hashSum.update(fileBuffer);
  const hash = hashSum.digest("hex");
  return hash;
}

/*
 * Get the hash of a file.
 * This function memoizes the hash for files and mtimes.
 */
export async function getFileHash(
  cwd: string,
  filePath: string
): Promise<string> {
  const fileAbsPath = path.join(cwd, filePath);
  const stat = await fs.stat(fileAbsPath);
  if (memo.has(fileAbsPath) && memo.get(fileAbsPath)!.has(stat.mtimeMs)) {
    return memo.get(fileAbsPath)!.get(stat.mtimeMs)!;
  }
  const hash = await computeHash(fileAbsPath);
  if (!memo.has(fileAbsPath)) {
    memo.set(fileAbsPath, new Map<number, string>());
  }
  memo.get(fileAbsPath)!.set(stat.mtimeMs, hash);
  return hash;
}
