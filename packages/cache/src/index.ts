import { CacheStorageConfig } from "backfill-config";
import { Reporter } from "backfill-reporting";

import { ICacheStorage } from "./CacheStorage";
import { AzureBlobCacheStorage } from "./AzureBlobCacheStorage";
import { LocalCacheStorage } from "./LocalCacheStorage";
import { NpmCacheStorage } from "./NpmCacheStorage";

export { ICacheStorage } from "./CacheStorage";

export function getCacheStorageProvider(
  cacheStorageConfig: CacheStorageConfig,
  internalCacheFolder: string,
  reporter: Reporter
): ICacheStorage {
  let cacheStorage: ICacheStorage;

  if (cacheStorageConfig.provider === "npm") {
    cacheStorage = new NpmCacheStorage(
      cacheStorageConfig.options,
      internalCacheFolder,
      reporter
    );
  } else if (cacheStorageConfig.provider === "azure-blob") {
    cacheStorage = new AzureBlobCacheStorage(
      cacheStorageConfig.options,
      reporter
    );
  } else {
    cacheStorage = new LocalCacheStorage(internalCacheFolder, reporter);
  }

  return cacheStorage;
}
