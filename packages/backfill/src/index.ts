import yargs from "yargs";

import { loadDotenv } from "backfill-utils-dotenv";
import { Logger, makeLogger } from "backfill-logger";
import { createConfig, Config } from "backfill-config";
export { createDefaultConfig } from "backfill-config";

import {
  getRawBuildCommand,
  createBuildCommand,
  BuildCommand,
} from "./commandRunner";
import { initializeWatcher, closeWatcher } from "./audit";
import {
  put as put_api,
  fetch as fetch_api,
  computeHash,
  computeHashOfOutput,
} from "./api";

// Load environment variables
loadDotenv();

export async function backfill(
  config: Config,
  buildCommand: BuildCommand,
  hashSalt: string,
  logger: Logger
): Promise<void> {
  const {
    cacheStorageConfig,
    name,
    mode,
    logFolder,
    packageRoot,
    producePerformanceLogs,
    validateOutput,
  } = config;

  logger.setName(name);
  logger.setMode(mode, mode === "READ_WRITE" ? "info" : "verbose");
  logger.setCacheProvider(cacheStorageConfig.provider);

  const createPackageHash = async () =>
    await computeHash(packageRoot, logger, hashSalt);
  const fetch = async (hash: string) =>
    await fetch_api(packageRoot, hash, logger);
  const run = async () => {
    try {
      await buildCommand();
    } catch (err) {
      throw new Error(`Command failed with the following error:\n\n${err}`);
    }
  };
  const put = async (hash: string) => {
    try {
      await put_api(packageRoot, hash, logger);
    } catch (err) {
      logger.error(
        `Failed to persist the cache with the following error:\n\n${err}`
      );
    }
  };

  switch (mode) {
    case "READ_WRITE": {
      const hash = await createPackageHash();
      if (!(await fetch(hash))) {
        await run();

        await put(hash);
      }

      break;
    }
    case "READ_ONLY": {
      const hash = await createPackageHash();
      if (!(await fetch(hash))) {
        await run();
      }

      break;
    }
    case "WRITE_ONLY": {
      await run();

      const hash = await createPackageHash();
      await put(hash);

      break;
    }
    case "PASS": {
      await run();
      break;
    }
  }

  if (validateOutput) {
    const hashOfOutput = await computeHashOfOutput(packageRoot, logger);
    logger.setHashOfOutput(hashOfOutput);
  }

  if (producePerformanceLogs) {
    await logger.toFile(logFolder);
  }
}

export async function main(): Promise<void> {
  let logger = makeLogger("info");
  const cwd = process.cwd();

  try {
    const config = createConfig(logger, cwd);
    const {
      clearOutput,
      internalCacheFolder,
      logFolder,
      logLevel,
      outputGlob,
      packageRoot,
    } = config;

    if (logLevel) {
      logger = makeLogger(logLevel);
    }

    const helpString = "Backfills unchanged packages.";

    const argv = yargs
      .strict()
      .usage(helpString)
      .alias("h", "help")
      .version(false)
      .option("audit", {
        description: "Compare files changed with those cached",
        type: "boolean",
      }).argv;

    const buildCommand = createBuildCommand(
      argv["_"],
      clearOutput,
      outputGlob,
      logger
    );

    if (argv["audit"]) {
      initializeWatcher(
        packageRoot,
        internalCacheFolder,
        logFolder,
        outputGlob,
        logger
      );
    }

    await backfill(config, buildCommand, getRawBuildCommand(), logger);

    if (argv["audit"]) {
      await closeWatcher(logger);
    }
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }
}
