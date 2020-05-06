import { getPackageDeps } from "@rushstack/package-deps-hash";
import globby from "globby";
import { hashStrings } from "./helpers";

// We have to force the types because globby types are wrong
export async function generateHashOfFiles(
  packageRoot: string,
  globs: string[]
): Promise<string> {
  const files = ((await globby(globs, {
    cwd: packageRoot,
    onlyFiles: false,
    objectMode: true
  })) as unknown) as { path: string; dirent: { isDirectory(): boolean } }[];

  files.sort((a, b) => a.path.localeCompare(b.path));

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
}
