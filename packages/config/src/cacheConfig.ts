export type AzureBlobCacheStorageOptions = {
  connectionString: string;
  container: string;
};

export type NpmCacheStorageOptions = {
  npmPackageName: string;
  registryUrl: string;
  npmrcUserconfig?: string;
};

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
