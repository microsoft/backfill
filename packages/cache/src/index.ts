import { ICacheStorage } from "./CacheStorage";
import { AzureBlobCacheStorage } from "./AzureBlobCacheStorage";
import { LocalCacheStorage } from "./LocalCacheStorage";
import { NpmCacheStorage } from "./NpmCacheStorage";

import { CacheStorageConfig, BackfillModes } from "backfill-config";

export { ICacheStorage } from "./CacheStorage";

function applyMode(cacheStorage: ICacheStorage, mode: BackfillModes) {
  if (mode === "READ_ONLY" || mode === "PASS") {
    cacheStorage.put = () => Promise.resolve();
  }

  if (mode === "WRITE_ONLY" || mode === "PASS") {
    cacheStorage.fetch = () => Promise.resolve(false);
  }
}

export function getCacheStorageProvider(
  cacheStorageConfig: CacheStorageConfig,
  internalCacheFolder: string,
  mode: BackfillModes = "READ_WRITE"
): ICacheStorage {
  let cacheStorage: ICacheStorage;

  if (cacheStorageConfig.provider === "npm") {
    cacheStorage = new NpmCacheStorage(
      cacheStorageConfig.options,
      internalCacheFolder
    );
  } else if (cacheStorageConfig.provider === "azure-blob") {
    cacheStorage = new AzureBlobCacheStorage(cacheStorageConfig.options);
  } else {
    cacheStorage = new LocalCacheStorage(internalCacheFolder);
  }

  applyMode(cacheStorage, mode);

  return cacheStorage;
}
