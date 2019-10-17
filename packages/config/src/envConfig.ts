import {
  getAzureBlobConfigFromSerializedOptions,
  getNpmConfigFromSerializedOptions
} from "./cacheConfig";
import { CacheStorageConfig } from "./index";

export type ConfigEnv = {
  cacheStorageConfig?: CacheStorageConfig;
  producePerformanceLogs?: boolean;
  internalCacheFolder?: string;
  logFolder?: string;
  performanceReportName?: string;
};

export function getEnvConfig() {
  const config: ConfigEnv = {};

  const logFolder = process.env["BACKFILL_LOG_FOLDER"];
  if (logFolder) {
    config["logFolder"] = logFolder;
  }

  const producePerformanceLogs =
    process.env["BACKFILL_PRODUCE_PERFORMANCE_LOGS"];
  if (producePerformanceLogs) {
    config["producePerformanceLogs"] = Boolean(
      producePerformanceLogs === "true"
    );
  }

  const internalCacheFolder = process.env["BACKFILL_LOCAL_CACHE_FOLDER"];
  if (internalCacheFolder) {
    config["internalCacheFolder"] = internalCacheFolder;
  }

  const cacheProvider = process.env["BACKFILL_CACHE_PROVIDER"];
  const serializedCacheProviderOptions =
    process.env["BACKFILL_CACHE_PROVIDER_OPTIONS"];

  if (cacheProvider === "azure-blob" && serializedCacheProviderOptions) {
    config["cacheStorageConfig"] = getAzureBlobConfigFromSerializedOptions(
      serializedCacheProviderOptions
    );
  } else if (cacheProvider === "npm" && serializedCacheProviderOptions) {
    config["cacheStorageConfig"] = getNpmConfigFromSerializedOptions(
      serializedCacheProviderOptions
    );
  } else if (cacheProvider === "local") {
    // local cache has no config at the moment
  }

  const performanceReportName = process.env["BACKFILL_PERFORMANCE_REPORT_NAME"];
  if (performanceReportName) {
    config["performanceReportName"] = performanceReportName;
  }

  return config;
}
