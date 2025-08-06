import type { Logger } from "backfill-logger";
import type { AzureBlobCacheStorageConfig } from "./azureBlobCacheConfig";
import type { NpmCacheStorageConfig } from "./npmCacheConfig";

export interface ICacheStorage {
  fetch: (hash: string) => Promise<boolean>;
  put: (hash: string, filesToCache: string[]) => Promise<void>;
}

export type CustomStorageConfig = {
  provider: (logger: Logger, cwd: string) => ICacheStorage;
  name?: string;
};

export type CacheStorageConfig =
  | {
      provider: "local";
    }
  | {
      provider: "local-skip";
    }
  | NpmCacheStorageConfig
  | AzureBlobCacheStorageConfig
  | CustomStorageConfig;

/**
 * Environment variable names for the cache storage config.
 */
export const cacheConfigEnvNames = {
  cacheProvider: "BACKFILL_CACHE_PROVIDER",
  cacheProviderOptions: "BACKFILL_CACHE_PROVIDER_OPTIONS",
};
