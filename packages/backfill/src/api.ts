import { Hasher } from "backfill-hasher";
import { createConfig } from "backfill-config";
import { getCacheStorageProvider } from "backfill-cache";
import { Logger } from "backfill-generic-logger";
import * as fs from "fs";

import * as fsExtra from "fs-extra";
import * as path from "path";

/*
 * Compute the hash for a given workspace, stores it on
 * disk for other commands to use.
 */
export async function computeHash(
  cwd: string,
  logger: Logger,
  salt: string
): Promise<string> {
  const config = createConfig(cwd);
  const { outputGlob, packageRoot } = config;
  const hasher = new Hasher({ packageRoot, outputGlob, logger }, salt);
  const hash = await hasher.createPackageHash();
  return hash;
}

/*
 * Fetch cached data from cache storage.
 */
export async function rehydrateFromCache(
  cwd: string,
  logger: Logger,
  salt: string
): Promise<void> {
  const config = createConfig(cwd);
  const {
    cacheStorageConfig,
    internalCacheFolder,
    outputGlob,
    packageRoot
  } = config;
  const cacheStorage = getCacheStorageProvider(
    cacheStorageConfig,
    path.join(cwd, internalCacheFolder),
    logger,
    cwd
  );
  const hasher = new Hasher({ packageRoot, outputGlob, logger }, salt);
  const hash = await hasher.createPackageHash();
  const fetch = await cacheStorage.fetch(hash);

  await fsExtra.mkdirp(path.join(packageRoot, "node_modules"));
  await fsExtra.writeJson(
    path.join(packageRoot, "node_modules", "cache-hit.json"),
    fetch
  );
}

/*
 * Returns whether the current workspace has a cache hit.
 * This can be used to only run build commands or uploade
 * the cache if we are in a cache miss situation.
 */
export async function isCacheHit(cwd: string): Promise<boolean> {
  try {
    fs.statSync(path.join(cwd, "node_modules", "cache-hit.json"));
    const content = await fs.promises.readFile(
      path.join(cwd, "node_modules", "cache-hit.json")
    );
    return JSON.parse(content.toString());
  } catch {
    return false;
  }
}

/*
 * Store the cache to the cache storage.
 *
 */
export async function populateCache(cwd: string, logger: Logger, salt: string) {
  const config = createConfig(cwd);
  const {
    cacheStorageConfig,
    internalCacheFolder,
    outputGlob,
    packageRoot
  } = config;
  const cacheStorage = getCacheStorageProvider(
    cacheStorageConfig,
    path.join(cwd, internalCacheFolder),
    logger,
    cwd
  );
  const hasher = new Hasher({ packageRoot, outputGlob, logger }, salt);

  const hash = await hasher.createPackageHash();
  await cacheStorage.put(hash, outputGlob);
}
