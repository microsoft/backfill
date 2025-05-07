import { TokenCredential } from "@azure/core-http";
import { ContainerClient } from "@azure/storage-blob";
import { Logger } from "backfill-logger";
import { type S3ClientConfig } from "@aws-sdk/client-s3";

export interface ICacheStorage {
  fetch: (hash: string) => Promise<boolean>;
  put: (hash: string, filesToCache: string[]) => Promise<void>;
}

export type AzureBlobCacheStorageOptions =
  | {
      connectionString: string;
      container: string;
      maxSize?: number;
      credential?: TokenCredential;
    }
  | {
      containerClient: ContainerClient;
      maxSize?: number;
    };

export interface S3CacheStorageOptions {
  bucket: string;
  clientConfig?: S3ClientConfig;
  maxSize?: number;
  prefix?: string;
}

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

export type CustomStorageConfig = {
  provider: (logger: Logger, cwd: string) => ICacheStorage;
  name?: string;
};

export type S3CacheStorageConfig = {
  provider: "s3";
  options: S3CacheStorageOptions;
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
  | S3CacheStorageConfig
  | CustomStorageConfig;

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
      options: { ...parsedOptions },
    };
  } catch (error) {
    logger.error(error as any);
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
      typeof parsedOptions.container !== "string" ||
      !(
        typeof parsedOptions.maxSize === "undefined" ||
        typeof parsedOptions.maxSize === "number"
      )
    ) {
      throw new Error("Incorrect blob storage configuration");
    }

    return {
      provider: "azure-blob",
      options: { ...parsedOptions },
    };
  } catch (error) {
    logger.error(error as any);
    throw new Error("Invalid blob storage options");
  }
}

export function getS3ConfigFromSerializedOptions(
  options: string,
  logger: Logger
): S3CacheStorageConfig {
  try {
    const parsedOptions = JSON.parse(options);

    if (
      typeof parsedOptions.bucket !== "string" ||
      !(
        typeof parsedOptions.prefix === "undefined" ||
        typeof parsedOptions.prefix === "string"
      ) ||
      !(
        typeof parsedOptions.maxSize === "undefined" ||
        typeof parsedOptions.maxSize === "number"
      )
    ) {
      throw new Error("Incorrect blob storage configuration");
    }

    return {
      provider: "s3",
      options: { ...parsedOptions },
    };
  } catch (error) {
    logger.error(error as any);
    throw new Error("Invalid blob storage options");
  }
}
