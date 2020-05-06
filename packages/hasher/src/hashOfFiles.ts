import fg from "fast-glob";
import { getPackageDeps } from "@rushstack/package-deps-hash";

import { hashStrings } from "./helpers";

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

  try {
    const hashMap = getPackageDeps(packageRoot);
    const hashes: string[] = [];

    for (const entry of files) {
      if (!entry.dirent.isDirectory()) {
        // if the entry is a file, use the "git hash-object" hash (which is a sha1 of path + size, but super fast, and potentially already cached)
        hashes.push(hashMap.files[entry.path]);
      } else {
        // if the entry is a directory, just put the directory in the hashes
        hashes.push(entry.path);
      }
    }

    return hashStrings(hashes);
  } catch (e) {
    console.log("errored at ", files[0].path);
    throw new Error(e);
  }
}
