import * as crypto from "crypto";
import * as fg from "fast-glob";
import * as fs from "fs-extra";
import * as path from "path";

export async function generateHashOfFiles(
  hashGlobs: string[],
  packageRoot: string
): Promise<string> {
  const files = await fg(hashGlobs, {
    cwd: packageRoot,
    onlyFiles: false,
    objectMode: true
  });

  files.sort((a, b) => a.path.localeCompare(b.path));

  const hasher = crypto.createHash("sha1");
  const hashPromises = files.map(async file => {
    hasher.update(file.path);

    if (!file.dirent.isDirectory()) {
      const data = fs
        .readFileSync(path.join(packageRoot, file.path))
        .toString();
      hasher.update(data);
    }
  });

  await Promise.all(hashPromises);

  return hasher.digest("hex");
}
