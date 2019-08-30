import * as path from "path";
import * as pkgDir from "pkg-dir";
import * as findUp from "find-up";
import { logger } from "just-task-logger";

import {
  CacheStorageConfig,
  NpmCacheStorageConfig,
  AzureBlobCacheStorageConfig
} from "backfill-cache";

export type WatchGlobs = {
  folders: {
    include: string[];
    exclude: string[];
  };
  files: {
    include: string[];
    exclude?: string[];
  };
};

export type Config = {
  name: string;
  packageRoot: string;
  cacheStorageConfig: CacheStorageConfig;
  folderToCache: string;
  useTelemetry: boolean;
  localCacheFolder: string;
  hashFileFolder: string;
  telemetryFileFolder: string;
  telemetryReportName?: string;
  verboseLogs: boolean;
  watchGlobs: WatchGlobs;
};

export type ConfigEnv = {
  cacheStorageConfig?: CacheStorageConfig;
  useTelemetry?: boolean;
  localCacheFolder?: string;
  telemetryFileFolder?: string;
  telemetryReportName?: string;
};

export function getName(packageRoot: string) {
  return (
    require(path.join(packageRoot, "package.json")).name ||
    path.basename(path.dirname(packageRoot))
  );
}

function getNpmConfigFromSerializedOptions(
  options: string
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
  } catch (e) {
    logger.error(e.message);
    throw new Error("Invalid npm storage options");
  }
}

function getAzureBlobConfigFromSerializedOptions(
  options: string
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
  } catch (e) {
    logger.error(e.message);
    throw new Error("Invalid blob storage options");
  }
}

export function getEnvConfig() {
  const config: ConfigEnv = {};

  const telemetryFileFolder = process.env["BACKFILL_TELEMETRY_FILE_FOLDER"];
  if (telemetryFileFolder) {
    config["telemetryFileFolder"] = telemetryFileFolder;
  }

  const useTelemetry = process.env["BACKFILL_USE_TELEMETRY"];
  if (useTelemetry) {
    config["useTelemetry"] = Boolean(useTelemetry === "true");
  }

  const localCacheFolder = process.env["BACKFILL_LOCAL_CACHE_FOLDER"];
  if (localCacheFolder) {
    config["localCacheFolder"] = localCacheFolder;
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

  const telemetryReportName = process.env["BACKFILL_TELEMETRY_REPORT_NAME"];
  if (telemetryReportName) {
    config["telemetryReportName"] = telemetryReportName;
  }

  return config;
}

export function getSearchPaths() {
  const searchPaths = [];

  let nextPath: string | undefined = process.cwd();
  while (nextPath) {
    const configLocation = findUp.sync("backfill.config.js", { cwd: nextPath });

    if (configLocation) {
      searchPaths.push(configLocation);
      nextPath = path.join(path.dirname(configLocation), "..");
    } else {
      nextPath = undefined;
    }
  }

  return searchPaths.reverse();
}

export function createDefaultConfig(): Config {
  const packageRoot = pkgDir.sync(process.cwd()) || process.cwd();
  const defaultCacheFolder = path.join("node_modules", ".cache", "backfill");

  return {
    packageRoot,
    name: getName(packageRoot),
    cacheStorageConfig: {
      provider: "local"
    },
    folderToCache: "lib",
    useTelemetry: true,
    localCacheFolder: defaultCacheFolder,
    hashFileFolder: defaultCacheFolder,
    telemetryFileFolder: defaultCacheFolder,
    verboseLogs: false,
    get watchGlobs(): WatchGlobs {
      return {
        folders: {
          exclude: [this.folderToCache, "node_modules"],
          include: ["*"]
        },
        files: {
          include: ["*"]
        }
      };
    }
  };
}

export function createConfig(): Config {
  const defaultConfig = createDefaultConfig();

  const fileBasedConfig = getSearchPaths().reduce((acc, configPath) => {
    const config = require(configPath);

    return {
      ...acc,
      ...config
    };
  }, {});

  const envBasedConfig = getEnvConfig();

  return {
    ...defaultConfig,
    ...fileBasedConfig,
    ...envBasedConfig
  };
}
