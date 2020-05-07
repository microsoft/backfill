import path from "path";
import { getPackageDeps } from "@rushstack/package-deps-hash";
import globby from "globby";
import { hashStrings } from "./helpers";
import { fastFindUp } from "./workspaces/fastFindUp";

const repoHashes = new Map<string, { [key: string]: string }>();

// We have to force the types because globby types are wrong
export async function generateHashOfFiles(
  packageRoot: string,
  globs: string[]
): Promise<string> {
  let gitRoot = await fastFindUp(".git", packageRoot);

  if (!gitRoot) {
    throw new Error("backfill require this to be inside a git repo");
  }

  gitRoot = path.dirname(gitRoot);

  if (!repoHashes.has(gitRoot!)) {
    repoHashes.set(gitRoot, getPackageDeps(gitRoot).files);
  }

  const files = ((await globby(globs, {
    cwd: packageRoot,
    onlyFiles: false,
    objectMode: true
  })) as unknown) as { path: string; dirent: { isDirectory(): boolean } }[];

  files.sort((a, b) => a.path.localeCompare(b.path));

  const hashes: string[] = [];

  const repoFileHashes = repoHashes.get(gitRoot)!;

  for (const entry of files) {
    if (!entry.dirent.isDirectory()) {
      // if the entry is a file, use the "git hash-object" hash (which is a sha1 of path + size, but super fast, and potentially already cached)
      const normalized = (
        path
          .normalize(packageRoot)
          .replace(path.normalize(gitRoot), "")
          .replace(/\\/g, "/") +
        "/" +
        entry.path
      ).slice(1);

      if (!repoFileHashes[normalized]) {
        process.stdout.write("cannot find file " + normalized + "\n");
      }

      hashes.push(repoFileHashes[normalized]);
    } else {
      // if the entry is a directory, just put the directory in the hashes
      hashes.push(entry.path);
    }
  }

  return hashStrings(hashes);
}

export function _resetPackageDepsCache() {
  if ((global as any).__TEST__) {
    repoHashes.clear();
  }
}
