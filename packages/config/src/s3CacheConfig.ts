import type { Logger } from "backfill-logger";
import { type S3ClientConfig } from "@aws-sdk/client-s3";

export interface S3CacheStorageOptions {
  bucket: string;
  clientConfig?: S3ClientConfig;
  maxSize?: number;
  prefix?: string;
}

export type S3CacheStorageConfig = {
  provider: "s3";
  options: S3CacheStorageOptions;
};

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
