import crypto from "crypto";
import path from "path";
import globby from "globby";
import fs from "fs-extra";
import findUp from "find-up";

import { hashStrings } from "./helpers";

const newline = /\r\n|\r|\n/g;
const LF = "\n";

export async function generateHashOfFiles(
  packageRoot: string
): Promise<string> {
  const nearestGitFolder = await findUp(".git", {
    cwd: packageRoot,
    type: "directory"
  });

  if (nearestGitFolder === undefined) {
    throw new Error(
      `It does not seem that this package is in a git repo: ${packageRoot}`
    );
  }

  const repoRoot = path.dirname(nearestGitFolder);

  // If the package is a git repo by itself then the search pattern is all the files
  const relativePackagePath = path.relative(repoRoot, packageRoot) || "**/*";

  // Note: globby does not support objectMode
  const files = await globby(relativePackagePath, {
    cwd: repoRoot,
    gitignore: true
  });

  files.sort((a, b) => a.localeCompare(b));

  const hashes = await Promise.all(
    files.map(async file => {
      const hasher = crypto.createHash("sha1");
      hasher.update(file);

      const fileBuffer = await fs.readFile(path.join(repoRoot, file));
      const data = fileBuffer.toString().replace(newline, LF);
      hasher.update(data);

      return hasher.digest("hex");
    })
  );

  return hashStrings(hashes);
}
