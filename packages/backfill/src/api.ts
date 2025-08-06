import type { Writable } from "stream";
import { EOL } from "os";

import { createConfig, type Config, type ICacheStorage } from "backfill-config";
import {
  type Logger,
  makeLogger as makeLoggerInternal,
  type Console,
  type LogLevel,
} from "backfill-logger";
import { Hasher } from "backfill-hasher";
import { getCacheStorageProvider } from "backfill-cache";

export type { Config, ICacheStorage };

function makeConsole(stdout: Writable, stderr: Writable): Console {
  return {
    info(...args: string[]): void {
      stdout.write(args.join(" ") + EOL);
    },
    warn(...args: string[]): void {
      stderr.write(args.join(" ") + EOL);
    },
    error(...args: string[]): void {
      stderr.write(args.join(" ") + EOL);
    },
  };
}

export function makeLogger(
  logLevel: LogLevel,
  stdout: Writable,
  stderr: Writable
): Logger {
  return makeLoggerInternal(logLevel, { console: makeConsole(stdout, stderr) });
}

export async function computeHash(
  cwd: string,
  logger: Logger,
  hashSalt?: string,
  config?: Pick<Config, "packageRoot">
): Promise<string> {
  if (!config) {
    config = createConfig(logger, cwd);
  }
  const { packageRoot } = config;
  const hasher = new Hasher({ packageRoot }, logger);

  const hash = await hasher.createPackageHash(hashSalt || "");
  return hash;
}

export async function computeHashOfOutput(
  cwd: string,
  logger: Logger,
  config?: Pick<Config, "packageRoot">
): Promise<string> {
  if (!config) {
    config = createConfig(logger, cwd);
  }
  const { packageRoot } = config;
  const hasher = new Hasher({ packageRoot }, logger);
  const hash = await hasher.hashOfOutput();
  return hash;
}

export async function fetch(
  cwd: string,
  hash: string,
  logger: Logger,
  config?: Pick<
    Config,
    "cacheStorageConfig" | "internalCacheFolder" | "incrementalCaching"
  >
): Promise<boolean> {
  if (!config) {
    config = createConfig(logger, cwd);
  }
  const { cacheStorageConfig, internalCacheFolder, incrementalCaching } =
    config;
  const cacheStorage = getCacheStorageProvider(
    cacheStorageConfig,
    internalCacheFolder,
    logger,
    cwd,
    incrementalCaching
  );
  const fetch = await cacheStorage.fetch(hash);
  return fetch;
}

export async function put(
  cwd: string,
  hash: string,
  logger: Logger,
  config?: Pick<
    Config,
    | "cacheStorageConfig"
    | "internalCacheFolder"
    | "outputGlob"
    | "incrementalCaching"
  >
): Promise<void> {
  if (!config) {
    config = createConfig(logger, cwd);
  }
  const {
    cacheStorageConfig,
    internalCacheFolder,
    outputGlob,
    incrementalCaching,
  } = config;
  const cacheStorage = getCacheStorageProvider(
    cacheStorageConfig,
    internalCacheFolder,
    logger,
    cwd,
    incrementalCaching
  );
  await cacheStorage.put(hash, outputGlob);
}
