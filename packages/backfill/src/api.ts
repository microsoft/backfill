/*
 * Compute the hash of all the workspaces and store it on disk.
 */
export async function populateHashesOfAllPackages(): Promise<void> {
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
