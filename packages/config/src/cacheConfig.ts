import { Logger } from "backfill-logger";

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
  | {
      provider: "local-skip";
    }
  | NpmCacheStorageConfig
  | AzureBlobCacheStorageConfig;

export function getNpmConfigFromSerializedOptions(
  options: string,
  logger: Logger
): NpmCacheStorageConfig {
  try {
    const parsedOptions = JSON.parse(options);

    if (
      typeof parsedOptions.npmPackageName !== "string" ||
      typeof parsedOptions.registryUrl !== "string"
    ) {
      throw new Error("Incorrect npm storage configuration");
    }

    return {
      provider: "npm",
      options: { ...parsedOptions }
    };
  } catch (error) {
    logger.error(error);
    throw new Error("Invalid npm storage options");
  }
}

export function getAzureBlobConfigFromSerializedOptions(
  options: string,
  logger: Logger
): AzureBlobCacheStorageConfig {
  try {
    const parsedOptions = JSON.parse(options);

    if (
      typeof parsedOptions.connectionString !== "string" ||
      typeof parsedOptions.container !== "string"
    ) {
      throw new Error("Incorrect blob storage configuration");
    }

    return {
      provider: "azure-blob",
      options: { ...parsedOptions }
    };
  } catch (error) {
    logger.error(error);
    throw new Error("Invalid blob storage options");
  }
}
