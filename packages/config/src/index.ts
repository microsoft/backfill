import * as path from "path";
import * as pkgDir from "pkg-dir";
import * as findUp from "find-up";

import { LogLevels } from "backfill-logger";

import { CacheStorageConfig } from "./cacheConfig";
import { getEnvConfig } from "./envConfig";

export * from "./cacheConfig";
export * from "./envConfig";

export type HashGlobs = string[];

export const modesObject = {
  READ_ONLY: "",
  WRITE_ONLY: "",
  READ_WRITE: "",
  PASS: ""
};

export type BackfillModes = keyof typeof modesObject;

export type Config = {
  cacheStorageConfig: CacheStorageConfig;
  clearOutputFolder: boolean;
  hashGlobs: HashGlobs;
  internalCacheFolder: string;
  logFolder: string;
  logLevel: LogLevels;
  name: string;
  mode: BackfillModes;
  outputFolder: string | string[];
  packageRoot: string;
  performanceReportName?: string;
  producePerformanceLogs: boolean;
};

export function outputFolderAsArray(outputFolder: string | string[]): string[] {
  const outputFolders = Array.isArray(outputFolder)
    ? outputFolder
    : [outputFolder];

  return outputFolders;
}

export function isCorrectMode(mode: string): mode is BackfillModes {
  return modesObject.hasOwnProperty(mode);
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
    cacheStorageConfig: {
      provider: "local"
    },
    clearOutputFolder: false,
    hashGlobs: [
      "**/*",
      "!**/node_modules/**",
      `!${outputFolder}/**`,
      "!**/tsconfig.tsbuildinfo"
    ],
    internalCacheFolder: defaultCacheFolder,
    logFolder: defaultCacheFolder,
    logLevel: "info",
    name: getName(packageRoot),
    mode: "READ_WRITE",
    outputFolder,
    packageRoot,
    producePerformanceLogs: false
  };
}

export function createConfig(fromPath: string = process.cwd()): Config {
  const defaultConfig = createDefaultConfig(fromPath);
  const fileBasedConfig = getSearchPaths(fromPath).reduce((acc, configPath) => {
    const config = require(configPath);

    if (config["mode"]) {
      if (!isCorrectMode(config["mode"])) {
        throw `Backfill config option "mode" was set, but with the wrong value: "${config["mode"]}".`;
      }
    }

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
