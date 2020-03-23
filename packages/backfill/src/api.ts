import { Hasher } from "backfill-hasher";
import { createConfig } from "backfill-config";

/*
 * Compute the hash for a given workspace, stores it on
 * disk for other commands to use.
 */
export async function computeHash(): Promise<string> {
  const config = createConfig();
  const {
    outputGlob,
    packageRoot
  } = config;
  const hasher = new Hasher(
    { packageRoot, outputGlob },
    "ci-pipeline"
  );
  const hash = await hasher.createPackageHash();
  return hash;
}

/*
 * Fetch cached data from cache storage.
 */
export async function rehydrateFromCache(): Promise<void> {
}

/*
 * Returns whether the current workspace has a cache hit.
 * This can be used to only run build commands or uploade
 * the cache if we are in a cache miss situation.
 */
export async function isCacheHit(): Promise<boolean> {
  return Promise.resolve(false);
}

/*
 * Store the cache to the cache storage.
 */
export function populateCache() {
}
