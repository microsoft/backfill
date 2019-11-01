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

export { createDefaultConfig } from "backfill-config";

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
      throw new Error(`Command failed with the following error:\n\n${err}`);
    }

    try {
      await cacheStorage.put(packageHash, outputFolder);
    } catch (err) {
      logger.error("Failed to persist the cache:\n\n", err.message);
    }
  }

  if (producePerformanceLogs) {
    await logger.toFile(logFolder);
  }
}

export async function main(): Promise<void> {
  try {
    const config = createConfig();
    const {
      cacheStorageConfig,
      clearOutputFolder,
      hashGlobs,
      internalCacheFolder,
      logFolder,
      logLevel,
      mode,
      outputFolder,
      packageRoot,
      performanceReportName
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

    if (mode !== "READ_WRITE") {
      logger.info(`Running in ${mode} mode.`);
    } else {
      logger.verbose(`Running in ${mode} mode.`);
    }

    const buildCommand = createBuildCommand(
      argv["_"],
      clearOutputFolder,
      outputFolder
    );

    if (mode === "PASS") {
      try {
        await buildCommand();
      } catch (err) {
        throw new Error("Command failed");
      }

      return;
    }

    const cacheStorage = getCacheStorageProvider(
      cacheStorageConfig,
      internalCacheFolder,
      argv["audit"] ? "PASS" : mode
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
    }

    await backfill(config, cacheStorage, buildCommand, hasher);

    if (argv["audit"]) {
      await closeWatcher();
    }
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }
}
