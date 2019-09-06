import * as yargs from "yargs";
import { loadDotenv } from "backfill-utils-dotenv";
import { getCacheStorageProvider, ICacheStorage } from "backfill-cache";
import { telemetry } from "backfill-telemetry";
import { logger } from "just-task-logger";

import { createConfig, Config } from "./config";
import { DependencyResolver } from "./dependencyResolver";
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
    telemetryFileFolder,
    useTelemetry
  } = config;

  telemetry.setName(name);
  logger.info(`Package name: ${name}`);

  telemetry.setCacheProvider(cacheStorageConfig.provider);
  logger.verbose(`Cache provider: ${cacheStorageConfig.provider}`);

  const packageHash = await hasher.createPackageHash();
  logger.verbose(`Package hash: ${packageHash}`);

  if (await cacheStorage.fetch(packageHash, folderToCache)) {
    telemetry.setHit(true);
    logger.info(`Cache hit!`);
  } else {
    logger.info(`Cache miss!`);
    telemetry.setHit(false);

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

  if (useTelemetry) {
    await telemetry.toFile(telemetryFileFolder);
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
    telemetryFileFolder,
    telemetryReportName,
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
    .option("generate-telemetry-report", {
      description: "Generate telemetry report",
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
    buildCommandSignature,
    new DependencyResolver({ packageRoot })
  );

  if (argv["generate-telemetry-report"]) {
    await telemetry.generateTelemetryReport(
      telemetryFileFolder,
      telemetryReportName
    );

    return;
  }

  if (argv["hash-only"]) {
    const hash = await hasher.createPackageHash();

    telemetry.setName(name);
    telemetry.setHash(hash);
    telemetry.setCacheProvider("SKIP");
    await telemetry.toFile(telemetryFileFolder);

    return;
  }

  if (argv["audit"]) {
    initializeWatcher(
      packageRoot,
      localCacheFolder,
      telemetryFileFolder,
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
