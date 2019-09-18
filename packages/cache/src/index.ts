import { ICacheStorage } from "./CacheStorage";
import { AzureBlobCacheStorage } from "./AzureBlobCacheStorage";
import { LocalCacheStorage } from "./LocalCacheStorage";
import { NpmCacheStorage } from "./NpmCacheStorage";

import { CacheStorageConfig } from "backfill-config";

export { ICacheStorage } from "./CacheStorage";

export function getCacheStorageProvider(
  cacheStorageConfig: CacheStorageConfig,
  localCacheFolder: string
): ICacheStorage {
  switch (cacheStorageConfig.provider) {
    case "npm":
      return new NpmCacheStorage(cacheStorageConfig.options, localCacheFolder);
    case "azure-blob":
      return new AzureBlobCacheStorage(cacheStorageConfig.options);
    case "local":
    default:
      return new LocalCacheStorage(localCacheFolder);
  }
}
