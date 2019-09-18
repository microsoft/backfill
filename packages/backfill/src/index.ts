import * as yargs from "yargs";
import { loadDotenv } from "backfill-utils-dotenv";
import { getCacheStorageProvider, ICacheStorage } from "backfill-cache";
import { performanceLogger } from "backfill-performance-logger";
import { logger } from "just-task-logger";

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
    folderToCache,
    name,
    logFolder,
    outputPerformanceLogs
  } = config;

  performanceLogger.setName(name);
  logger.info(`Package name: ${name}`);

  performanceLogger.setCacheProvider(cacheStorageConfig.provider);
  logger.verbose(`Cache provider: ${cacheStorageConfig.provider}`);

  const packageHash = await hasher.createPackageHash();
  logger.verbose(`Package hash: ${packageHash}`);

  if (await cacheStorage.fetch(packageHash, folderToCache)) {
    performanceLogger.setHit(true);
    logger.info(`Cache hit!`);
  } else {
    logger.info(`Cache miss!`);
    performanceLogger.setHit(false);

    try {
      await buildCommand();
    } catch (err) {
      throw new Error("Command failed");
    }

    try {
      await cacheStorage.put(packageHash, folderToCache);
    } catch (err) {
      logger.warn("Failed persisting the cache: ", err.message);
    }
  }

  if (outputPerformanceLogs) {
    await performanceLogger.toFile(logFolder);
  }
}

export async function main(): Promise<void> {
  const config = createConfig();
  const {
    name,
    cacheStorageConfig,
    hashFileFolder,
    folderToCache,
    packageRoot,
    localCacheFolder,
    logFolder,
    performanceReportName,
    verboseLogs,
    watchGlobs
  } = config;

  if (verboseLogs) {
    logger.enableVerbose = true;
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
    localCacheFolder
  );

  const buildCommand = createBuildCommand(argv["_"]);
  const buildCommandSignature = getRawBuildCommand();

  const hasher = new Hasher(
    { packageRoot, watchGlobs, hashFileFolder },
    buildCommandSignature
  );

  if (argv["generate-performance-report"]) {
    await performanceLogger.generatePerformanceReport(
      logFolder,
      performanceReportName
    );

    return;
  }

  if (argv["hash-only"]) {
    const hash = await hasher.createPackageHash();

    performanceLogger.setName(name);
    performanceLogger.setHash(hash);
    performanceLogger.setCacheProvider("SKIP");
    await performanceLogger.toFile(logFolder);

    return;
  }

  if (argv["audit"]) {
    initializeWatcher(
      packageRoot,
      localCacheFolder,
      logFolder,
      folderToCache,
      watchGlobs
    );

    // Disable fetching when auditing a package
    cacheStorage.fetch = () => Promise.resolve(false);
    cacheStorage.put = () => Promise.resolve();
  }

  try {
    await backfill(config, cacheStorage, buildCommand, hasher);

    if (argv["audit"]) {
      closeWatcher();
    }
  } catch (err) {
    logger.error(err.message || err);
    process.exit(1);
  }
}
