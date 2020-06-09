import { Writable } from "stream";
import { EOL } from "os";

import { createConfig, Config } from "backfill-config";
import {
  Logger,
  makeLogger as makeLoggerInternal,
  Console,
  LogLevel
} from "backfill-logger";
import { Hasher } from "backfill-hasher";
import { getCacheStorageProvider } from "backfill-cache";

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
    }
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
  config?: Pick<Config, "cacheStorageConfig" | "internalCacheFolder">
): Promise<boolean> {
  if (!config) {
    config = createConfig(logger, cwd);
  }
  const { cacheStorageConfig, internalCacheFolder } = config;
  const cacheStorage = getCacheStorageProvider(
    cacheStorageConfig,
    internalCacheFolder,
    logger,
    cwd
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
    "cacheStorageConfig" | "internalCacheFolder" | "outputGlob"
  >
): Promise<void> {
  if (!config) {
    config = createConfig(logger, cwd);
  }
  const { cacheStorageConfig, internalCacheFolder, outputGlob } = config;
  const cacheStorage = getCacheStorageProvider(
    cacheStorageConfig,
    internalCacheFolder,
    logger,
    cwd
  );
  await cacheStorage.put(hash, outputGlob);
}
