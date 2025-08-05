import path from "path";
import pkgDir from "pkg-dir";
import findUp from "find-up";

import type { LogLevel, Logger } from "backfill-logger";
import type { CacheStorageConfig } from "./cacheConfig";
import { getEnvConfig } from "./envConfig";
import { type BackfillModes, isCorrectMode } from "./modes";

export * from "./cacheConfig";
export * from "./envConfig";
export * from "./modes";

/** @deprecated not used */
export type HashGlobs = string[];

export type Config = {
  /**
   * Cache storage provider name and potentially configuration.
   * @default { provider: "local" }
   */
  cacheStorageConfig: CacheStorageConfig;

  /**
   * Glob patterns for the built/generated files that should be hashed and
   * cached, relative to the root of each package.
   *
   * Example: To cache `package-a/lib` and `package-a/dist/bundles`, use
   * `outputGlob: ["lib/**\/*", "dist/bundles/**\/*"]`
   * (removing the backslashes--those are just for comment syntax parsing)
   *
   * Defaults to `["lib/**"]`.
   */
  outputGlob: string[];

  /**
   * Whether to delete the `outputGlob` files on completion.
   * @default false
   */
  clearOutput: boolean;

  /**
   * Absolute path to local cache folder.
   * @default "[packageRoot]/node_modules/.cache/backfill"
   */
  internalCacheFolder: string;

  /**
   * Absolute path to local log folder.
   * @default "[packageRoot]/node_modules/.cache/backfill"
   */
  logFolder: string;

  /**
   * Log level: `"silly" | "verbose" | "info" | "warn" | "error" | "mute"`
   * @default "info"
   */
  logLevel: LogLevel;

  /**
   * Name of the package, used for logging and performance reports.
   * Defaults to name from `package.json`.
   */
  name: string;

  /**
   * Cache operation mode: `"READ_ONLY" | "WRITE_ONLY" | "READ_WRITE" | "PASS"`
   * @default "READ_WRITE"
   */
  mode: BackfillModes;

  /**
   * Package root path.
   * Defaults to searching for `package.json` in the current working directory.
   */
  packageRoot: string;

  /**
   * If true, write performance logs to `logFolder`.
   * @default false
   */
  producePerformanceLogs: boolean;

  /**
   * If true, write the hash of the output files to the performance report.
   * @default false
   */
  validateOutput: boolean;

  /**
   * Compute hashes to only cache changed files.
   * @default false
   */
  incrementalCaching: boolean;

  /** @deprecated Appears unused */
  performanceReportName?: string;
};

/**
 * Get the package name from `<packageRoot>/package.json`.
 */
export function getName(packageRoot: string) {
  return (
    require(path.join(packageRoot, "package.json")).name ||
    path.basename(path.dirname(packageRoot))
  );
}

/**
 * Get a list of `backfill.config.js` file paths, starting at `fromPath` and
 * searching upward.
 */
export function getSearchPaths(fromPath: string) {
  const searchPaths: string[] = [];

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

/**
 * Create a default config for the package containing `fromPath`.
 */
export function createDefaultConfig(fromPath: string): Config {
  const packageRoot = pkgDir.sync(fromPath) || fromPath;
  const defaultCacheFolder = path.join(
    packageRoot,
    "node_modules/.cache/backfill"
  );
  const outputGlob = ["lib/**"];

  return {
    cacheStorageConfig: {
      provider: "local",
    },
    clearOutput: false,
    internalCacheFolder: defaultCacheFolder,
    logFolder: defaultCacheFolder,
    logLevel: "info",
    name: getName(packageRoot),
    mode: "READ_WRITE",
    outputGlob,
    packageRoot,
    producePerformanceLogs: false,
    validateOutput: false,
    incrementalCaching: false,
  };
}

/**
 * Read the config from `backfill.config.js` (in `fromPath` and/or parents)
 * if present, fill in defaults for any values not provided, and apply overrides
 * from environment variables.
 */
export function createConfig(logger: Logger, fromPath: string): Config {
  const defaultConfig = createDefaultConfig(fromPath);
  const fileBasedConfig: Partial<Config> = getSearchPaths(fromPath).reduce(
    (acc, configPath) => {
      const config: Partial<Config> = require(configPath);

      if (config.mode && !isCorrectMode(config.mode)) {
        throw `Backfill config option "mode" was set, but with the wrong value: "${config.mode}".`;
      }

      return { ...acc, ...config };
    },
    {}
  );

  const envBasedConfig = getEnvConfig(logger);

  return {
    ...defaultConfig,
    ...fileBasedConfig,
    ...envBasedConfig,
  };
}
