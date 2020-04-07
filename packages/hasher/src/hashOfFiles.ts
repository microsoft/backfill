import crypto from "crypto";
import path from "path";
import fg from "fast-glob";
import fs from "fs-extra";

import { hashStrings } from "./helpers";

const newline = /\r\n|\r|\n/g;
const LF = "\n";

export async function generateHashOfFiles(
  packageRoot: string,
  globs: string[]
): Promise<string> {
  const files = await fg(globs, {
    cwd: packageRoot,
    onlyFiles: false,
    objectMode: true
  });

  files.sort((a, b) => a.path.localeCompare(b.path));

  const hashes = await Promise.all(
    files.map(async file => {
      const hasher = crypto.createHash("sha1");
      hasher.update(file.path);

      if (!file.dirent.isDirectory()) {
        const fileBuffer = await fs.readFile(path.join(packageRoot, file.path));
        const data = fileBuffer.toString().replace(newline, LF);
        hasher.update(data);
      }

      return hasher.digest("hex");
    })
  );

  return hashStrings(hashes);
}
