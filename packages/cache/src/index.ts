import { CacheStorageConfig, CustomStorageConfig } from "backfill-config";
import { Logger } from "backfill-logger";

import { ICacheStorage } from "./CacheStorage";
import { AzureBlobCacheStorage } from "./AzureBlobCacheStorage";
import { LocalCacheStorage } from "./LocalCacheStorage";
import { NpmCacheStorage } from "./NpmCacheStorage";
import { LocalSkipCacheStorage } from "./LocalSkipCacheStorage";
import { S3CacheStorage } from "./S3CacheStorage";
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
  let cacheStorage: ICacheStorage | undefined;

  if (isCustomProvider(cacheStorageConfig)) {
    try {
      return cacheStorageConfig.provider(logger, cwd);
    } catch {
      throw new Error("cacheStorageConfig.provider cannot be creaated");
    }
  }

  const key = `${cacheStorageConfig.provider}${internalCacheFolder}${cwd}`;
  cacheStorage = memo.get(key);
  if (cacheStorage) {
    return cacheStorage;
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
  } else if (cacheStorageConfig.provider === "s3") {
    cacheStorage = new S3CacheStorage(
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

  return cacheStorage;
}
