import * as path from "path";
import * as pkgDir from "pkg-dir";
import * as findUp from "find-up";

import { LogLevels } from "backfill-logger";

import { CacheStorageConfig } from "./cacheConfig";
import { getEnvConfig } from "./envConfig";

export * from "./cacheConfig";
export * from "./envConfig";

export type HashGlobs = string[];

export type Config = {
  cacheStorageConfig: CacheStorageConfig;
  internalCacheFolder: string;
  logFolder: string;
  name: string;
  outputFolder: string | string[];
  producePerformanceLogs: boolean;
  packageRoot: string;
  performanceReportName?: string;
  clearOutputFolder: boolean;
  logLevel: LogLevels;
  hashGlobs: HashGlobs;
};

export function outputFolderAsArray(outputFolder: string | string[]): string[] {
  const outputFolders = Array.isArray(outputFolder)
    ? outputFolder
    : [outputFolder];

  return outputFolders;
}

export function getName(packageRoot: string) {
  return (
    require(path.join(packageRoot, "package.json")).name ||
    path.basename(path.dirname(packageRoot))
  );
}

export function getSearchPaths(fromPath: string = process.cwd()) {
  const searchPaths = [];

  let nextPath: string | undefined = fromPath;
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

export function createDefaultConfig(fromPath: string = process.cwd()): Config {
  const packageRoot = pkgDir.sync(fromPath) || fromPath;
  const defaultCacheFolder = path.join("node_modules", ".cache", "backfill");
  const outputFolder = "lib";

  return {
    packageRoot,
    name: getName(packageRoot),
    cacheStorageConfig: {
      provider: "local"
    },
    internalCacheFolder: defaultCacheFolder,
    logFolder: defaultCacheFolder,
    outputFolder,
    producePerformanceLogs: false,
    clearOutputFolder: false,
    logLevel: "info",
    hashGlobs: [
      "**/*",
      "!**/node_modules/**",
      `!${outputFolder}/**`,
      "!tsconfig.tsbuildinfo"
    ]
  };
}

export function createConfig(fromPath: string = process.cwd()): Config {
  const defaultConfig = createDefaultConfig(fromPath);
  const fileBasedConfig = getSearchPaths(fromPath).reduce((acc, configPath) => {
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
