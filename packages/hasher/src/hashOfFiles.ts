import * as crypto from "crypto";
import * as fg from "fast-glob";
import * as fs from "fs-extra";
import * as path from "path";
import { createConfig } from "backfill-config";

export async function generateHashOfFiles(
  packageRoot: string
): Promise<string> {
  const { hashGlobs } = createConfig(packageRoot);

  const files = await fg(hashGlobs, {
    cwd: packageRoot,
    onlyFiles: false,
    objectMode: true
  });

  files.sort((a, b) => a.path.localeCompare(b.path));

  const hasher = crypto.createHash("sha1");
  files.forEach(file => {
    hasher.update(file.path);

    if (!file.dirent.isDirectory()) {
      const data = fs
        .readFileSync(path.join(packageRoot, file.path))
        .toString();
      hasher.update(data);
    }
  });

  return hasher.digest("hex");
}
