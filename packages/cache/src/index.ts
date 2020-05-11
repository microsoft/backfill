import { CacheStorageConfig } from "backfill-config";
import { Logger } from "backfill-logger";

import { ICacheStorage } from "./CacheStorage";
import { AzureBlobCacheStorage } from "./AzureBlobCacheStorage";
import { LocalCacheStorage } from "./LocalCacheStorage";
import { NpmCacheStorage } from "./NpmCacheStorage";
import { LocalSkipCacheStorage } from "./LocalSkipCacheStorage";
export { ICacheStorage } from "./CacheStorage";

export function getCacheStorageProvider(
  cacheStorageConfig: CacheStorageConfig,
  internalCacheFolder: string,
  logger: Logger,
  cwd: string
): ICacheStorage {
  let cacheStorage: ICacheStorage;

  if (cacheStorageConfig.provider === "npm") {
    cacheStorage = new NpmCacheStorage(
      cacheStorageConfig.options,
      internalCacheFolder,
      logger,
      cwd
    );
  } else if (cacheStorageConfig.provider === "azure-blob") {
    cacheStorage = new AzureBlobCacheStorage(
      cacheStorageConfig.options,
      logger,
      cwd
    );
  } else if (cacheStorageConfig.provider === "local-skip") {
    cacheStorage = new LocalSkipCacheStorage(internalCacheFolder, logger, cwd);
  } else {
    cacheStorage = new LocalCacheStorage(internalCacheFolder, logger, cwd);
  }

  return cacheStorage;
}
