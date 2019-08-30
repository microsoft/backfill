import { ICacheStorage } from "./CacheStorage";
import {
  AzureBlobCacheStorage,
  AzureBlobCacheStorageOptions
} from "./AzureBlobCacheStorage";
import { LocalCacheStorage } from "./LocalCacheStorage";
import { NpmCacheStorage, NpmCacheStorageOptions } from "./NpmCacheStorage";

export { ICacheStorage } from "./CacheStorage";

export type AzureBlobCacheStorageConfig = {
  provider: "azure-blob";
  options: AzureBlobCacheStorageOptions;
};

export type NpmCacheStorageConfig = {
  provider: "npm";
  options: NpmCacheStorageOptions;
};

export type CacheStorageConfig =
  | {
      provider: "local";
    }
  | NpmCacheStorageConfig
  | AzureBlobCacheStorageConfig;

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
