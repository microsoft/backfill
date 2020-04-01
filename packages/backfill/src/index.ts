import * as yargs from "yargs";

import { loadDotenv } from "backfill-utils-dotenv";
import { getCacheStorageProvider, ICacheStorage } from "backfill-cache";
import { Reporter } from "backfill-reporting";
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
  hasher: IHasher,
  reporter: Reporter
): Promise<void> {
  const {
    cacheStorageConfig,
    outputGlob,
    name,
    mode,
    logFolder,
    producePerformanceLogs,
    validateOutput
  } = config;

  reporter.reportBuilder.setName(name);
  reporter.reportBuilder.setMode(mode);
  reporter.reportBuilder.setCacheProvider(cacheStorageConfig.provider);

  const createPackageHash = async () => await hasher.createPackageHash();
  const fetch = async (hash: string) => await cacheStorage.fetch(hash);
  const run = async () => {
    try {
      await buildCommand();
    } catch (err) {
      throw new Error(`Command failed with the following error:\n\n${err}`);
    }
  };
  const put = async (hash: string) => {
    try {
      await cacheStorage.put(hash, outputGlob);
    } catch (err) {
      reporter.error(
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
      const hash = await createPackageHash();

      await run();
      await put(hash);

      break;
    }
    case "PASS": {
      await run();
      break;
    }
  }

  if (validateOutput) {
    const hashOfOutput = await hasher.hashOfOutput();
    reporter.reportBuilder.setHashOfOutput(hashOfOutput);
  }

  if (producePerformanceLogs) {
    await reporter.reportBuilder.toFile(logFolder);
  }
}

export async function main(): Promise<void> {
  const reporter = new Reporter("info");
  try {
    const config = createConfig(reporter);
    const {
      cacheStorageConfig,
      clearOutput,
      hashGlobs,
      internalCacheFolder,
      logFolder,
      logLevel,
      outputGlob,
      packageRoot
    } = config;

    if (logLevel) {
      reporter.changeLogLevel(logLevel);
    }

    const helpString = "Backfills unchanged packages.";

    const argv = yargs
      .strict()
      .usage(helpString)
      .alias("h", "help")
      .version(false)
      .option("audit", {
        description: "Compare files changed with those cached",
        type: "boolean"
      }).argv;

    const buildCommand = createBuildCommand(
      argv["_"],
      clearOutput,
      outputGlob,
      reporter
    );

    const cacheStorage = getCacheStorageProvider(
      cacheStorageConfig,
      internalCacheFolder,
      reporter
    );

    const hasher = new Hasher(
      { packageRoot, outputGlob },
      getRawBuildCommand(),
      reporter
    );

    if (argv["audit"]) {
      initializeWatcher(
        packageRoot,
        internalCacheFolder,
        logFolder,
        outputGlob,
        hashGlobs,
        reporter
      );
    }

    await backfill(config, cacheStorage, buildCommand, hasher, reporter);

    if (argv["audit"]) {
      await closeWatcher(reporter);
    }
  } catch (err) {
    reporter.error(err);
    process.exit(1);
  }
}
