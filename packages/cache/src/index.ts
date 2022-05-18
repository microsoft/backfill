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

const memo = new Map<string, ICacheStorage>();
export function getCacheStorageProvider(
  cacheStorageConfig: CacheStorageConfig,
  internalCacheFolder: string,
  logger: Logger,
  cwd: string,
  incrementalCaching = false
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
    const key = `${cacheStorageConfig.provider}${internalCacheFolder}${cwd}`;
    if (memo.has(key)) {
      return memo.get(key)!;
    }
    if (cacheStorageConfig.provider === "npm") {
      cacheStorage = new NpmCacheStorage(
        cacheStorageConfig.options,
        internalCacheFolder,
        logger,
        cwd,
        incrementalCaching
      );
    } else if (cacheStorageConfig.provider === "azure-blob") {
      cacheStorage = new AzureBlobCacheStorage(
        cacheStorageConfig.options,
        logger,
        cwd,
        incrementalCaching
      );
    } else if (cacheStorageConfig.provider === "local-skip") {
      cacheStorage = new LocalSkipCacheStorage(
        internalCacheFolder,
        logger,
        cwd,
        incrementalCaching
      );
    } else {
      cacheStorage = new LocalCacheStorage(
        internalCacheFolder,
        logger,
        cwd,
        incrementalCaching
      );
    }
    memo.set(key, cacheStorage);
  }

  return cacheStorage;
}
