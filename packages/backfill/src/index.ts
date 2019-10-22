import * as yargs from "yargs";
import { loadDotenv } from "backfill-utils-dotenv";
import { getCacheStorageProvider, ICacheStorage } from "backfill-cache";
import { logger, setLogLevel } from "backfill-logger";
import { createConfig, Config } from "backfill-config";
import {
  getRawBuildCommand,
  createBuildCommand,
  BuildCommand
} from "./commandRunner";
import { IHasher, Hasher } from "backfill-hasher";

import { initializeWatcher, closeWatcher } from "./audit";

// Load environment variables
loadDotenv();

export async function backfill(
  config: Config,
  cacheStorage: ICacheStorage,
  buildCommand: BuildCommand,
  hasher: IHasher
): Promise<void> {
  const {
    cacheStorageConfig,
    outputFolder,
    name,
    logFolder,
    producePerformanceLogs
  } = config;

  logger.setName(name);
  logger.setCacheProvider(cacheStorageConfig.provider);

  const packageHash = await hasher.createPackageHash();

  if (!(await cacheStorage.fetch(packageHash, outputFolder))) {
    try {
      await buildCommand();
    } catch (err) {
      throw new Error("Command failed");
    }

    try {
      await cacheStorage.put(packageHash, outputFolder);
    } catch (err) {
      logger.warn("Failed to persist the cache: ", err.message);
    }
  }

  if (producePerformanceLogs) {
    await logger.toFile(logFolder);
  }
}

export async function main(): Promise<void> {
  const config = createConfig();
  const {
    cacheStorageConfig,
    internalCacheFolder,
    logFolder,
    outputFolder,
    packageRoot,
    performanceReportName,
    clearOutputFolder,
    logLevel,
    hashGlobs
  } = config;

  if (logLevel) {
    setLogLevel(logLevel);
  }

  const helpString = "Backfills unchanged packages.";

  const argv = yargs
    .strict()
    .usage(helpString)
    .alias("h", "help")
    .version(false)
    .option("generate-performance-report", {
      description: "Generate performance report",
      type: "boolean"
    })
    .option("audit", {
      description: "Compare files changed with those cached",
      type: "boolean"
    }).argv;

  const buildCommand = createBuildCommand(
    argv["_"],
    clearOutputFolder,
    outputFolder
  );

  const cacheStorage = getCacheStorageProvider(
    cacheStorageConfig,
    internalCacheFolder
  );

  const hasher = new Hasher({ packageRoot }, getRawBuildCommand());

  if (argv["generate-performance-report"]) {
    await logger.generatePerformanceReport(logFolder, performanceReportName);

    return;
  }

  if (argv["audit"]) {
    initializeWatcher(
      packageRoot,
      internalCacheFolder,
      logFolder,
      outputFolder,
      hashGlobs
    );

    // Disable fetching when auditing a package
    cacheStorage.fetch = () => Promise.resolve(false);
    cacheStorage.put = () => Promise.resolve();
  }

  try {
    await backfill(config, cacheStorage, buildCommand, hasher);

    if (argv["audit"]) {
      await closeWatcher();
    }
  } catch (err) {
    logger.error(err.message || err);
    process.exit(1);
  }
}
