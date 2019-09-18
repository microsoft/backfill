import * as path from "path";
import * as pkgDir from "pkg-dir";
import * as findUp from "find-up";

import { CacheStorageConfig } from "./cacheConfig";
import { getEnvConfig } from "./envConfig";

export * from "./cacheConfig";
export * from "./envConfig";

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
  outputPerformanceLogs: boolean;
  localCacheFolder: string;
  hashFileFolder: string;
  logFolder: string;
  performanceReportName?: string;
  verboseLogs: boolean;
  watchGlobs: WatchGlobs;
};

export function getName(packageRoot: string) {
  return (
    require(path.join(packageRoot, "package.json")).name ||
    path.basename(path.dirname(packageRoot))
  );
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
    outputPerformanceLogs: false,
    localCacheFolder: defaultCacheFolder,
    hashFileFolder: defaultCacheFolder,
    logFolder: defaultCacheFolder,
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
