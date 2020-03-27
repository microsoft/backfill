import { CacheStorageConfig } from "backfill-config";

import { ICacheStorage } from "./CacheStorage";
import { AzureBlobCacheStorage } from "./AzureBlobCacheStorage";
import { LocalCacheStorage } from "./LocalCacheStorage";
import { NpmCacheStorage } from "./NpmCacheStorage";

export { ICacheStorage } from "./CacheStorage";

export function getCacheStorageProvider(
  cacheStorageConfig: CacheStorageConfig,
  internalCacheFolder: string,
  cwd: string = process.cwd()
): ICacheStorage {
  let cacheStorage: ICacheStorage;

  if (cacheStorageConfig.provider === "npm") {
    cacheStorage = new NpmCacheStorage(
      cacheStorageConfig.options,
      internalCacheFolder,
      cwd
    );
  } else if (cacheStorageConfig.provider === "azure-blob") {
    cacheStorage = new AzureBlobCacheStorage(cacheStorageConfig.options, cwd);
  } else {
    cacheStorage = new LocalCacheStorage(internalCacheFolder, cwd);
  }

  return cacheStorage;
}
