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
import { IHasher, Hasher } from "./hasher";
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
    outputPerformanceLogs
  } = config;

  logger.setName(name);
  logger.setCacheProvider(cacheStorageConfig.provider);

  const packageHash = await hasher.createPackageHash();

  if (await cacheStorage.fetch(packageHash, outputFolder)) {
    logger.setHit(true);
  } else {
    logger.setHit(false);

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

  if (outputPerformanceLogs) {
    await logger.toFile(logFolder);
  }
}

export async function main(): Promise<void> {
  const config = createConfig();
  const {
    cacheStorageConfig,
    hashFileFolder,
    internalCacheFolder,
    logFolder,
    name,
    outputFolder,
    packageRoot,
    performanceReportName,
    clearOutputFolder,
    logLevel,
    watchGlobs
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
    .option("hash-only", {
      description: "Create package hash without backfilling",
      type: "boolean"
    })
    .option("audit", {
      description: "Compare files changed with those cached",
      type: "boolean"
    })
    .option("verbose", {
      description: "Verbose logging",
      type: "boolean"
    }).argv;

  const cacheStorage = getCacheStorageProvider(
    cacheStorageConfig,
    internalCacheFolder
  );

  const buildCommand = createBuildCommand(
    argv["_"],
    clearOutputFolder,
    outputFolder
  );
  const buildCommandSignature = getRawBuildCommand();

  const hasher = new Hasher(
    { packageRoot, watchGlobs, hashFileFolder },
    buildCommandSignature
  );

  if (argv["generate-performance-report"]) {
    await logger.generatePerformanceReport(logFolder, performanceReportName);

    return;
  }

  if (argv["hash-only"]) {
    const hash = await hasher.createPackageHash();

    logger.setName(name);
    logger.setHash(hash);
    logger.setCacheProvider("SKIP");
    await logger.toFile(logFolder);

    return;
  }

  if (argv["audit"]) {
    initializeWatcher(
      packageRoot,
      internalCacheFolder,
      logFolder,
      outputFolder,
      watchGlobs
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
