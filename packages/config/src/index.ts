import path from "path";
import pkgDir from "pkg-dir";
import findUp from "find-up";

import { LogLevel, Logger } from "backfill-logger";

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
  clearOutput: boolean;
  hashGlobs: HashGlobs;
  internalCacheFolder: string;
  logFolder: string;
  logLevel: LogLevel;
  name: string;
  mode: BackfillModes;
  outputGlob: string[];
  packageRoot: string;
  performanceReportName?: string;
  producePerformanceLogs: boolean;
  validateOutput: boolean;
};

export function isCorrectMode(mode: string): mode is BackfillModes {
  return modesObject.hasOwnProperty(mode);
}

export function getName(packageRoot: string) {
  return (
    require(path.join(packageRoot, "package.json")).name ||
    path.basename(path.dirname(packageRoot))
  );
}

export function getSearchPaths(fromPath: string) {
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

export function createDefaultConfig(fromPath: string): Config {
  const packageRoot = pkgDir.sync(fromPath) || fromPath;
  const defaultCacheFolder = path.join("node_modules", ".cache", "backfill");
  const outputGlob = ["lib/**"];

  return {
    cacheStorageConfig: {
      provider: "local"
    },
    clearOutput: false,
    hashGlobs: [
      "**/*",
      "!**/node_modules/**",
      `!lib/**`,
      "!**/tsconfig.tsbuildinfo"
    ],
    internalCacheFolder: defaultCacheFolder,
    logFolder: defaultCacheFolder,
    logLevel: "info",
    name: getName(packageRoot),
    mode: "READ_WRITE",
    outputGlob,
    packageRoot,
    producePerformanceLogs: false,
    validateOutput: false
  };
}

export function createConfig(logger: Logger, fromPath: string): Config {
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

  const envBasedConfig = getEnvConfig(logger);

  return {
    ...defaultConfig,
    ...fileBasedConfig,
    ...envBasedConfig
  };
}
