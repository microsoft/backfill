import { CacheStorageConfig } from "backfill-config";
import { Logger } from "backfill-logger";

import { ICacheStorage } from "./CacheStorage";
import { AzureBlobCacheStorage } from "./AzureBlobCacheStorage";
import { LocalCacheStorage } from "./LocalCacheStorage";
import { NpmCacheStorage } from "./NpmCacheStorage";

export { ICacheStorage } from "./CacheStorage";

export function getCacheStorageProvider(
  cacheStorageConfig: CacheStorageConfig,
  internalCacheFolder: string,
  logger: Logger
): ICacheStorage {
  let cacheStorage: ICacheStorage;

  if (cacheStorageConfig.provider === "npm") {
    cacheStorage = new NpmCacheStorage(
      cacheStorageConfig.options,
      internalCacheFolder,
      logger
    );
  } else if (cacheStorageConfig.provider === "azure-blob") {
    cacheStorage = new AzureBlobCacheStorage(
      cacheStorageConfig.options,
      logger
    );
  } else {
    cacheStorage = new LocalCacheStorage(internalCacheFolder, logger);
  }

  return cacheStorage;
}
