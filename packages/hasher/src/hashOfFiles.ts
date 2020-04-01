import * as crypto from "crypto";
import * as fg from "fast-glob";
import * as fs from "fs-extra";
import * as path from "path";
import { createConfig } from "backfill-config";
import { Reporter } from "backfill-reporting";
import { hashStrings } from "./helpers";

const newline = /\r\n|\r|\n/g;
const LF = "\n";

export async function generateHashOfFiles(
  packageRoot: string,
  reporter: Reporter,
  glob?: string[]
): Promise<string> {
  if (!glob) {
    glob = createConfig(reporter, packageRoot).hashGlobs;
  }

  const files = await fg(glob, {
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
