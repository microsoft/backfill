import { CacheStorageConfig, CustomStorageConfig } from "backfill-config";
import { Logger } from "backfill-logger";

import { ICacheStorage } from "./CacheStorage";
import { AzureBlobCacheStorage } from "./AzureBlobCacheStorage";
import { LocalCacheStorage } from "./LocalCacheStorage";
import { NpmCacheStorage } from "./NpmCacheStorage";
import { LocalSkipCacheStorage } from "./LocalSkipCacheStorage";
export { ICacheStorage, CacheStorage } from "./CacheStorage";

export function isCustomProvider(
  config: CacheStorageConfig
): config is CustomStorageConfig {
  return typeof config.provider === "function";
}

export function getCacheStorageProvider(
  cacheStorageConfig: CacheStorageConfig,
  internalCacheFolder: string,
  logger: Logger,
  cwd: string
): ICacheStorage {
  let cacheStorage: ICacheStorage;

  if (isCustomProvider(cacheStorageConfig)) {
    const createCacheStorage = cacheStorageConfig.provider;

    try {
      cacheStorage = createCacheStorage(logger, cwd);
    } catch {
      throw new Error("cacheStorageConfig.provider cannot be creaated");
    }
  } else {
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
      cacheStorage = new LocalSkipCacheStorage(
        internalCacheFolder,
        logger,
        cwd
      );
    } else {
      cacheStorage = new LocalCacheStorage(internalCacheFolder, logger, cwd);
    }
  }

  return cacheStorage;
}
