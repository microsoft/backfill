import {
  getAzureBlobConfigFromSerializedOptions,
  getNpmConfigFromSerializedOptions
} from "./cacheConfig";
import { CacheStorageConfig, BackfillModes, isCorrectMode } from "./index";

export type ConfigEnv = {
  cacheStorageConfig?: CacheStorageConfig;
  internalCacheFolder?: string;
  logFolder?: string;
  mode?: BackfillModes;
  performanceReportName?: string;
  producePerformanceLogs?: boolean;
};

export function getEnvConfig() {
  const config: ConfigEnv = {};

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

  const internalCacheFolder = process.env["BACKFILL_INTERNAL_CACHE_FOLDER"];
  if (internalCacheFolder) {
    config["internalCacheFolder"] = internalCacheFolder;
  }

  const performanceReportName = process.env["BACKFILL_PERFORMANCE_REPORT_NAME"];
  if (performanceReportName) {
    config["performanceReportName"] = performanceReportName;
  }

  const logFolder = process.env["BACKFILL_LOG_FOLDER"];
  if (logFolder) {
    config["logFolder"] = logFolder;
  }

  const mode = process.env["BACKFILL_MODE"];
  if (mode) {
    if (isCorrectMode(mode)) {
      config["mode"] = mode;
    } else {
      throw `Backfill config option "BACKFILL_MODE" was set, but with the wrong value: "${config["mode"]}".`;
    }
  }

  const producePerformanceLogs =
    process.env["BACKFILL_PRODUCE_PERFORMANCE_LOGS"];
  if (producePerformanceLogs) {
    config["producePerformanceLogs"] = Boolean(
      producePerformanceLogs === "true"
    );
  }

  return config;
}
